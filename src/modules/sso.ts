import { BrowserWindow, session } from 'electron';

export type SsoProvider = 'google' | 'apple';

export interface SsoCredentials {
  storytelSession: string;
  firebaseRefreshToken: string;
  firebaseApiKey: string;
  email: string;
  cid: string;
}

export interface SsoLoginResult {
  cancelled: boolean;
  credentials?: SsoCredentials;
  error?: string;
}

const STORYTEL_LOGIN_URL = 'https://www.storytel.com/it/login';
const STORYTEL_HOST = 'storytel.com';
const SSO_PARTITION = 'persist:storytel-sso';
// Any page on www.storytel.com works for reading the Firebase IndexedDB; we
// pick the locale root because it always exists (no 404 redirect).
const STORYTEL_WWW_STORAGE_TARGET = 'https://www.storytel.com/it/';

const FIREBASE_AUTH_PATH = /^\/__\/auth\//;
const LOGIN_PATH = /^\/[a-z]{2,3}\/login(\/|$)/;

const DESKTOP_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Time to let the SPA settle after landing on a post-login page before we
// trigger the controlled navigation to www.storytel.com for the IDB read.
const POST_LOGIN_SETTLE_MS = 1500;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Click the Storytel login page's provider button. The page is not under our
// control, so the selector is best-effort: we look for any clickable element
// whose visible text or aria-label mentions the provider name. Polls for up to
// `maxAttempts * intervalMs` (~5s) before giving up — if it never matches, the
// user can still click manually inside the webview.
function buildProviderClickScript(provider: SsoProvider): string {
  return `
    (async () => {
      const target = ${JSON.stringify(provider)};
      const needles = target === 'google'
        ? ['google']
        : ['apple'];
      const findAndClick = () => {
        const candidates = Array.from(
          document.querySelectorAll('button, a, [role="button"]')
        );
        for (const el of candidates) {
          const text = (el.textContent || '').toLowerCase().trim();
          const aria = (el.getAttribute('aria-label') || '').toLowerCase();
          const haystack = text + ' ' + aria;
          if (needles.some(n => haystack.includes(n)) && text.length < 60) {
            el.click();
            return true;
          }
        }
        return false;
      };
      for (let i = 0; i < 25; i++) {
        if (findAndClick()) return true;
        await new Promise(r => setTimeout(r, 200));
      }
      return false;
    })()
  `;
}

export class SsoManager {
  private window: BrowserWindow | null = null;

  private async clearStorytelState(ssoSession: Electron.Session): Promise<void> {
    try {
      // Remove every cookie scoped to storytel.com (covers .storytel.com,
      // www.storytel.com, private.storytel.com).
      const cookies = await ssoSession.cookies.get({ domain: STORYTEL_HOST });
      await Promise.all(
        cookies.map((c) => {
          const host = (c.domain ?? '').replace(/^\./, '') || STORYTEL_HOST;
          const url = `${c.secure ? 'https' : 'http'}://${host}${c.path ?? '/'}`;
          return ssoSession.cookies.remove(url, c.name).catch(() => undefined);
        })
      );
    } catch (err) {
      console.error('[sso] failed to clear storytel cookies:', err);
    }
    // Clear IndexedDB / localStorage / sessionStorage on the storytel origins
    // (this is where the Firebase Web SDK persists the authenticated user).
    const origins = [
      'https://www.storytel.com',
      'https://private.storytel.com',
    ];
    for (const origin of origins) {
      try {
        await ssoSession.clearStorageData({
          origin,
          storages: ['indexdb', 'localstorage'],
        });
      } catch (err) {
        console.error(`[sso] failed to clear storage for ${origin}:`, err);
      }
    }
  }

