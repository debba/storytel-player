// Global window type extensions for Electron IPC
export {};

declare global {
  /** Mirrors `LanguageState` in the Electron main process (src/i18n/index.ts). */
  interface AppLanguageState {
    /** 'auto', or an explicit language code the user picked. */
    mode: string;
    /** The language actually in use once 'auto' has been resolved. */
    resolved: string;
    /** OS languages, most preferred first (e.g. ['sv-FI', 'en-FI']). */
    systemLanguages: string[];
    /** What 'auto' resolves to right now. */
    systemResolved: string;
    /** OS country code ('FI'), i.e. where the user is - not their language. */
    region: string | null;
  }

  interface Window {
    // TODO: Define proper types for tray control methods based on actual Electron IPC
    trayControls?: {
      updateProgress?: (current: number, total: number) => void;
      updatePlaybackState?: (isPlaying: boolean) => void;
      updatePlayingState?: (isPlaying: boolean, bookTitle: string | null) => void;
      updateAuthState?: (isAuthenticated: boolean) => void;
      updateSpeed?: (speed: number) => void;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      off?: (event: string) => void;
      onPlayPause?: (callback: () => void) => void;
      onSetSpeed?: (callback: (event: any, speed: number) => void) => void;
      onLogout?: (callback: () => void) => void;
    };
    electronLocale?: {
      getLocale: () => Promise<string>;
      getState: () => Promise<AppLanguageState>;
      setLocale: (locale: string) => Promise<AppLanguageState>;
    };
    electronLogs?: {
      openLogsFolder: () => Promise<void>;
      onOpenLogsModal: (callback: () => void) => void;
    };
    electronWindow?: {
      setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
      isAlwaysOnTop: () => Promise<boolean>;
    };
    electronAuth?: {
      openSsoWindow: (provider?: 'google' | 'apple') => Promise<{
        cancelled: boolean;
        credentials?: {
          storytelSession: string;
          firebaseRefreshToken: string;
          firebaseApiKey: string;
          email: string;
          cid: string;
        };
        error?: string;
      }>;
    };
  }
}