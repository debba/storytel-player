const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronStore', {
    get: (key) => ipcRenderer.invoke('store-get', key),
    remove: (key) => ipcRenderer.invoke('store-remove', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
});

contextBridge.exposeInMainWorld('trayControls', {
    onPlayPause: (callback) => ipcRenderer.on('tray-play-pause', callback),
    onSetSpeed: (callback) => ipcRenderer.on('tray-set-speed', callback),
    updatePlayingState: (isPlaying, bookTitle) => ipcRenderer.send('update-playing-state', { isPlaying, bookTitle }),
});

contextBridge.exposeInMainWorld('electronApi', {
    get: (url, data, config) => ipcRenderer.invoke('api:get', url, config),
    post: (url, data, config) => ipcRenderer.invoke('api:post', url, data, config),
    put: (url, data, config) => ipcRenderer.invoke('api:put', url, data, config),
    delete: (url, data,  config) => ipcRenderer.invoke('api:delete', url, config)
});
