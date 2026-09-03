/**
 * Single source of truth for the languages the app UI is translated into.
 *
 * IMPORTANT: a UI language is not a country and not a catalog language.
 *  - UI language   -> which `server/locales/<code>.json` we render the app with.
 *  - Country/market-> decided by the Storytel account, not by us. It controls
 *                     which books are searchable and which language names the
 *                     Storytel API sends back (see `localizedLanguageName`).
 * Keep the two apart: a user with a `sv-FI` system locale (Swedish speaker in
 * Finland) wants a Swedish UI, while their catalog may be Swedish + English.
 *
 * When adding a language, update in lockstep:
 *   1. `server/locales/<code>.json`  (all keys, same shape as en.json)
 *   2. `server/fastify-common.ts`    (/api/translations)
 *   3. `src/i18n/languages.ts`       (Electron main process)
 *   4. this file
 */

export const AUTO_LANGUAGE = 'auto';
export const FALLBACK_LANGUAGE = 'en';

export interface AppLanguage {
    /** BCP-47 tag of the bundled translation file. */
    code: string;
    /** Endonym - the language's own name. Never translated. */
    nativeName: string;
}

/** Ordered alphabetically by endonym so no language looks privileged. */
export const APP_LANGUAGES: readonly AppLanguage[] = [
    {code: 'de', nativeName: 'Deutsch'},
    {code: 'en', nativeName: 'English'},
    {code: 'es', nativeName: 'Español'},
    {code: 'fr', nativeName: 'Français'},
    {code: 'it', nativeName: 'Italiano'},
    {code: 'fi', nativeName: 'Suomi'},
    {code: 'sv', nativeName: 'Svenska'},
];

export const SUPPORTED_LANGUAGE_CODES: readonly string[] = APP_LANGUAGES.map((l) => l.code);

export const isSupportedLanguage = (code?: string | null): boolean =>
    !!code && SUPPORTED_LANGUAGE_CODES.includes(code.toLowerCase());

export const findLanguage = (code?: string | null): AppLanguage | undefined =>
    code ? APP_LANGUAGES.find((l) => l.code === code.toLowerCase()) : undefined;

/**
 * Pick the best bundled translation for an ordered list of user preferences.
 *
 * Walks the *whole* preference list, and for each entry strips subtags from
 * the right. So `['sv-FI', 'en-FI']` resolves to Swedish (not Finnish - the
 * region says nothing about the language), and `['nl-NL', 'de-DE']` resolves
 * to German rather than skipping straight to the English fallback.
 */
export const negotiateLanguage = (
    preferred: readonly (string | null | undefined)[],
    fallback: string = FALLBACK_LANGUAGE,
): string => {
    for (const raw of preferred) {
        if (!raw) continue;
        const tag = String(raw).trim().toLowerCase().replace(/_/g, '-');
        if (!tag) continue;

        const parts = tag.split('-').filter(Boolean);
        for (let i = parts.length; i > 0; i--) {
            const candidate = parts.slice(0, i).join('-');
            const match = APP_LANGUAGES.find((l) => l.code.toLowerCase() === candidate);
            if (match) return match.code;
        }
    }
    return fallback;
};

/** The languages the OS/browser reports, most preferred first, deduplicated. */
export const systemPreferredLanguages = (): string[] => {
    if (typeof navigator === 'undefined') return [];
    const list = Array.isArray(navigator.languages) ? [...navigator.languages] : [];
    if (navigator.language) list.push(navigator.language);
    return [...new Set(list.filter(Boolean))];
};
