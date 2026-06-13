export interface StorageAdapter {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  clearAuth(): Promise<void>;
}

// Definitive list of auth keys managed by auth-store — clearAuth removes exactly these
const AUTH_KEYS = ['access_token', 'refresh_token', 'user'] as const;

export const localStorageAdapter: StorageAdapter = {
  getToken: () =>
    Promise.resolve(
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
    ),
  setToken: (token) => {
    if (typeof window !== 'undefined') localStorage.setItem('access_token', token);
    return Promise.resolve();
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
    }
    return Promise.resolve();
  },
};
