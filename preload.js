const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronStore', {
    get: (key) => ipcRenderer.invoke('store-get', key),
    remove: (key) => ipcRenderer.invoke('store-remove', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
});
