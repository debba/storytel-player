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

interface StorytelAuthError extends Error {
  isStorytelUnauthorized: boolean;
  storytelStatus?: number;
  storytelData?: unknown;
  isLoginFailure?: boolean;
}

export interface SsoSession {
  storytelSession: string;
  firebaseRefreshToken: string;
  firebaseApiKey: string;
  email: string;
  cid: string;
}

const FIREBASE_TOKEN_URL = "https://securetoken.googleapis.com";
const FIREBASE_REFERER = "https://www.storytel.com/";
const FIREBASE_ID_TOKEN_TTL_BUFFER_SECONDS = 60;

// --- Bookshelf ---------------------------------------------------------------

// Raw shape returned by POST https://api.storytel.net/libraries/bookshelf
interface RawBookshelfNamedEntity {
  id: string;
  name: string;
  deepLink?: string;
}

interface RawBookshelfFormat {
  id: string;
  type: "abook" | "ebook";
  durationInMilliseconds?: number;
  durationInCharacters?: number;
  cover?: { url: string; width: number; height: number };
  position?: { position: number; updatedTime: string; kidsMode: boolean };
}

interface RawBookshelfModel {
  id: string;
  title: string;
  state: "CONSUMING" | "CONSUMED" | "WILL_CONSUME" | string;
  kidsBook?: boolean;
  authors?: RawBookshelfNamedEntity[];
  narrators?: RawBookshelfNamedEntity[];
  formats?: RawBookshelfFormat[];
  category?: { id: number; name: string };
}

interface RawBookshelfResponse {
  items?: Record<string, { action: string; model: RawBookshelfModel }>;
  followingItems?: Record<string, unknown>;
  collections?: Record<string, unknown>;
}

// Subset of the legacy BookShelfEntity (client/src/interfaces/books.ts) that
// the frontend actually reads. Keep the keys aligned with that interface so
// the React app keeps working unchanged.
interface BookShelfEntity {
  id: string;
  status: number;
  book: {
    name: string;
    authorsAsString: string;
    consumableId: string;
    largeCover: string;
    largeCoverE: string;
    category: { title: string };
    language: { localizedName: string };
  };
  abook: {
    id: string;
    narratorAsString: string;
    time: number;
    description: string;
  } | null;
  abookMark: { pos: number } | null;
  ebook: RawBookshelfFormat | null;
}

interface BookShelfResponse {
  books: BookShelfEntity[];
}

class StorytelClient {
  private client: AxiosInstance;
  public loginData: LoginData;
  private ssoSession: SsoSession | null = null;
  private cachedFirebaseIdToken: { token: string; expiresAt: number } | null =
    null;

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
        const isLoginRequest = url.includes("login.action");
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
          const authError: StorytelAuthError = new Error(
            isLoginRequest
              ? "Storytel login rejected"
              : "Storytel session expired",
          ) as StorytelAuthError;
          authError.isStorytelUnauthorized = true;
          authError.isLoginFailure = isLoginRequest;
          authError.storytelStatus = error.response.status;
          authError.storytelData = error.response.data;
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
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const encryptedPassword = encryptPassword(trimmedPassword);
    const url = "https://www.storytel.com/api/login.action";
    const params = {
      m: 1,
      uid: trimmedEmail,
      pwd: encryptedPassword,
    };

