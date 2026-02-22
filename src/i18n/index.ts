import {app} from 'electron';
import * as dot from 'dot-object';
import {storeManager} from '../modules/store';

interface Translations {
    [key: string]: any;
}

export type SupportedLanguage = 'en' | 'it' | 'fr' | 'es' | 'de' | 'sv';

class I18n {
    private currentLanguage: SupportedLanguage = 'en';
    public translations: Translations = {};
    private fastifyServer: any = null;
    private appLocale: string = 'en';

    public setAppLocale(locale: string): void {
        this.appLocale = locale;
    }

    async initialize(server: any): Promise<void> {
        this.fastifyServer = server;
        await this.loadTranslations();
    }

    public detectLanguage(): void {
        // Check for saved language setting first
        const savedLanguage = storeManager.get<string>('appLanguage');
        
        if (savedLanguage && savedLanguage !== 'auto') {
            const supported = ['en', 'it', 'fr', 'es', 'de', 'sv'];
            if (supported.includes(savedLanguage)) {
                this.currentLanguage = savedLanguage as SupportedLanguage;
                return;
            }
        }

        // Check for APP_LOCALE environment variable next
        const envLocale = process.env.APP_LOCALE;
        const locale = envLocale || this.appLocale || 'en';
        const languageCode = locale.split('-')[0].toLowerCase();

        const supported = ['en', 'it', 'fr', 'es', 'de', 'sv'];
        if (supported.includes(languageCode)) {
            this.currentLanguage = languageCode as SupportedLanguage;
        } else {
            this.currentLanguage = 'en';
        }
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
