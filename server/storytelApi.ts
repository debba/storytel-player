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

export interface SearchResultBook {
  id: string;
  title: string;
  authors: string;
  narrators: string;
  coverUrl: string;
  category: string;
  durationMs: number;
  description?: string;
  hasAbook: boolean;
  hasEbook: boolean;
  language?: string;
  languageName?: string;
}

const FIREBASE_TOKEN_URL = "https://securetoken.googleapis.com";
const FIREBASE_REFERER = "https://www.storytel.com/";
const FIREBASE_ID_TOKEN_TTL_BUFFER_SECONDS = 60;

// Base URL of the public web search endpoint, per market country. Storytel's own
// site is scoped by `/{country}/{lang}/`, where only the country segment decides
// which catalog answers - except Denmark, which Storytel runs under the Mofibo
// brand on its own host, and which does need the matching language segment.
const WEB_SEARCH_BASE_URLS: Record<string, string> = {
  dk: "https://mofibo.com/dk/da",
};

const webSearchBaseUrl = (country: string): string =>
  WEB_SEARCH_BASE_URLS[country] ??
  `https://www.storytel.com/${country}/${country}`;

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
  stateUpdateTime?: string;
  kidsBook?: boolean;
  authors?: RawBookshelfNamedEntity[];
  narrators?: RawBookshelfNamedEntity[];
  formats?: RawBookshelfFormat[];
  category?: { id: number; name: string };
}

interface RawBookshelfResponse {
  // Opaque sync cursor. Echoed back on writes so the server can apply the
  // delta against the state the client last saw.
  resourceVersion?: string;
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
  // Used by the frontend to sort the library by most recent activity.
  stateUpdateTime?: string;
  positionUpdatedTime?: string;
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

  private static firebaseTokenCache = new Map<
    string,
    { token: string; expiresAt: number }
  >();
  private static legacyLoginCache = new Map<
    string,
    { jwt: string; singleSignToken: string; expiresAt: number }
  >();

  private savedEmail?: string;
  private savedEncryptedPassword?: string;

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
      async (error) => {
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

        // If 401 occurs on an authenticated request and we have not retried yet:
        // Automatically refresh tokens and retry the request transparently.
        if (
          error.response?.status === 401 &&
          !isLoginRequest &&
          error.config &&
          !error.config._isRetry
        ) {
          error.config._isRetry = true;
          try {
            if (this.ssoSession) {
              const cacheKey = `${this.ssoSession.firebaseApiKey}:${this.ssoSession.firebaseRefreshToken}`;
              StorytelClient.firebaseTokenCache.delete(cacheKey);
              const freshBearer = await this.ensureFirebaseIdToken();
              error.config.headers = error.config.headers || {};
              error.config.headers.Authorization = `Bearer ${freshBearer}`;
              return await this.client.request(error.config);
            } else if (this.savedEmail && this.savedEncryptedPassword) {
              const cacheKey = `${this.savedEmail}:${this.savedEncryptedPassword}`;
              StorytelClient.legacyLoginCache.delete(cacheKey);
              await this.refreshLegacyLogin();
              const freshBearer = this.loginData.accountInfo.jwt;
              error.config.headers = error.config.headers || {};
              error.config.headers.Authorization = `Bearer ${freshBearer}`;
              return await this.client.request(error.config);
            }
          } catch {
            // Ignore retry error and fall through to propagate 401
          }
        }

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

  setCredentials(email: string, encryptedPassword: string): void {
    this.savedEmail = email.trim();
    this.savedEncryptedPassword = encryptedPassword.trim();
  }

  async refreshLegacyLogin(): Promise<void> {
    if (!this.savedEmail || !this.savedEncryptedPassword) {
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const cacheKey = `${this.savedEmail}:${this.savedEncryptedPassword}`;
    const cached = StorytelClient.legacyLoginCache.get(cacheKey);
    if (cached && cached.expiresAt - 60 > now) {
      this.loginData.accountInfo.jwt = cached.jwt;
      this.loginData.accountInfo.singleSignToken = cached.singleSignToken;
      return;
    }

    const url = "https://www.storytel.com/api/login.action";
    const params = {
      m: 1,
      uid: this.savedEmail,
      pwd: this.savedEncryptedPassword,
    };

    const response = await this.client.get<LoginData>(url, { params });
    if (response.data?.accountInfo?.jwt) {
      this.loginData = response.data;
      let expiresIn = 1800; // default 30 min
      try {
        const parts = response.data.accountInfo.jwt.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf-8"),
          );
          if (payload.exp && payload.iat) {
            expiresIn = Math.max(300, payload.exp - payload.iat);
          }
        }
      } catch {
        // ignore
      }
      StorytelClient.legacyLoginCache.set(cacheKey, {
        jwt: response.data.accountInfo.jwt,
        singleSignToken: response.data.accountInfo.singleSignToken,
        expiresAt: now + expiresIn,
      });
    }
  }

