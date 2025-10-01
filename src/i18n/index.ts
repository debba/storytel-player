import { app } from 'electron';

interface Translations {
  tray: {
    noBookPlaying: string;
    showApp: string;
    playPause: string;
    playbackSpeed: string;
    quit: string;
  };
}

const translations: Record<'it' | 'en', Translations> = {
  it: {
    tray: {
      noBookPlaying: 'Nessun libro in riproduzione',
      showApp: 'Mostra App',
      playPause: 'Play/Pausa',
      playbackSpeed: 'Velocità di Riproduzione',
      quit: 'Esci',
    },
  },
  en: {
    tray: {
      noBookPlaying: 'No book playing now',
      showApp: 'Show App',
      playPause: 'Play/Pause',
      playbackSpeed: 'Playback Speed',
      quit: 'Quit',
    },
  },
};

class I18n {
  private currentLanguage: 'it' | 'en' = 'en';

  constructor() {
    this.detectLanguage();
  }

  private detectLanguage(): void {
    const locale = app.getLocale();
    const languageCode = locale.split('-')[0];

    if (languageCode === 'it') {
      this.currentLanguage = 'it';
    } else {
      this.currentLanguage = 'en';
    }
  }

  t(key: string): string {
    const keys = key.split('.');
    let value: any = translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }

  getLanguage(): 'it' | 'en' {
    return this.currentLanguage;
  }
}

export const i18n = new I18n();
