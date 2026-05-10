import axios from 'axios';

export function createApiClient(baseURL: string) {
  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  // Interceptor: agregar JWT + Tenant ID
  instance.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;

      const tenantId = localStorage.getItem('tenant_id');
      if (tenantId) config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
  });

  // Interceptor: manejar 401 → redirigir a login
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('tenant_id');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

// Instancia por defecto para portales web
export const api = createApiClient(
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:3001/api',
);