  async login(email: string, password: string): Promise<LoginData> {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const encryptedPassword = encryptPassword(trimmedPassword);
    this.setCredentials(trimmedEmail, encryptedPassword);
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

      const now = Math.floor(Date.now() / 1000);
      const cacheKey = `${trimmedEmail}:${encryptedPassword}`;
      let expiresIn = 1800;
      try {
        const parts = response.data.accountInfo.jwt.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf-8"),
          );
          if (payload.exp && payload.iat) {
            expiresIn = Math.max(300, payload.exp - payload.iat);
          }
        }
      } catch {
        // ignore
      }
      StorytelClient.legacyLoginCache.set(cacheKey, {
        jwt: response.data.accountInfo.jwt,
        singleSignToken: response.data.accountInfo.singleSignToken,
        expiresAt: now + expiresIn,
      });

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
    const cacheKey = `${this.ssoSession.firebaseApiKey}:${this.ssoSession.firebaseRefreshToken}`;
    const cached = StorytelClient.firebaseTokenCache.get(cacheKey);
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
      StorytelClient.firebaseTokenCache.set(cacheKey, {
        token: accessToken,
        expiresAt: now + expiresIn,
      });
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
  // the JWT returned by login.action with automatic renewal.
  private async getApiBearer(): Promise<string> {
    if (this.ssoSession) return this.ensureFirebaseIdToken();

    const jwt = this.loginData.accountInfo.jwt;
    if (jwt) {
      try {
        const parts = jwt.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf-8"),
          );
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp - 60 <= now) {
            if (this.savedEmail && this.savedEncryptedPassword) {
              await this.refreshLegacyLogin();
              return this.loginData.accountInfo.jwt;
            }
          }
        }
      } catch {
        // ignore
      }
      return jwt;
    }

    if (this.savedEmail && this.savedEncryptedPassword) {
      await this.refreshLegacyLogin();
      return this.loginData.accountInfo.jwt;
    }

    return "";
  }

  // Market country ISO code (e.g. "it", "se", "fi") carried by a Storytel JWT:
  // `store` is shaped like "STHP-IT", with `country`/`countryCode` as fallbacks.
  private countryFromJwt(token?: string | null): string | undefined {
    if (!token) return undefined;
    try {
      const parts = token.split(".");
      if (parts.length < 2) return undefined;
      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
      const payload = JSON.parse(payloadJson);
      if (typeof payload.store === "string") {
        const storeParts = payload.store.split("-");
        const code = storeParts[storeParts.length - 1]?.trim().toLowerCase();
        if (code && /^[a-z]{2}$/.test(code)) {
          return code;
        }
      }
      for (const claim of [payload.country, payload.countryCode]) {
        if (typeof claim === "string" && /^[a-z]{2}$/i.test(claim.trim())) {
          return claim.trim().toLowerCase();
        }
      }
    } catch {
      // ignore parsing failures
    }
    return undefined;
  }

  // Derive the account's market country from whichever token carries the claim.
  // Legacy logins put it on the login.action JWT; SSO logins send a Firebase ID
  // token as the bearer, which need not carry it at all, so the Firebase session
  // cookie is tried as well. Returns undefined when no token names a market.
  private async getMarketCountryCode(): Promise<string | undefined> {
    const candidates: (string | null | undefined)[] = [];
    try {
      candidates.push(await this.getApiBearer());
    } catch (error: any) {
      // A failing token refresh must not break search
      console.warn(
        "[storytelApi] could not read api bearer for market lookup:",
        error.message,
      );
    }
    candidates.push(this.loginData.accountInfo.jwt);
    candidates.push(this.ssoSession?.storytelSession);

    for (const token of candidates) {
      const code = this.countryFromJwt(token);
      if (code) return code;
    }
    return undefined;
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

  // /libraries/bookshelf is a delta-sync endpoint: the body carries the client's
  // local changes, the response carries the resulting state plus a
  // `resourceVersion` cursor.
  //
  // Its schema is known from the server's own validation error:
  //   expected=map[string]models.ConsumableActionRequest, field=items
  // so `items` is a map keyed by consumable id. An array body is rejected 400.
  private static readonly BOOKSHELF_URL =
    "https://api.storytel.net/libraries/bookshelf";

  // Read the whole bookshelf. Sends an empty body, which the endpoint reads as
  // "no local state, send me everything". Do not "fix" this into a JSON body
  // such as {"items": []} — that is the 400 above.
  private async fetchBookshelfSnapshot(): Promise<RawBookshelfResponse> {
    const bearer = await this.getApiBearer();
    const response = await this.client.post<RawBookshelfResponse>(
      StorytelClient.BOOKSHELF_URL,
      "",
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
          "content-type": "application/x-www-form-urlencoded",
          Accept: "*/*",
        },
      },
    );
    return response.data;
  }

  // Push local changes. Must be real JSON: axios form-encodes plain objects
  // when the request declares x-www-form-urlencoded, and the API discards such
  // a body without ever failing the request.
  private async postBookshelfDelta(
    body: Record<string, unknown>,
  ): Promise<RawBookshelfResponse> {
    const bearer = await this.getApiBearer();
    const response = await this.client.post<RawBookshelfResponse>(
      StorytelClient.BOOKSHELF_URL,
      body,
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
          "content-type": "application/json",
          Accept: "*/*",
        },
      },
    );
    return response.data;
  }

  async getBookshelf(): Promise<BookShelfResponse> {
    try {
      const data = await this.fetchBookshelfSnapshot();

      // The endpoint returns { items: { "<id>": { action, model } } } with a
      // shape that differs from the legacy getBookShelf.action response. Remap
      // each `model` onto the legacy BookShelfEntity keys so the existing
      // frontend keeps working unchanged.
      const items = data?.items;
      if (!items || typeof items !== "object") return { books: [] };

      // Library state -> legacy numeric status (1 = not started, 2 = in progress,
      // 3 = finished). Dashboard filters use {1,2,3}.
      const stateToStatus: Record<string, number> = {
        WILL_CONSUME: 1,
        CONSUMING: 2,
        CONSUMED: 3,
        FINISHED: 3,
        COMPLETED: 3,
        READING: 2,
        TO_READ: 1,
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

          const normalizedState = (model.state || "").toUpperCase();
          let calculatedStatus = stateToStatus[normalizedState];
          if (!calculatedStatus) {
            if (abookFormat?.position?.position && abookFormat.position.position > 0) {
              calculatedStatus = 2;
            } else {
              calculatedStatus = 1;
            }
          }

          return {
            id: model.id,
            status: calculatedStatus,
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

  private extractLanguageInfo(
    model: any,
    raw?: any,
    item?: any
  ): { language?: string; languageName?: string } {
    const formats = Array.isArray(model?.formats)
      ? model.formats
      : Array.isArray(raw?.formats)
      ? raw.formats
      : [];

    const formatLang = formats.find((f: any) => f?.language)?.language;

    const langObj =
      model?.language ||
      (Array.isArray(model?.languages) && model.languages[0]) ||
      formatLang ||
      raw?.language ||
      (Array.isArray(raw?.languages) && raw.languages[0]) ||
      item?.language ||
      item?.book?.language;

    if (typeof langObj === "string") {
      const clean = langObj.toLowerCase().trim();
      return { language: clean };
    }
    if (langObj && typeof langObj === "object") {
      const iso = (
        langObj.isoValue ||
        langObj.iso ||
        langObj.code ||
        langObj.id ||
        ""
      )
        .toString()
        .toLowerCase()
        .trim();
      const name =
        langObj.localizedName || langObj.name || langObj.title || undefined;
      return {
        language: iso || undefined,
        languageName: name,
      };
    }
    return {};
  }

  async searchCatalog(query: string): Promise<SearchResultBook[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const results: SearchResultBook[] = [];
    const seenIds = new Set<string>();

    // 1. Try authenticated api.storytel.net search endpoints first
    // This correctly scopes search results to the logged-in user's country/market
    // and returns all available languages in their catalog (e.g. fi + sv + en).
    try {
      const bearer = await this.getApiBearer();
      const headers = {
        Authorization: `Bearer ${bearer}`,
        Accept: "*/*",
      };

      const endpoints = [
        `https://api.storytel.net/search/v2?query=${encodeURIComponent(trimmed)}&configVariant=default`,
        `https://api.storytel.net/search/page?query=${encodeURIComponent(trimmed)}&kidsMode=false`,
        `https://api.storytel.net/search?query=${encodeURIComponent(trimmed)}&kidsMode=false`,
      ];

      for (const url of endpoints) {
        try {
          const response = await this.client.get(url, { headers });
          const rawItems = Array.isArray(response.data?.items)
            ? response.data.items
            : Array.isArray(response.data?.results)
            ? response.data.results
            : [];

          for (const raw of rawItems) {
            const model = raw.model || raw.item || raw.book || raw;
            const id = String(model.id || model.consumableId || raw.id || raw.consumableId || "");
            const title = model.title || model.name || raw.title || raw.name || "";
            if (!id || !title || seenIds.has(id)) continue;

            const formats: any[] = Array.isArray(model.formats) ? model.formats : [];
            const abook = formats.find((f: any) => f.type === "abook");
            const ebook = formats.find((f: any) => f.type === "ebook");

            // Exclude ebook-only items since this application is an audiobook player
            if (!abook) continue;

            seenIds.add(id);

            const coverUrl = abook?.cover?.url || ebook?.cover?.url || model.cover?.url || "";
            const { language, languageName } = this.extractLanguageInfo(model, raw);

            results.push({
              id,
              title,
              authors: Array.isArray(model.authors) ? model.authors.map((a: any) => a?.name || a).join(", ") : "",
              narrators: Array.isArray(model.narrators) ? model.narrators.map((n: any) => n?.name || n).join(", ") : "",
              coverUrl,
              category: model.category?.name || model.category?.title || "",
              durationMs: abook?.durationInMilliseconds || 0,
              description: model.description || "",
              hasAbook: !!abook,
              hasEbook: !!ebook,
              language,
              languageName,
            });
          }

          if (results.length > 0) return results;
        } catch {
          // Try next api.storytel.net endpoint
        }
      }
    } catch (err) {
      console.warn("[storytelApi] api.storytel.net search failed, trying fallback:", err);
    }

    // 2. Fallback to storytel.com web search API if authenticated search returned 0 results.
    // The endpoint is scoped by URL path (`/{country}/{lang}/api/search.action`, where only
    // the country segment decides the catalog) and answers for the Swedish market when the
    // prefix is missing. Without a known market it is skipped entirely: hits from a foreign
    // catalog cannot be added to this account's bookshelf anyway.
    const country = await this.getMarketCountryCode();
    if (!country) {
      console.warn(
        "[storytelApi] market country unknown, skipping storytel.com fallback search",
      );
      return results;
    }

    try {
      const searchActionUrl = `${webSearchBaseUrl(country)}/api/search.action?q=${encodeURIComponent(trimmed)}`;
      const response = await this.client.get(searchActionUrl, {
        headers: {
          Accept: "application/json, text/plain, */*",
        },
        // Redirects stay disabled (see the client config): markets whose public
        // search is gated behind sign-in (us, gb) answer 3xx towards an OAuth page,
        // and following that would only download HTML that is discarded below.
      });

      const data = response.data;
      if (data && Array.isArray(data.books)) {
        for (const item of data.books) {
          const book = item?.book || {};
          const abook = item?.abook || {};
          const ebook = item?.ebook || {};

          const hasAbook = !!abook.id || !!item.abook;
          // Exclude ebook-only items since this application is an audiobook player
          if (!hasAbook) continue;

          const id = String(book.consumableId || book.id || abook.id || item.id || "");
          const title = book.name || book.title || "";
          if (!id || !title || seenIds.has(id)) continue;
          seenIds.add(id);

          const coverUrl =
            book.largeCover ||
            book.largeCoverE ||
            book.cover ||
            book.coverE ||
            book.smallCover ||
            abook.cover ||
            "";

          const authors =
            book.authorsAsString ||
            (Array.isArray(book.authors) ? book.authors.map((a: any) => a?.name || a).join(", ") : "");

          const narrators =
            abook.narratorAsString ||
            (Array.isArray(abook.narrators) ? abook.narrators.map((n: any) => n?.name || n).join(", ") : "");

          const durationMs = abook.length
            ? Number(abook.length)
            : abook.time
            ? Math.floor(Number(abook.time) / 1000000)
            : 0;

          const { language, languageName } = this.extractLanguageInfo(book, item, item);

          results.push({
            id,
            title,
            authors: authors || "",
            narrators: narrators || "",
            coverUrl: coverUrl || "",
            category: book.category?.title || book.category?.name || "",
            durationMs,
            description: abook.description || ebook.description || "",
            hasAbook: true,
            hasEbook: !!ebook.id || !!item.ebook,
            language,
            languageName,
          });
        }

        if (results.length > 0) {
          return results;
        }
      }
    } catch (err) {
      console.warn("[storytelApi] storytel.com fallback search failed:", err);
    }

    return results;
  }

  // True when a /libraries/bookshelf delta response explicitly contains the
  // consumable. The endpoint keys `items` by consumable id, but tolerate an
  // entry whose model carries the id instead.
  private deltaContainsConsumable(data: any, consumableId: string): boolean {
    const items = data?.items;
    if (!items || typeof items !== "object" || Array.isArray(items)) {
      return false;
    }
    return Object.entries(items).some(
      ([key, entry]: [string, any]) =>
        key === consumableId ||
        String(entry?.model?.id ?? "") === consumableId,
    );
  }

  // Re-read the bookshelf and check whether the consumable really landed there.
  private async isOnBookshelf(consumableId: string): Promise<boolean> {
    try {
      const { books } = await this.getBookshelf();
      return books.some(
        (entry) =>
          String(entry.id) === consumableId ||
          entry.book?.consumableId === consumableId,
      );
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      console.warn(
        "[storytelApi] bookshelf verification read failed:",
        error.message,
      );
      return false;
    }
  }

  /**
   * Add a book to the user's Storytel bookshelf.
   *
   * `/libraries/bookshelf` is a JSON delta-sync endpoint. It answers 200 with
   * the current bookshelf even for a body it could not parse, so a successful
   * HTTP status proves nothing: every write is verified against the bookshelf
   * before it is reported back as added.
   */
  // Build the `model` for a bookshelf item, mirroring the shape the endpoint
  // itself returns for existing shelf entries. A "SET" carries the whole model,
  // not a patch, so it is enriched from book-details when that call succeeds and
  // degrades to the bare identity fields when it does not.
  private async buildBookshelfModel(
    consumableId: string,
    state: string,
    stateUpdateTime: string,
  ): Promise<Record<string, unknown>> {
    const base = {
      id: consumableId,
      state,
      stateUpdateTime,
      deepLink: `storytel://book-details-page/book-details/consumables/${consumableId}`,
      resultType: "book",
    };

    try {
      const details = await this.getBookDetails(consumableId);
      return {
        ...base,
        title: details?.title ?? "",
        shareUrl: details?.shareUrl ?? "",
        kidsBook: !!details?.kidsBook,
        authors: Array.isArray(details?.authors) ? details.authors : [],
        narrators: Array.isArray(details?.narrators) ? details.narrators : [],
        formats: Array.isArray(details?.formats) ? details.formats : [],
        duration: details?.duration,
        category: details?.category,
        language: details?.language,
      };
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      console.warn(
        "[storytelApi] could not enrich bookshelf model, using minimal one:",
        error.message,
      );
      return { ...base, kidsBook: false };
    }
  }

  async addToBookshelf(
    consumableId: string,
  ): Promise<{ added: boolean; strategy: string | null }> {
    const id = String(consumableId);
    const now = new Date().toISOString();

    // A delta is only meaningful relative to the cursor it was computed from,
    // so start by reading the current state to pick up its resourceVersion.
    let current: RawBookshelfResponse;
    try {
      current = await this.fetchBookshelfSnapshot();
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      const customError: any = new Error(
        `Failed to add book to bookshelf: ${error.message}`,
      );
      customError.status = error.response?.status || 500;
      throw customError;
    }

    if (this.deltaContainsConsumable(current, id)) {
      return { added: true, strategy: "already-on-bookshelf" };
    }

    const resourceVersion = current.resourceVersion;
    const model = await this.buildBookshelfModel(id, "WILL_CONSUME", now);

    // `items` is map[consumableId] -> { action, model }, per the server's own
    // schema validation error.
    try {
      // Only `items` is sent: omitting followingItems/collections keeps the
      // delta narrow, so there is no way for an empty map to be read as
      // "clear these".
      const data = await this.postBookshelfDelta({
        ...(resourceVersion ? { resourceVersion } : {}),
        items: { [id]: { action: "SET", model } },
      });
      if (this.deltaContainsConsumable(data, id)) {
        return { added: true, strategy: "sync-items-map" };
      }
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      const detail =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      const customError: any = new Error(
        `Failed to add book to bookshelf: ${detail}`,
      );
      customError.status = error.response?.status || 500;
      throw customError;
    }

    // The response did not echo the book back; ask the bookshelf itself in case
    // the write was applied asynchronously.
    if (await this.isOnBookshelf(id)) {
      return { added: true, strategy: "sync-verified" };
    }

    // Every request went through, but the book is still not on the shelf.
    return { added: false, strategy: null };
  }

  // Storytel's delta protocol is not publicly documented. `SET` is confirmed by
  // observation (it is what the app itself sends), but the verb for taking a
  // book off the shelf is not, so try the plausible ones and let the bookshelf
  // itself decide which worked. Nothing is reported as removed until a fresh
  // read of the shelf no longer contains the book.
  private static readonly REMOVE_ACTIONS = ["DELETE", "REMOVE", "UNSET"];

  async removeFromBookshelf(
    consumableId: string,
  ): Promise<{ removed: boolean; strategy: string | null }> {
    const id = String(consumableId);

    let current: RawBookshelfResponse;
    try {
      current = await this.fetchBookshelfSnapshot();
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      const customError: any = new Error(
        `Failed to remove book from bookshelf: ${error.message}`,
      );
      customError.status = error.response?.status || 500;
      throw customError;
    }

    if (!this.deltaContainsConsumable(current, id)) {
      return { removed: true, strategy: "not-on-bookshelf" };
    }

    let resourceVersion = current.resourceVersion;
    let lastError: any = null;

    // Bare action first; a schema that insists on a model is handled by the
    // final attempt, which reuses the same builder as addToBookshelf.
    const attempts: { strategy: string; build: () => Promise<Record<string, unknown>> }[] =
      StorytelClient.REMOVE_ACTIONS.map((action) => ({
        strategy: action.toLowerCase(),
        build: async () => ({ items: { [id]: { action } } }),
      }));

    attempts.push({
      strategy: "delete-with-model",
      build: async () => ({
        items: {
          [id]: {
            action: "DELETE",
            model: await this.buildBookshelfModel(
              id,
              "WILL_CONSUME",
              new Date().toISOString(),
            ),
          },
        },
      }),
    });

    for (const attempt of attempts) {
      let body: Record<string, unknown>;
      try {
        body = await attempt.build();
      } catch (error: any) {
        if (error.isStorytelUnauthorized) throw error;
        lastError = error;
        continue;
      }

      try {
        await this.postBookshelfDelta({
          ...(resourceVersion ? { resourceVersion } : {}),
          ...body,
        });
      } catch (error: any) {
        if (error.isStorytelUnauthorized) throw error;
        // A rejected verb says nothing about the shelf itself - try the next.
        lastError = error;
        continue;
      }

      if (!(await this.isOnBookshelf(id))) {
        return { removed: true, strategy: `sync-${attempt.strategy}` };
      }

      // The write was accepted but changed nothing. Refresh the cursor so the
      // next delta is computed against the state the server actually has.
      try {
        resourceVersion = (await this.fetchBookshelfSnapshot()).resourceVersion;
      } catch {
        // Keep the previous cursor; the next attempt may still be accepted.
      }
    }

    if (lastError && !lastError.response) {
      const detail = lastError.message;
      const customError: any = new Error(
        `Failed to remove book from bookshelf: ${detail}`,
      );
      customError.status = 500;
      throw customError;
    }

    // Every candidate was tried and the book is still on the shelf.
    return { removed: false, strategy: null };
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
    const hasChapters = (data: any) => {
      if (!data || typeof data !== "object") return false;
      if (Array.isArray(data.chapters) && data.chapters.length > 0) return true;
      if (Array.isArray(data.tracks) && data.tracks.length > 0) return true;
      if (Array.isArray(data.items) && data.items.length > 0) return true;
      if (data.abook?.chapters && Array.isArray(data.abook.chapters) && data.abook.chapters.length > 0) return true;
      const abook = Array.isArray(data.formats)
        ? data.formats.find((f: any) => f.type === "abook")
        : null;
      if (abook?.chapters && Array.isArray(abook.chapters) && abook.chapters.length > 0) return true;
      if (abook?.tracks && Array.isArray(abook.tracks) && abook.tracks.length > 0) return true;
      return false;
    };

    const candidates = [
      `https://api.storytel.net/playback-metadata/consumables/${consumableId}`,
      `https://api.storytel.net/playback-metadata/consumable/${consumableId}`,
      `https://api.storytel.net/playback-metadata/v2/consumables/${consumableId}`,
      `https://api.storytel.net/assets/v2/consumables/${consumableId}/abook`,
      `https://api.storytel.net/consumables/${consumableId}/tracks`,
      `https://api.storytel.net/consumables/${consumableId}/chapters`,
    ];

    let fallbackData: any = null;
    let lastError: any = null;

    try {
      const bearer = await this.getApiBearer();
      for (const url of candidates) {
        try {
          const response = await this.client.get(url, {
            headers: {
              Authorization: `Bearer ${bearer}`,
              Accept: "application/json, text/plain, */*",
            },
          });
          if (response.data) {
            if (hasChapters(response.data)) {
              return response.data;
            }
            if (!fallbackData) {
              fallbackData = response.data;
            }
          }
        } catch (error: any) {
          if (error.isStorytelUnauthorized) throw error;
          lastError = error;
        }
      }
    } catch (err: any) {
      if (err.isStorytelUnauthorized) throw err;
      lastError = err;
    }

    try {
      const legacyToken = this.getLegacyActionToken();
      if (legacyToken) {
        const legacyUrls = [
          `https://www.storytel.com/api/getBookInfo.action?token=${encodeURIComponent(legacyToken)}&programId=${encodeURIComponent(consumableId)}`,
          `https://www.storytel.com/api/getABookTracks.action?token=${encodeURIComponent(legacyToken)}&programId=${encodeURIComponent(consumableId)}`,
          `https://www.storytel.com/api/getChapters.action?token=${encodeURIComponent(legacyToken)}&programId=${encodeURIComponent(consumableId)}`,
        ];
        for (const legacyUrl of legacyUrls) {
          try {
            const response = await this.client.get(legacyUrl);
            if (response.data) {
              if (hasChapters(response.data)) {
                return response.data;
              }
              if (!fallbackData) {
                fallbackData = response.data;
              }
            }
          } catch {
            // Try next legacy url
          }
        }
      }
    } catch {
      // Ignore legacy fallback failure
    }

    // Try book-details as last resort
    if (!fallbackData) {
      try {
        const details = await this.getBookDetails(consumableId);
        if (details) return details;
      } catch (err: any) {
        if (err.isStorytelUnauthorized) throw err;
        lastError = err;
      }
    } else {
      return fallbackData;
    }

    throw new Error(`Failed to get bookinfo: ${lastError?.message || "Unknown error"}`);
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
