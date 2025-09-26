import axios from 'axios';
import storage from "../utils/storage";

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const token =await storage.get('token');
  console.log("TOKEN =", token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
