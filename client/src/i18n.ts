import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import api from "./utils/api";

class ApiBackend {
    static type = "backend" as const;

    async read(lang: string, ns: string, callback: any) {
        const response = await api.get(`/translations?lang=${lang}&ns=${ns}`, {});
        callback(null, response.data);
    }
}


i18n
  .use(ApiBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'it', 'fr', 'es', 'de', 'sv'],
    detection: {
      order: ['navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

// Check if running in Electron and get locale from Electron
if (window.electronLocale) {
  window.electronLocale.getLocale().then((electronLocale: string) => {
    i18n.changeLanguage(electronLocale);
  }).catch(() => {
    // Fallback to browser detection if Electron locale fails
    const detectedLanguage = i18n.language || window.navigator.language;
    const languageCode = detectedLanguage.split('-')[0];

    const supported = ['en', 'it', 'fr', 'es', 'de', 'sv'];
    if (supported.includes(languageCode)) {
      i18n.changeLanguage(languageCode);
    } else {
      i18n.changeLanguage('en');
    }
  });
} else {
  // Fallback to browser detection if not in Electron
  const detectedLanguage = i18n.language || window.navigator.language;
  const languageCode = detectedLanguage.split('-')[0];

  const supported = ['en', 'it', 'fr', 'es', 'de', 'sv'];
  if (supported.includes(languageCode)) {
    i18n.changeLanguage(languageCode);
  } else {
    i18n.changeLanguage('en');
  }
}

export default i18n;
