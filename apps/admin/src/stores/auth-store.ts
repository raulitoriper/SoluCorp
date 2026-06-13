'use client';
import { create } from 'zustand';
import { api, UserInfo, LoginResponse } from '@solucorp/shared';

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  enabledModules: string[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  enabledModules: [],
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({
        user: data.user,
        token: data.access_token,
        enabledModules: data.enabledModules ?? [],
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
      throw new Error('Credenciales inválidas');
    }
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, token: null, enabledModules: [] });
    window.location.href = '/login';
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) set({ user: JSON.parse(userStr), token });
  },
}));
