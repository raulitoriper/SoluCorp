import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string | null;
  companyName: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  enabledModules: string[];
  isLoading: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

async function secureGet(key: string): Promise<string | null> {
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}

async function secureSet(key: string, value: string): Promise<void> {
  try { await SecureStore.setItemAsync(key, value); } catch {}
}

async function secureDel(key: string): Promise<void> {
  try { await SecureStore.deleteItemAsync(key); } catch {}
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  enabledModules: [],
  isLoading: false,
  isReady: false,

  login: async (email, password) => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/login', { email, password });
    await secureSet('access_token', data.access_token);
    await secureSet('refresh_token', data.refresh_token);
    await secureSet('user', JSON.stringify(data.user));
    await secureSet('enabled_modules', JSON.stringify(data.enabledModules));
    set({ user: data.user, token: data.access_token, enabledModules: data.enabledModules, isLoading: false });
  },

  logout: async () => {
    await secureDel('access_token');
    await secureDel('refresh_token');
    await secureDel('user');
    await secureDel('enabled_modules');
    set({ user: null, token: null, enabledModules: [] });
  },

  loadFromStorage: async () => {
    try {
      const token = await secureGet('access_token');
      const userStr = await secureGet('user');
      const modulesStr = await secureGet('enabled_modules');
      if (token && userStr) {
        set({ user: JSON.parse(userStr), token, enabledModules: modulesStr ? JSON.parse(modulesStr) : [], isReady: true });
      } else {
        set({ isReady: true });
      }
    } catch {
      set({ isReady: true });
    }
  },
}));
