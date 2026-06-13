import axios from 'axios';
import { StorageAdapter, localStorageAdapter } from './storage-adapter';

export function createApiClient(baseURL: string, storage: StorageAdapter = localStorageAdapter) {
  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  // Interceptor: add JWT token to requests (async to support any StorageAdapter)
  instance.interceptors.request.use(async (config) => {
    const token = await storage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Interceptor: handle 401 → clear auth data and redirect to login
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        await storage.clearAuth();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

// Default instance for web portals — uses localStorageAdapter by default
export const api = createApiClient(
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:3001/api',
);
