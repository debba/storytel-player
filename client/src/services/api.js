import storage from "../utils/storage";
import axios from "axios";

// Fallback axios client (quando NON sei in Electron)
const axiosApi = axios.create({
    baseURL: "http://localhost:3001/api", // o la tua baseURL reale
    withCredentials: true,
});

axiosApi.interceptors.request.use(async (config) => {
    const token = await storage.get("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const ipcApi = {
    async request(method, url, data = null, config = {}) {
        const token = await storage.get("token");
        if (!config.headers) config.headers = {};
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        console.log({config});

        return window.electronApi[method](`/api${url}`, data, config);
    },

    get(url, config) {
        return this.request("get", url, null, config);
    },
    post(url, data, config) {
        return this.request("post", url, data, config);
    },
    put(url, data, config) {
        return this.request("put", url, data, config);
    },
    delete(url, config) {
        return this.request("delete", url, null, config);
    },
};

const api = typeof window !== "undefined" && window.electronApi ? ipcApi : axiosApi;

export default api;
