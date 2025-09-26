const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronStore', {
    get: (key) => ipcRenderer.invoke('store-get', key),
    remove: (key) => ipcRenderer.invoke('store-remove', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
});

contextBridge.exposeInMainWorld('trayControls', {
    onPlayPause: (callback) => ipcRenderer.on('tray-play-pause', callback),
    onSetSpeed: (callback) => ipcRenderer.on('tray-set-speed', callback),
});
