// storage.js
let isElectron = false;

try {
    isElectron = 'electronStore' in window
} catch (e) {
    isElectron = false;
}

let storage;

if (isElectron) {
    storage = {
        get: async (key) => await window.electronStore.get(key),
        set: async (key, value) => await window.electronStore.set(key, value),
        remove: async (key) => await window.electronStore.remove(key),
    };
} else {
    storage = {
        get: async (key) => {
            return localStorage.getItem(key);
        },
        set: async (key, value) => {
            localStorage.setItem(key, value);
        },
        remove: async (key) => {
            localStorage.removeItem(key);
        },
    };
}

export default storage;
