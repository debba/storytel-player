import storage from "./storage";
import axios, {AxiosInstance, AxiosRequestConfig} from "axios";

declare global {
    interface Window {
        electronApi?: any;
    }
}

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

const api: AxiosInstance = new Proxy(axiosApi, {
    get(target, prop: string) {
        if (!window.electronApi) return (target as any)[prop];

        if (["get", "post", "put", "delete", "request"].includes(prop)) {
            return async (url: string, dataOrConfig?: any, config?: AxiosRequestConfig) => {
                const token = await storage.get("token");
                const headers = { ...(config?.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
                const data = prop === "get" || prop === "delete" ? null : dataOrConfig;
                const finalConfig = { ...config, headers };
                return window.electronApi[prop](`/api${url}`, data, finalConfig);
            };
        }

        return (target as any)[prop];
    },
});

export default api;
