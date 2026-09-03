import * as dot from 'dot-object';
import {storeManager} from '../modules/store';
import {
    AUTO_LANGUAGE,
    FALLBACK_LANGUAGE,
    isSupportedLanguage,
    negotiateLanguage,
    SupportedLanguage,
    SUPPORTED_LANGUAGES,
} from './languages';

interface Translations {
    [key: string]: any;
}

export type {SupportedLanguage};
export {SUPPORTED_LANGUAGES};

/** What the renderer needs to render the language picker. */
export interface LanguageState {
    /** 'auto', or an explicit language code the user picked. */
    mode: string;
    /** The language actually in use once 'auto' has been resolved. */
    resolved: SupportedLanguage;
    /** OS languages, most preferred first (e.g. ['sv-FI', 'en-FI']). */
    systemLanguages: string[];
    /** What 'auto' resolves to right now. */
    systemResolved: SupportedLanguage;
    /** OS country code ('FI'), i.e. where the user is - not their language. */
    region: string | null;
}

class I18n {
    private currentLanguage: SupportedLanguage = FALLBACK_LANGUAGE;
    public translations: Translations = {};
    private fastifyServer: any = null;
    /** OS preferred languages, most preferred first. */
    private systemLanguages: string[] = [];
    /** OS country code, from `app.getLocaleCountryCode()`. */
    private region: string | null = null;

    /**
     * @param locales OS languages, most preferred first. Electron's
     * `app.getPreferredSystemLanguages()` returns the full ordered list
     * (e.g. ['sv-FI', 'en-FI']); `app.getLocale()` only returns the first one
     * already collapsed to a Chromium UI locale, which loses the user's
     * second choice.
     */
    public setSystemLanguages(locales: string[] | string): void {
        const list = (Array.isArray(locales) ? locales : [locales]).filter(Boolean);
        this.systemLanguages = [...new Set(list)];
    }

    /**
     * The country the user is in, which is independent of their language:
     * a `sv-FI` locale means "Swedish speaker in Finland".
     */
    public setRegion(region: string | null): void {
        this.region = region ? region.toUpperCase() : null;
    }

    async initialize(server: any): Promise<void> {
        this.fastifyServer = server;
        await this.loadTranslations();
    }

    /** The user's stored preference: 'auto' or an explicit language code. */
    public getMode(): string {
        const saved = storeManager.get<string>('appLanguage');
        if (saved && saved !== AUTO_LANGUAGE && isSupportedLanguage(saved)) {
            return saved.toLowerCase();
        }
        return AUTO_LANGUAGE;
    }

    /** What 'auto' resolves to: OS preferences, then APP_LOCALE, then English. */
    private resolveSystemLanguage(): SupportedLanguage {
        return negotiateLanguage([...this.systemLanguages, process.env.APP_LOCALE]);
    }

    public detectLanguage(): void {
        const mode = this.getMode();
        this.currentLanguage =
            mode === AUTO_LANGUAGE ? this.resolveSystemLanguage() : (mode as SupportedLanguage);
    }

    public getState(): LanguageState {
        return {
            mode: this.getMode(),
            resolved: this.currentLanguage,
            systemLanguages: [...this.systemLanguages],
            systemResolved: this.resolveSystemLanguage(),
            region: this.region,
        };
    }

    private async loadTranslations(): Promise<void> {
        if (!this.fastifyServer) {
            console.error('Fastify server not initialized');
            return;
        }

        try {
            const response = await this.fastifyServer.inject({
                method: 'GET',
                url: `/api/translations?lang=${this.currentLanguage}`,
            });

            this.translations = response.json();
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }

    t(key: string): string {
        let value = dot.pick(key, this.translations) || key;
        return typeof value === 'string' ? value : key;
    }

    getLanguage(): SupportedLanguage {
        return this.currentLanguage;
    }
}

export const i18n = new I18n();
