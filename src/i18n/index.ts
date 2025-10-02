import {app} from 'electron';
import * as dot from 'dot-object';

interface Translations {
    [key: string]: any;
}

class I18n {
    private currentLanguage: 'it' | 'en' = 'en';
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
        // Check for APP_LOCALE environment variable first
        const envLocale = process.env.APP_LOCALE;
        const locale = envLocale || this.appLocale || 'en';
        const languageCode = locale.split('-')[0].toLowerCase();

        if (languageCode === 'it') {
            this.currentLanguage = 'it';
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

    getLanguage(): 'it' | 'en' {
        return this.currentLanguage;
    }
}

export const i18n = new I18n();