    try {
      const response = await this.client.get<LoginData>(url, {
        params,
      });
      this.loginData = response.data;
      this.ssoSession = null;
      this.cachedFirebaseIdToken = null;
      return this.loginData;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) {
        throw error;
      }
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  loginViaSso(session: SsoSession): void {
    this.ssoSession = session;
    this.cachedFirebaseIdToken = null;
    // Mark legacy credentials as unset so any accidental fallback path errors
    // visibly instead of using stale data.
    this.loginData = {
      accountInfo: { jwt: "", singleSignToken: "" },
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
      throw new Error("ensureFirebaseIdToken called outside SSO mode");
    }
    const now = Math.floor(Date.now() / 1000);
    const cached = this.cachedFirebaseIdToken;
    if (
      cached &&
      cached.expiresAt - FIREBASE_ID_TOKEN_TTL_BUFFER_SECONDS > now
    ) {
      return cached.token;
    }
    const params = new URLSearchParams();
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", this.ssoSession.firebaseRefreshToken);
    try {
      const response = await axios.post<{
        id_token?: string;
        access_token?: string;
        expires_in: string;
        refresh_token?: string;
      }>(
        `${FIREBASE_TOKEN_URL}/v1/token?key=${this.ssoSession.firebaseApiKey}`,
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: FIREBASE_REFERER,
            Origin: "https://www.storytel.com",
          },
          timeout: 15000,
        },
      );
      const accessToken = response.data.id_token ?? response.data.access_token;
      if (!accessToken) {
        throw new Error("Firebase token response did not include an ID token");
      }
      const expiresIn = parseInt(response.data.expires_in, 10) || 3600;
      this.cachedFirebaseIdToken = {
        token: accessToken,
        expiresAt: now + expiresIn,
      };
      return accessToken;
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 400 || status === 401 || status === 403) {
        const authError: any = new Error("Firebase refresh token rejected");
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

  async getBookshelf(): Promise<BookShelfResponse> {
    const url = `https://api.storytel.net/libraries/bookshelf`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.post<RawBookshelfResponse>(
        url,
        { items: [] },
        {
          headers: {
            Authorization: `Bearer ${bearer}`,
            "content-type": "application/x-www-form-urlencoded",
            Accept: "*/*",
          },
        },
      );

      // The endpoint returns { items: { "<id>": { action, model } } } with a
      // shape that differs from the legacy getBookShelf.action response. Remap
      // each `model` onto the legacy BookShelfEntity keys so the existing
      // frontend keeps working unchanged.
      const items = response.data?.items;
      if (!items || typeof items !== "object") return { books: [] };

      // Library state -> legacy numeric status (1 = not started, 2 = in progress,
      // 3 = finished). Dashboard filters use {1,2,3}.
      const stateToStatus: Record<string, number> = {
        WILL_CONSUME: 1,
        CONSUMING: 2,
        CONSUMED: 3,
      };

      const books = Object.values(items)
        .map((entry) => entry?.model)
        .filter(Boolean)
        .map((model): BookShelfEntity => {
          const formats: RawBookshelfFormat[] = Array.isArray(model.formats)
            ? model.formats
            : [];
          const abookFormat = formats.find((f) => f.type === "abook");
          const ebookFormat = formats.find((f) => f.type === "ebook");
          const coverUrl =
            abookFormat?.cover?.url ?? ebookFormat?.cover?.url ?? "";
          const join = (arr?: RawBookshelfNamedEntity[]) =>
            (Array.isArray(arr) ? arr : [])
              .map((x) => x?.name)
              .filter(Boolean)
              .join(", ");

          return {
            id: model.id,
            status: stateToStatus[model.state] ?? 1,
            stateUpdateTime: model.stateUpdateTime,
            positionUpdatedTime: abookFormat?.position?.updatedTime,
            book: {
              name: model.title,
              authorsAsString: join(model.authors),
              consumableId: String(model.id),
              // Full absolute URL (covers.storytel.com). See note below.
              largeCover: coverUrl,
              largeCoverE: "",
              category: { title: model.category?.name ?? "" },
              language: { localizedName: "" },
            },
            abook: abookFormat
              ? {
                  id: abookFormat.id,
                  narratorAsString: join(model.narrators),
                  // Legacy frontend expects microseconds; API gives ms.
                  time: (abookFormat.durationInMilliseconds ?? 0) * 1000,
                  description: "",
                }
              : null,
            abookMark: abookFormat?.position
              ? { pos: (abookFormat.position.position ?? 0) * 1000 }
              : null,
            ebook: ebookFormat ?? null,
          };
        });

      return { books };
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      console.error(error);
      throw new Error(`Failed to get bookshelf: ${error.message}`);
    }
  }

  async getBookDetails(consumableId: string): Promise<any> {
    const url = `https://api.storytel.net/book-details/consumables/${consumableId}?kidsMode=false&configVariant=default`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.get(url, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: "*/*",
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to get book details: ${error.message}`);
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

  // New api.storytel.net audio endpoint. Returns a 302 redirect to a signed
  // mp3 URL on the CDN. Keyed by consumableId (not the abook/program id).
  async getAudioStreamUrl(consumableId: string): Promise<string> {
    const url = `https://api.storytel.net/assets/v2/consumables/${consumableId}/abook`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.get(url, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: "*/*",
        },
      });
      // maxRedirects is 0 on the client, so a 2xx here is unexpected; prefer
      // the redirect Location captured below in the catch.
      return (
        (response.request as any)?.res?.responseUrl ||
        response.headers.location
      );
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      const location = error.response?.headers?.location;
      if (location) return location;
      throw new Error(`Failed to get audio stream URL: ${error.message}`);
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
