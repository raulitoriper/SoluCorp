import { createApiClient } from './client';
import { StorageAdapter } from './storage-adapter';
import { InternalAxiosRequestConfig } from 'axios';

function makeFakeAdapter(token: string | null = null): StorageAdapter & { clearAuthCallCount: number } {
  const adapter = {
    clearAuthCallCount: 0,
    getToken: jest.fn(async () => token),
    setToken: jest.fn(async (_t: string) => {}),
    clearAuth: jest.fn(async () => {
      adapter.clearAuthCallCount++;
    }),
  };
  return adapter;
}

// Helper: retrieve the registered request interceptor fulfilled handler
function getRequestHandler(instance: ReturnType<typeof createApiClient>) {
  const mgr = (instance.interceptors.request as any);
  return mgr.handlers[0].fulfilled as (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig>;
}

// Helper: retrieve the registered response interceptor rejected handler
function getResponseRejectedHandler(instance: ReturnType<typeof createApiClient>) {
  const mgr = (instance.interceptors.response as any);
  return mgr.handlers[0].rejected as (error: unknown) => Promise<never>;
}

describe('createApiClient — interceptores', () => {
  describe('request interceptor', () => {
    it('adjunta el header Bearer cuando el adapter retorna un token', async () => {
      const adapter = makeFakeAdapter('tok');
      const instance = createApiClient('http://localhost', adapter);
      const handler = getRequestHandler(instance);

      const config = { headers: {} } as InternalAxiosRequestConfig;
      const result = await handler(config);

      expect(result.headers.Authorization).toBe('Bearer tok');
    });

    it('no agrega el header Authorization cuando el adapter retorna null', async () => {
      const adapter = makeFakeAdapter(null);
      const instance = createApiClient('http://localhost', adapter);
      const handler = getRequestHandler(instance);

      const config = { headers: {} } as InternalAxiosRequestConfig;
      const result = await handler(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor — error handler', () => {
    beforeEach(() => {
      // Stub window with a writable location.href for redirect assertions
      Object.defineProperty(globalThis, 'window', {
        value: { location: { href: '' } },
        configurable: true,
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        configurable: true,
        writable: true,
      });
    });

    it('401 → llama clearAuth y redirige a /login', async () => {
      const adapter = makeFakeAdapter();
      const instance = createApiClient('http://localhost', adapter);
      const handler = getResponseRejectedHandler(instance);

      await expect(handler({ response: { status: 401 } })).rejects.toBeDefined();

      expect(adapter.clearAuth).toHaveBeenCalledTimes(1);
      expect((globalThis as any).window.location.href).toBe('/login');
    });

    it('error no-401 (500) no llama clearAuth y propaga el error', async () => {
      const adapter = makeFakeAdapter();
      const instance = createApiClient('http://localhost', adapter);
      const handler = getResponseRejectedHandler(instance);

      const error = { response: { status: 500 } };
      await expect(handler(error)).rejects.toBe(error);

      expect(adapter.clearAuth).not.toHaveBeenCalled();
    });
  });
});
