import { localStorageAdapter } from './storage-adapter';

// Map-based localStorage mock
function makeLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    _store: store,
  };
}

describe('localStorageAdapter', () => {
  let mockStorage: ReturnType<typeof makeLocalStorageMock>;

  beforeEach(() => {
    mockStorage = makeLocalStorageMock();
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: mockStorage },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    // Remove window and localStorage stubs to restore Node default state
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  describe('getToken', () => {
    it('retorna el token cuando existe access_token en el storage', async () => {
      mockStorage.setItem('access_token', 'tok');
      const result = await localStorageAdapter.getToken();
      expect(result).toBe('tok');
    });

    it('retorna null cuando no hay access_token en el storage', async () => {
      const result = await localStorageAdapter.getToken();
      expect(result).toBeNull();
    });
  });

  describe('guard SSR — entorno sin window', () => {
    beforeEach(() => {
      // Remove the window stub to simulate pure Node/SSR environment
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'localStorage', {
        value: undefined,
        configurable: true,
        writable: true,
      });
    });

    it('getToken en SSR retorna null sin lanzar error', async () => {
      await expect(localStorageAdapter.getToken()).resolves.toBeNull();
    });

    it('clearAuth en SSR es no-op y completa sin error', async () => {
      await expect(localStorageAdapter.clearAuth()).resolves.toBeUndefined();
    });
  });

  describe('clearAuth', () => {
    it('elimina exactamente las claves de auth y preserva claves no-auth', async () => {
      mockStorage.setItem('access_token', 'tok');
      mockStorage.setItem('refresh_token', 'ref');
      mockStorage.setItem('user', JSON.stringify({ id: 1 }));
      mockStorage.setItem('pref_theme', 'dark');

      await localStorageAdapter.clearAuth();

      expect(mockStorage.getItem('access_token')).toBeNull();
      expect(mockStorage.getItem('refresh_token')).toBeNull();
      expect(mockStorage.getItem('user')).toBeNull();
      // Non-auth key must survive
      expect(mockStorage.getItem('pref_theme')).toBe('dark');
    });
  });
});
