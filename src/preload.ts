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
});

// Tray Controls API
contextBridge.exposeInMainWorld('trayControls', {
  onPlayPause: (callback: () => void): void => {
    ipcRenderer.on('tray-play-pause', callback);
  },
  onSetSpeed: (callback: (_event: IpcRendererEvent, speed: number) => void): void => {
    ipcRenderer.on('tray-set-speed', callback);
  },
  updatePlayingState: (isPlaying: boolean, bookTitle: string): void => {
    ipcRenderer.send('update-playing-state', { isPlaying, bookTitle });
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
