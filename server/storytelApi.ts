import axios, { AxiosInstance } from "axios";
import { encryptPassword } from "./passwordCrypt";
import { appLogger } from "./logger";

interface AccountInfo {
  jwt: string;
  singleSignToken: string;
}

interface LoginData {
  accountInfo: AccountInfo;
}

interface Bookmark {
  id: string;
  position: number;
  note?: string;
}

interface BookmarkResponse {
  bookmarks: Bookmark[];
}

export interface SsoSession {
  storytelSession: string;
  firebaseRefreshToken: string;
  firebaseApiKey: string;
  email: string;
  cid: string;
}

const FIREBASE_TOKEN_URL = 'https://securetoken.googleapis.com';
// The Storytel Firebase API key is browser-restricted: requests without a
// matching Referer get 403 API_KEY_HTTP_REFERRER_BLOCKED. The Web SDK runs
// on www.storytel.com, so we mimic that origin from the server.
const FIREBASE_REFERER = 'https://www.storytel.com/';
const FIREBASE_ID_TOKEN_TTL_BUFFER_SECONDS = 60;

class StorytelClient {
  private client: AxiosInstance;
  public loginData: LoginData;
  private ssoSession: SsoSession | null = null;
  private cachedFirebaseIdToken: { token: string; expiresAt: number } | null = null;

  constructor() {
    this.client = axios.create({
      headers: {
        "x-storytel-terminal": "ios",
        "user-agent": "Storytel/25.38.0 (iOS 26.0; iPhone16,2) Release/924.1",
      },
      maxRedirects: 0,
      validateStatus: function (status) {
        return status < 400;
      },
      timeout: 30000,
      params: {
        version: "25.38.0",
      },
    });

    this.client.interceptors.request.use((request) => {
      const url = request.url || "";
      // Hide sensitive query params like password
      let cleanUrl = url;
      if (cleanUrl.includes("login.action")) {
        cleanUrl = cleanUrl.replace(/pwd=[^&]+/, "pwd=***");
      }
      appLogger.add({
        type: "http_request",
        message: `[${request.method?.toUpperCase()}] ${cleanUrl}`,
        method: request.method?.toUpperCase(),
        url: cleanUrl,
        data: request.data,
      });
      return request;
    });

    this.client.interceptors.response.use(
      (response) => {
        const url = response.config.url || "";
        let cleanUrl = url;
        if (cleanUrl.includes("login.action")) {
          cleanUrl = cleanUrl.replace(/pwd=[^&]+/, "pwd=***");
        }
        appLogger.add({
          type: "http_response",
          message: `[${response.status}] ${cleanUrl}`,
          status: response.status,
          method: response.config.method?.toUpperCase(),
          url: cleanUrl,
          data: response.data,
        });
        return response;
      },
      (error) => {
        const url = error.config?.url || "";
        let cleanUrl = url;
        if (cleanUrl.includes("login.action")) {
          cleanUrl = cleanUrl.replace(/pwd=[^&]+/, "pwd=***");
        }
        appLogger.add({
          type: "error",
          message: `[Error ${error.response?.status || "N/A"}] ${cleanUrl}`,
          status: error.response?.status,
          method: error.config?.method?.toUpperCase(),
          url: cleanUrl,
          data: error.response?.data || error.message,
        });
        // Propagate Storytel 401 as a distinct error type so Fastify routes
        // can return 401 to the frontend instead of a generic 500.
        if (error.response?.status === 401) {
          const authError: any = new Error("Storytel session expired");
          authError.isStorytelUnauthorized = true;
          return Promise.reject(authError);
        }
        return Promise.reject(error);
      },
    );

    this.loginData = {
      accountInfo: {
        jwt: "",
        singleSignToken: "",
      },
    };
  }

