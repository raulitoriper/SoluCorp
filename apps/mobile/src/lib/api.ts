import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detectar URL del backend automáticamente:
// - Emulador Android: 10.0.2.2
// - Dispositivo físico: usar IP del servidor Expo (debuggerHost)
// - iOS simulator: localhost
function getApiUrl(): string {
  if (__DEV__) {
    // En desarrollo, obtener IP del servidor Expo
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (debuggerHost) {
      return `http://${debuggerHost}:3001/api`;
    }
    // Fallback para emulador Android
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3001/api';
    }
  }
  return 'http://localhost:3001/api';
}

const api = axios.create({
  baseURL: getApiUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('user');
    }
    return Promise.reject(error);
  },
);

export default api;
