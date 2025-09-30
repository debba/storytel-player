declare global {
    interface Window {
        electronStore?: StorageType;
    }
}

import {StorageType} from "../interfaces/helper";

let isElectron = false;

try {
    isElectron = !!window.electronStore
} catch (e) {
    isElectron = false;
}

let storage : StorageType;

if (isElectron) {
    storage = {
        get: async (key : string ) => await window.electronStore!.get(key),
        set: async (key : string, value : any) => await window.electronStore!.set(key, value),
        remove: async (key : any) => await window.electronStore!.remove(key),
    };
} else {
    storage = {
        get: async (key: string) => {
            return localStorage.getItem(key);
        },
        set: async (key: string, value: any) => {
            return localStorage.setItem(key, value);
        },
        remove: async (key: any) => {
            return localStorage.removeItem(key);
        },
    };
}

export default storage;
