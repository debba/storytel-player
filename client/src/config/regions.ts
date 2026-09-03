/**
 * Which reading languages people in a given country are likely to want.
 *
 * This is deliberately about the *country you are in*, not about the app UI
 * language and not about the Storytel account's market. Europe is full of
 * places where those three differ: a Swedish speaker in Finland (`sv-FI`)
 * wants Swedish and Finnish, someone in South Tyrol wants Italian and German,
 * and a Belgian may want Dutch, French or both.
 *
 * Used only to pre-select the language filter in catalog search. The catalog
 * itself decides what actually exists - anything here that the account's market
 * does not carry simply never shows up. A user's own choice always wins and is
 * remembered.
 *
 * Codes are ISO 639-1, matching the `language.isoValue` Storytel returns.
 */
export const REGION_LANGUAGES: Record<string, readonly string[]> = {
    // Nordics
    SE: ['sv', 'en'],
    FI: ['fi', 'sv', 'en'],
    NO: ['nb', 'no', 'nn', 'en'],
    DK: ['da', 'en'],
    IS: ['is', 'en'],
    // German-speaking
    DE: ['de', 'en'],
    AT: ['de', 'en'],
    CH: ['de', 'fr', 'it', 'en'],
    // Benelux
    NL: ['nl', 'en'],
    BE: ['nl', 'fr', 'de', 'en'],
    LU: ['fr', 'de', 'en'],
    // Southern Europe
    IT: ['it', 'de', 'en'],
    ES: ['es', 'ca', 'gl', 'eu', 'en'],
    PT: ['pt', 'en'],
    FR: ['fr', 'en'],
    GR: ['el', 'en'],
    // Central and Eastern Europe
    PL: ['pl', 'en'],
    CZ: ['cs', 'en'],
    SK: ['sk', 'cs', 'en'],
    HU: ['hu', 'en'],
    RO: ['ro', 'en'],
    BG: ['bg', 'en'],
    HR: ['hr', 'en'],
    SI: ['sl', 'en'],
    RS: ['sr', 'en'],
    EE: ['et', 'ru', 'en'],
    LV: ['lv', 'ru', 'en'],
    LT: ['lt', 'ru', 'en'],
    UA: ['uk', 'ru', 'en'],
    RU: ['ru', 'en'],
    TR: ['tr', 'en'],
    // Middle East, Asia
    IL: ['he', 'ar', 'en'],
    AE: ['ar', 'en'],
    SA: ['ar', 'en'],
    EG: ['ar', 'en'],
    IN: ['hi', 'en'],
    ID: ['id', 'en'],
    SG: ['en', 'zh'],
    // Americas, Oceania
    BR: ['pt', 'en'],
    MX: ['es', 'en'],
    CO: ['es', 'en'],
    CL: ['es', 'en'],
    AR: ['es', 'en'],
    US: ['en', 'es'],
    CA: ['en', 'fr'],
    GB: ['en'],
    IE: ['en'],
    AU: ['en'],
    NZ: ['en'],
};

/** First region subtag found in an ordered list of locales ('sv-FI' -> 'FI'). */
export const regionFromLocales = (locales: readonly (string | null | undefined)[]): string | null => {
    for (const locale of locales) {
        if (!locale) continue;
        try {
            const region = new Intl.Locale(locale.replace(/_/g, '-')).region;
            if (region) return region.toUpperCase();
        } catch {
            // Not a parsable tag - try the next one.
        }
    }
    return null;
};

/**
 * Languages to pre-select in catalog search, most relevant first:
 * the languages the user actually reads, then the app UI language, then the
 * languages of the country they are in.
 */
export const preferredCatalogLanguages = (options: {
    region?: string | null;
    systemLanguages?: readonly string[];
    uiLanguage?: string | null;
}): string[] => {
    const { region, systemLanguages = [], uiLanguage } = options;
    const out: string[] = [];

    const push = (code?: string | null) => {
        const base = code?.toLowerCase().replace(/_/g, '-').split('-')[0];
        if (base && !out.includes(base)) out.push(base);
    };

    systemLanguages.forEach(push);
    push(uiLanguage);
    (REGION_LANGUAGES[(region ?? '').toUpperCase()] ?? []).forEach(push);

    return out;
};
