import { useAuthStore } from './auth-store';
import { api } from '@solucorp/shared';

// Mock the shared api module
jest.mock('@solucorp/shared', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

// Helper to reset Zustand store state between tests
const resetStore = () => {
  useAuthStore.setState({
    user: null,
    token: null,
    enabledModules: [],
    isLoading: false,
  });
};

const mockUser = {
  id: '1',
  email: 'admin@empresa.com',
  firstName: 'Admin',
  lastName: 'Empresa',
  role: 'COMPANY_ADMIN' as const,
  companyId: 'comp-1',
  companyName: 'Empresa S.A.',
};

const mockLoginResponse = {
  access_token: 'token-access-123',
  refresh_token: 'token-refresh-456',
  user: mockUser,
  enabledModules: ['VISITAS', 'PEDIDOS'],
  config: {
    gpsTrackingIntervalMs: 30000,
    timezone: 'America/Asuncion',
    currency: 'PYG',
  },
};

describe('auth-store', () => {
  beforeEach(() => {
    resetStore();
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('login exitoso: guarda user, token y localStorage', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockLoginResponse });

      await useAuthStore.getState().login('admin@empresa.com', 'password123');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('token-access-123');
      expect(state.isLoading).toBe(false);
      expect(localStorage.getItem('access_token')).toBe('token-access-123');
      expect(localStorage.getItem('refresh_token')).toBe('token-refresh-456');
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser);
    });

    it('login fallido: lanza error con mensaje "Credenciales inválidas"', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(
        useAuthStore.getState().login('wrong@email.com', 'wrongpass'),
      ).rejects.toThrow('Credenciales inválidas');

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    // jsdom 26 does not support window.location.href assignment in a way that
    // allows assertion (navigation is "not implemented"). We verify state and
    // storage cleanup; the redirect to /login is covered at integration level.
    it('limpia el estado del store y localStorage', () => {
      useAuthStore.setState({ user: mockUser, token: 'token-access-123' });
      localStorage.setItem('access_token', 'token-access-123');
      localStorage.setItem('user', JSON.stringify(mockUser));

      // Suppress jsdom "Not implemented: navigation" warning during this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(localStorage.length).toBe(0);

      consoleError.mockRestore();
    });
  });

  describe('loadFromStorage', () => {
    it('rehidrata user y token cuando existen en localStorage', () => {
      localStorage.setItem('access_token', 'token-access-123');
      localStorage.setItem('user', JSON.stringify(mockUser));

      useAuthStore.getState().loadFromStorage();

      const state = useAuthStore.getState();
      expect(state.token).toBe('token-access-123');
      expect(state.user).toEqual(mockUser);
    });

    it('no modifica el estado cuando localStorage está vacío', () => {
      useAuthStore.getState().loadFromStorage();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
    });
  });
});
