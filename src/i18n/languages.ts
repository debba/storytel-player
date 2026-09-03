/**
 * Language negotiation for the Electron main process.
 *
 * Mirrors `client/src/config/languages.ts` - the two build targets (tsc for
 * main, Vite for the renderer) do not share a module graph, so the list is
 * duplicated on purpose. Keep them in sync when adding a language.
 */

export const AUTO_LANGUAGE = 'auto';
export const FALLBACK_LANGUAGE = 'en';

export const SUPPORTED_LANGUAGES = ['de', 'en', 'es', 'fr', 'it', 'fi', 'sv'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const isSupportedLanguage = (code?: string | null): code is SupportedLanguage =>
    !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code.toLowerCase());

/**
 * Best bundled translation for an ordered list of user preferences.
 * `['sv-FI', 'en-FI']` -> 'sv': the region subtag never decides the language.
 */
export const negotiateLanguage = (
    preferred: readonly (string | null | undefined)[],
    fallback: SupportedLanguage = FALLBACK_LANGUAGE,
): SupportedLanguage => {
    for (const raw of preferred) {
        if (!raw) continue;
        const tag = String(raw).trim().toLowerCase().replace(/_/g, '-');
        if (!tag) continue;

        const parts = tag.split('-').filter(Boolean);
        for (let i = parts.length; i > 0; i--) {
            const candidate = parts.slice(0, i).join('-');
            if (isSupportedLanguage(candidate)) return candidate as SupportedLanguage;
        }
    }
    return fallback;
};
