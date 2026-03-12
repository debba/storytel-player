import storage from "./storage";
import axios, {AxiosInstance, AxiosRequestConfig} from "axios";

declare global {
    interface Window {
        electronApi?: any;
    }
}

const axiosApi = axios.create({
    baseURL: `${import.meta.env.VITE_BACKEND_API_URL}/api`, // o la tua baseURL reale
    withCredentials: true,
    timeout: 30000
});

axiosApi.interceptors.request.use(async (config) => {
    const token = await storage.get("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosApi.interceptors.response.use(
    (response) => response,
    (error) => {
        const hadToken = !!error.config?.headers?.Authorization;
        if (error.response?.status === 401 && hadToken && !error.config?.url?.includes('/login')) {
            window.dispatchEvent(new Event('unauthorized'));
        }
        return Promise.reject(error);
    }
);

const api: AxiosInstance = new Proxy(axiosApi, {
    get(target, prop: string) {
        if (!window.electronApi) return (target as any)[prop];

        if (["get", "post", "put", "delete", "request"].includes(prop)) {
            return async (url: string, dataOrConfig?: any, config?: AxiosRequestConfig) => {
                const token = await storage.get("token");
                const headers = { ...(config?.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
                const data = prop === "get" || prop === "delete" ? null : dataOrConfig;
                const finalConfig = { ...config, headers };
                return window.electronApi[prop](`/api${url}`, data, finalConfig).then((result: any) => {
                    if (result?.__isError) {
                        const hadToken = !!finalConfig.headers?.Authorization;
                        if (result.statusCode === 401 && hadToken && !url.includes('/login')) {
                            window.dispatchEvent(new Event('unauthorized'));
                        }
                        const err: any = new Error(result.error);
                        err.response = { status: result.statusCode, data: result.data };
                        return Promise.reject(err);
                    }
                    return result;
                }).catch((error: any) => {
                    // Fallback for unexpected IPC/network errors
                    const hadToken = !!finalConfig.headers?.Authorization;
                    const status = error?.response?.status ?? error?.status ?? error?.statusCode;
                    if (status === 401 && hadToken && !url.includes('/login')) {
                        window.dispatchEvent(new Event('unauthorized'));
                    }
                    return Promise.reject(error);
                });
            };
        }

        return (target as any)[prop];
    },
});

export default api;


export const trackAction = async (message: string, data?: any) => {
    try {
        await api.post('/logs/action', { message, data });
    } catch (e) {
        // Silently ignore tracking errors
        console.error('Failed to track action', e);
    }
};
