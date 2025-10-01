import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationIT from './locales/it.json';
import translationEN from './locales/en.json';

const resources = {
  it: {
    translation: translationIT
  },
  en: {
    translation: translationEN
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['it', 'en'],
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

// Logica personalizzata: se italiano -> italiano, altrimenti -> inglese
const detectedLanguage = i18n.language || window.navigator.language;
const languageCode = detectedLanguage.split('-')[0];

if (languageCode === 'it') {
  i18n.changeLanguage('it');
} else {
  i18n.changeLanguage('en');
}

export default i18n;
