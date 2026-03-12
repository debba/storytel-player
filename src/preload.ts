import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Store API
contextBridge.exposeInMainWorld('electronStore', {
  get: (key: string): Promise<any> => ipcRenderer.invoke('store-get', key),
  remove: (key: string): Promise<void> => ipcRenderer.invoke('store-remove', key),
  set: (key: string, value: any): Promise<void> =>
    ipcRenderer.invoke('store-set', key, value),
});

// Locale API
contextBridge.exposeInMainWorld('electronLocale', {
  getLocale: (): Promise<string> => ipcRenderer.invoke('get-locale'),
  setLocale: (locale: string): Promise<boolean> => ipcRenderer.invoke('set-locale', locale),
});

// Window API
contextBridge.exposeInMainWorld('electronWindow', {
  setAlwaysOnTop: (alwaysOnTop: boolean): Promise<void> =>
    ipcRenderer.invoke('window-set-always-on-top', alwaysOnTop),
  isAlwaysOnTop: (): Promise<boolean> =>
    ipcRenderer.invoke('window-is-always-on-top'),
});

// Tray Controls API
contextBridge.exposeInMainWorld('trayControls', {
  onPlayPause: (callback: () => void): void => {
    ipcRenderer.on('tray-play-pause', callback);
  },
  onSetSpeed: (callback: (_event: IpcRendererEvent, speed: number) => void): void => {
    ipcRenderer.on('tray-set-speed', callback);
  },
  onLogout: (callback: () => void): void => {
    ipcRenderer.on('tray-logout', callback);
  },
  updatePlayingState: (isPlaying: boolean, bookTitle: string): void => {
    ipcRenderer.send('update-playing-state', { isPlaying, bookTitle });
  },
  updateAuthState: (isAuthenticated: boolean): void => {
    ipcRenderer.send('update-auth-state', { isAuthenticated });
  },
});

// Logs API
contextBridge.exposeInMainWorld('electronLogs', {
  openLogsFolder: (): Promise<void> => ipcRenderer.invoke('open-logs-folder'),
  onOpenLogsModal: (callback: () => void): void => {
    ipcRenderer.on('open-logs-modal', callback);
  },
});

// Electron API
interface ApiConfig {
  headers?: Record<string, string>;
}

contextBridge.exposeInMainWorld('electronApi', {
  get: (url: string, _: any, config?: ApiConfig): Promise<any> => ipcRenderer.invoke('api:get', url, config),
  post: (url: string, data: any, config?: ApiConfig): Promise<any> =>
    ipcRenderer.invoke('api:post', url, data, config),
  put: (url: string, data: any, config?: ApiConfig): Promise<any> =>
    ipcRenderer.invoke('api:put', url, data, config),
  delete: (url: string, _: any, config?: ApiConfig): Promise<any> =>
    ipcRenderer.invoke('api:delete', url, config),
});