  async login(email: string, password: string): Promise<LoginData> {
    const encryptedPassword = encryptPassword(password.trim());
    const url = `https://www.storytel.com/api/login.action?m=1&uid=${email.trim()}&pwd=${encryptedPassword}`;

    try {
      const response = await this.client.get<LoginData>(url);
      this.loginData = response.data;
      this.ssoSession = null;
      this.cachedFirebaseIdToken = null;
      return this.loginData;
    } catch (error: any) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  loginViaSso(session: SsoSession): void {
    this.ssoSession = session;
    this.cachedFirebaseIdToken = null;
    // Mark legacy credentials as unset so any accidental fallback path errors
    // visibly instead of using stale data.
    this.loginData = {
      accountInfo: { jwt: '', singleSignToken: '' },
    };
  }

  getSsoSession(): SsoSession | null {
    return this.ssoSession;
  }

  // Token to send as ?token=... on the legacy *.action endpoints. In SSO mode
  // we substitute the Firebase Session Cookie, which the Storytel API treats
  // interchangeably with the singleSignToken returned by login.action.
  private getLegacyActionToken(): string {
    if (this.ssoSession) return this.ssoSession.storytelSession;
    return this.loginData.accountInfo.singleSignToken;
  }

  private async ensureFirebaseIdToken(): Promise<string> {
    if (!this.ssoSession) {
      throw new Error('ensureFirebaseIdToken called outside SSO mode');
    }
    const now = Math.floor(Date.now() / 1000);
    const cached = this.cachedFirebaseIdToken;
    if (cached && cached.expiresAt - FIREBASE_ID_TOKEN_TTL_BUFFER_SECONDS > now) {
      return cached.token;
    }
    const params = new URLSearchParams();
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', this.ssoSession.firebaseRefreshToken);
    try {
      const response = await axios.post<{
        access_token: string;
        expires_in: string;
        refresh_token?: string;
      }>(
        `${FIREBASE_TOKEN_URL}/v1/token?key=${this.ssoSession.firebaseApiKey}`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: FIREBASE_REFERER,
            Origin: 'https://www.storytel.com',
          },
          timeout: 15000,
        }
      );
      const accessToken = response.data.access_token;
      const expiresIn = parseInt(response.data.expires_in, 10) || 3600;
      this.cachedFirebaseIdToken = {
        token: accessToken,
        expiresAt: now + expiresIn,
      };
      return accessToken;
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 400 || status === 401 || status === 403) {
        const authError: any = new Error('Firebase refresh token rejected');
        authError.isStorytelUnauthorized = true;
        throw authError;
      }
      throw new Error(`Firebase token refresh failed: ${error.message}`);
    }
  }

  // Bearer to send on api.storytel.net/* endpoints. SSO mode: fresh Firebase
  // ID token (auto-refreshed via the long-lived refresh token). Legacy mode:
  // the JWT returned by login.action.
  private async getApiBearer(): Promise<string> {
    if (this.ssoSession) return this.ensureFirebaseIdToken();
    return this.loginData.accountInfo.jwt;
  }

  async getBookmarkPositional(
    consumableId: string | null = null,
  ): Promise<Bookmark[]> {
    const url = `https://api.storytel.net/bookmarks/positional?kidsMode=false&orderBy=updated&orderDirection=desc`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.get<{ bookmarks: Bookmark[] }>(url, {
        params: {
          ...(consumableId && { consumableIds: consumableId }),
        },
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      });
      return response.data.bookmarks;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to get bookmark positional: ${error.message}`);
    }
  }

  async updateBookmarkPositional(
    consumableId: string,
    position: number,
    deviceId: string,
  ): Promise<any> {
    const url = `https://api.storytel.net/bookmarks/positional`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.post(
        url,
        {
          deviceId: deviceId,
          action: "player_paused",
          secondsSinceCreated: 0,
          position,
          type: "abook",
          kidsMode: false,
          consumableId: consumableId,
        },
        {
          headers: {
            Authorization: `Bearer ${bearer}`,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to get bookmark positional: ${error.message}`);
    }
  }

  async getBookshelf(): Promise<any> {
    const url = `https://www.storytel.com/api/getBookShelf.action?token=${encodeURIComponent(this.getLegacyActionToken())}`;

    try {
      const response = await this.client.get(url);
      return {
        ...response.data,
        books: response.data.books.filter(
          (book: { status: number }) => book.status === 2 || book.status === 1,
        ),
      };
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      console.error(error);
      throw new Error(`Failed to get bookshelf: ${error.message}`);
    }
  }

  async getPlayBookMetaData(consumableId: string): Promise<any> {
    const url = `https://api.storytel.net/playback-metadata/consumable/${consumableId}`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.get(url, {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to get bookinfo: ${error.message}`);
    }
  }

  async getStreamUrl(bookId: string): Promise<string> {
    const url = `https://www.storytel.com/mp3streamRangeReq?startposition=0&programId=${bookId}&token=${encodeURIComponent(this.getLegacyActionToken())}`;

    try {
      const response = await this.client.get(url);
      return (
        (response.request as any).res.responseUrl || response.headers.location
      );
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      if (error.response && error.response.headers.location) {
        return error.response.headers.location;
      }
      throw new Error(`Failed to get stream URL: ${error.message}`);
    }
  }

  async getBookmark(consumableId: string): Promise<BookmarkResponse> {
    const url = `https://api.storytel.net/bookmarks/manual?type=abook&consumableId=${consumableId}`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.get<BookmarkResponse>(url, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: "application/vnd.storytel.bookmark+json;v=2.0",
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to get bookmark: ${error.message}`);
    }
  }

  async setBookmark(
    consumableId: string,
    position: number,
    note: string,
  ): Promise<void> {
    const url = "https://api.storytel.net/bookmarks/manual";
    try {
      const bearer = await this.getApiBearer();
      await this.client.post(
        url,
        {
          position,
          consumableId,
          note,
          type: "abook",
        },
        {
          headers: {
            Authorization: `Bearer ${bearer}`,
            Accept: "application/vnd.storytel.bookmark+json;v=2.0",
          },
        },
      );
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to set bookmark: ${error.message}`);
    }
  }

  async updateBookmark(
    consumableId: string,
    bookmarkId: string,
    bookmarkData: any,
  ): Promise<void> {
    const { bookmarks } = await this.getBookmark(consumableId);

    if (
      !bookmarks ||
      !bookmarks.some((bookmark) => bookmark.id === bookmarkId)
    ) {
      throw new Error(`Failed to remove bookmark: bookmark does not exists!`);
    }

    const url = `https://api.storytel.net/bookmarks/manual/${bookmarkId}?id=${bookmarkId}`;
    try {
      const bearer = await this.getApiBearer();
      await this.client.put(url, bookmarkData, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: "application/vnd.storytel.bookmark+json;v=2.0",
        },
      });
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to update bookmark: ${error.message}`);
    }
  }

  async deleteBookmark(
    consumableId: string,
    bookmarkId: string,
  ): Promise<void> {
    const { bookmarks } = await this.getBookmark(consumableId);

    if (
      !bookmarks ||
      !bookmarks.some((bookmark) => bookmark.id === bookmarkId)
    ) {
      throw new Error(`Failed to remove bookmark: bookmark does not exists!`);
    }

    const url = `https://api.storytel.net/bookmarks/manual/${bookmarkId}?id=${bookmarkId}`;
    try {
      const bearer = await this.getApiBearer();
      await this.client.delete(url, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: "application/vnd.storytel.bookmark+json;v=2.0",
        },
      });
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to delete bookmark: ${error.message}`);
    }
  }
}

export default StorytelClient;