  async openSsoWindow(
    parent?: BrowserWindow | null,
    provider?: SsoProvider
  ): Promise<SsoLoginResult> {
    if (this.window) {
      this.window.focus();
      return { cancelled: true };
    }

    const ssoSession = session.fromPartition(SSO_PARTITION);
    ssoSession.setUserAgent(DESKTOP_UA);

    // Wipe any prior Storytel session so the provider picker is shown again.
    // We deliberately leave accounts.google.com / appleid.apple.com cookies
    // intact so the user isn't forced to re-enter the OAuth provider password.
    await this.clearStorytelState(ssoSession);

    this.window = new BrowserWindow({
      width: 520,
      height: 720,
      parent: parent ?? undefined,
      modal: false,
      autoHideMenuBar: true,
      webPreferences: {
        partition: SSO_PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.window.webContents.setUserAgent(DESKTOP_UA);

    await this.window.loadURL(STORYTEL_LOGIN_URL);

    if (provider) {
      // Fire-and-forget: don't block the SSO flow if the click script fails.
      // The user can still pick a provider manually inside the webview.
      this.window.webContents
        .executeJavaScript(buildProviderClickScript(provider), true)
        .catch((err) => console.error('[sso] provider click failed:', err));
    }

    return new Promise<SsoLoginResult>((resolve) => {
      const win = this.window!;
      let settled = false;
      let inCaptureFlow = false;
      let scheduledCapture: NodeJS.Timeout | null = null;

      const finish = (result: SsoLoginResult): void => {
        if (settled) return;
        settled = true;
        if (scheduledCapture) {
          clearTimeout(scheduledCapture);
          scheduledCapture = null;
        }
        try {
          if (!win.isDestroyed()) win.close();
        } catch {
          // ignore
        }
        this.window = null;
        resolve(result);
      };

      const extractFirebaseRefreshToken = async (): Promise<{
        refreshToken: string;
        apiKey: string;
      } | null> => {
        const result = await win.webContents.executeJavaScript(
          `(async () => {
            try {
              const db = await new Promise((res, rej) => {
                const req = indexedDB.open('firebaseLocalStorageDb');
                req.onsuccess = e => res(e.target.result);
                req.onerror = e => rej((e.target && e.target.error) || new Error('open failed'));
              });
              const storeNames = Array.from(db.objectStoreNames);
              if (!storeNames.includes('firebaseLocalStorage')) {
                db.close();
                return null;
              }
              const entries = await new Promise((res, rej) => {
                const tx = db.transaction('firebaseLocalStorage', 'readonly');
                const s = tx.objectStore('firebaseLocalStorage');
                const req = s.getAll();
                req.onsuccess = () => res(req.result);
                req.onerror = e => rej((e.target && e.target.error) || new Error('getAll failed'));
              });
              db.close();
              for (const entry of entries) {
                const key = entry && entry.fbase_key;
                if (typeof key === 'string' && key.startsWith('firebase:authUser:') && key.endsWith(':[DEFAULT]')) {
                  const apiKey = key.slice('firebase:authUser:'.length, key.length - ':[DEFAULT]'.length);
                  const refresh = entry && entry.value && entry.value.stsTokenManager && entry.value.stsTokenManager.refreshToken;
                  if (refresh) return { refreshToken: refresh, apiKey };
                }
              }
              return null;
            } catch (e) {
              return null;
            }
          })()`,
          true
        );
        return result ?? null;
      };

      const capture = async (): Promise<void> => {
        if (settled || win.isDestroyed() || inCaptureFlow) return;
        inCaptureFlow = true;
        try {
          const cookies = await ssoSession.cookies.get({ domain: STORYTEL_HOST });
          const sessionCookie = cookies.find((c) => c.name === 'storytel_session');
          if (!sessionCookie || !sessionCookie.value) {
            finish({
              cancelled: false,
              error: 'storytel_session cookie not found after login',
            });
            return;
          }

          // Read identity claims from the session cookie (it is itself a JWT).
          const claims = decodeJwtPayload(sessionCookie.value);
          const email = typeof claims?.email === 'string' ? claims.email : '';
          const cid = typeof claims?.cid === 'string' ? claims.cid : '';

          // Navigate to www.storytel.com to read its IndexedDB (Firebase Web SDK origin).
          const currentHost = new URL(win.webContents.getURL()).hostname;
          if (currentHost !== 'www.storytel.com') {
            await win.webContents.loadURL(STORYTEL_WWW_STORAGE_TARGET);
            await new Promise((r) => setTimeout(r, 800));
          }

          const fb = await extractFirebaseRefreshToken();
          if (!fb) {
            finish({
              cancelled: false,
              error: 'Firebase refresh token not found in IndexedDB',
            });
            return;
          }

          finish({
            cancelled: false,
            credentials: {
              storytelSession: sessionCookie.value,
              firebaseRefreshToken: fb.refreshToken,
              firebaseApiKey: fb.apiKey,
              email,
              cid,
            },
          });
        } catch (err: unknown) {
          finish({
            cancelled: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      };

      const scheduleCapture = (): void => {
        if (settled || scheduledCapture || inCaptureFlow) return;
        scheduledCapture = setTimeout(() => {
          scheduledCapture = null;
          void capture();
        }, POST_LOGIN_SETTLE_MS);
      };

      const maybeAutoCapture = (url: string): void => {
        if (inCaptureFlow) return;
        try {
          const parsed = new URL(url);
          if (!parsed.hostname.endsWith(STORYTEL_HOST)) return;
          if (FIREBASE_AUTH_PATH.test(parsed.pathname)) return;
          if (LOGIN_PATH.test(parsed.pathname)) return;
          scheduleCapture();
        } catch {
          // ignore unparseable urls
        }
      };

      win.webContents.on('did-navigate', (_e, url) => maybeAutoCapture(url));
      win.webContents.on('did-navigate-in-page', (_e, url) => maybeAutoCapture(url));
      win.on('closed', () => {
        finish({ cancelled: true });
      });
    });
  }
}
