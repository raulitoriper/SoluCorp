'use client';
import { create } from 'zustand';
import api from '@/lib/api';

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
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.access_token, isLoading: false });
    } catch {
      set({ isLoading: false });
      throw new Error('Credenciales inválidas');
    }
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) set({ user: JSON.parse(userStr), token });
  },
}));
