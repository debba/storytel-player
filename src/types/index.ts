import { BrowserWindow } from 'electron';

export interface PlayingState {
  isPlaying: boolean;
  bookTitle: string | null;
  isAuthenticated?: boolean;
}

export interface ApiConfig {
  headers?: Record<string, string>;
}

export interface ApiResponse {
  data: any;
}

export interface WindowConfig {
  width: number;
  height: number;
  resizable: boolean;
  maximizable: boolean;
  alwaysOnTop: boolean;
}

export interface AppContext {
  mainWindow: BrowserWindow | null;
  isDev: boolean;
  isDebug: boolean;
}