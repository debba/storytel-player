import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import api from './utils/api';
import { regionFromLocales } from './config/regions';
import {
    AUTO_LANGUAGE,
    FALLBACK_LANGUAGE,
    isSupportedLanguage,
    negotiateLanguage,
    SUPPORTED_LANGUAGE_CODES,
    systemPreferredLanguages,
} from './config/languages';

/** localStorage key mirroring the Electron store's `appLanguage`. */
const LANGUAGE_MODE_KEY = 'appLanguageMode';

export interface LanguageState {
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

const readStoredMode = (): string => {
    try {
        const stored = window.localStorage.getItem(LANGUAGE_MODE_KEY);
        return stored && isSupportedLanguage(stored) ? stored.toLowerCase() : AUTO_LANGUAGE;
    } catch {
        return AUTO_LANGUAGE;
    }
};

const writeStoredMode = (mode: string): void => {
    try {
        window.localStorage.setItem(LANGUAGE_MODE_KEY, mode);
    } catch {
        // Private mode / storage disabled - the Electron store still persists it.
    }
};

const resolveMode = (mode: string): string =>
    mode === AUTO_LANGUAGE ? negotiateLanguage(systemPreferredLanguages()) : mode;

/**
 * Loads `server/locales/<lang>.json` through the API (or Electron IPC).
 *
 * Always asks for a bare language code: the server only ships bare codes, and
 * an unknown tag makes it answer with *every* language bundled together.
 */
class ApiBackend {
    static type = 'backend' as const;

    async read(lang: string, _ns: string, callback: (err: any, data?: any) => void) {
        const code = negotiateLanguage([lang]);
        try {
            const response = await api.get(`/translations?lang=${code}`, {});
            callback(null, response.data);
        } catch (error) {
            // Report the failure so i18next falls through to `fallbackLng`
            // instead of leaving the namespace pending and rendering raw keys.
            callback(error, false);
        }
    }
}

// Resolve synchronously, before init, so the first render is already in the
// right language. In Electron `navigator.languages` mirrors the OS preference
// list the main process negotiates over, so both sides agree; the async
// reconcile below is only there for a stored preference we cannot read yet.
const initialMode = readStoredMode();

i18n.use(ApiBackend)
    .use(initReactI18next)
    .init({
        lng: resolveMode(initialMode),
        fallbackLng: FALLBACK_LANGUAGE,
        supportedLngs: [...SUPPORTED_LANGUAGE_CODES],
        // Bundles are keyed by bare language code; never request 'sv-FI'.
        load: 'languageOnly',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

const applyDocumentLanguage = (lng: string) => {
    if (typeof document !== 'undefined') {
        document.documentElement.lang = lng;
    }
};

applyDocumentLanguage(i18n.language || FALLBACK_LANGUAGE);
i18n.on('languageChanged', applyDocumentLanguage);

/** Current preference and what it resolves to, for the language picker. */
export const getLanguageState = async (): Promise<LanguageState> => {
    if (window.electronLocale?.getState) {
        try {
            return await window.electronLocale.getState();
        } catch {
            // Fall through to the renderer-only answer below.
        }
    }
    const mode = readStoredMode();
    const systemLanguages = systemPreferredLanguages();
    return {
        mode,
        resolved: i18n.language || resolveMode(mode),
        systemLanguages,
        systemResolved: negotiateLanguage(systemLanguages),
        region: regionFromLocales(systemLanguages),
    };
};

/**
 * Switch the app language. `mode` is a language code, or 'auto' to follow the
 * operating system. Applies immediately - no restart.
 */
export const setLanguageMode = async (mode: string): Promise<LanguageState> => {
    const normalized = mode === AUTO_LANGUAGE ? AUTO_LANGUAGE : mode.toLowerCase();
    writeStoredMode(normalized);

    let resolved = resolveMode(normalized);
    let systemLanguages = systemPreferredLanguages();
    let systemResolved = negotiateLanguage(systemLanguages);
    let region = regionFromLocales(systemLanguages);

    // The main process owns the persisted setting and the tray/native strings.
    if (window.electronLocale?.setLocale) {
        try {
            const state = await window.electronLocale.setLocale(normalized);
            if (state?.resolved) {
                resolved = state.resolved;
                systemLanguages = state.systemLanguages ?? systemLanguages;
                systemResolved = state.systemResolved ?? systemResolved;
                region = state.region ?? region;
            }
        } catch (error) {
            console.error('Failed to persist language in Electron:', error);
        }
    }

    if (i18n.language !== resolved) {
        await i18n.changeLanguage(resolved);
    }

    return { mode: normalized, resolved, systemLanguages, systemResolved, region };
};

// Reconcile with the main process, which is the source of truth for the stored
// preference. Only matters when localStorage and the Electron store disagree
// (first run after an upgrade, or a cleared renderer storage).
if (window.electronLocale?.getState) {
    window.electronLocale
        .getState()
        .then((state) => {
            if (!state) return;
            writeStoredMode(state.mode);
            if (state.resolved && state.resolved !== i18n.language) {
                i18n.changeLanguage(state.resolved);
            }
        })
        .catch(() => {
            // Keep the language already resolved from navigator/localStorage.
        });
}

export default i18n;
