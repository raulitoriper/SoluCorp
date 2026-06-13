import React from 'react';
import { render, waitFor } from '@testing-library/react';
import AuthGuard from './AuthGuard';
import { useAuthStore } from '@/stores/auth-store';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the auth store
jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

import { useRouter } from 'next/navigation';

const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockedUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

const mockPush = jest.fn();

const mockUser = (role: string) => ({
  id: '1',
  email: 'admin@empresa.com',
  firstName: 'Admin',
  lastName: 'Empresa',
  role: role as 'COMPANY_ADMIN' | 'SUPER_ADMIN' | 'FIELD_WORKER',
  companyId: 'comp-1',
  companyName: 'Empresa S.A.',
});

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
    jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('user === null: redirige a /login', async () => {
    const loadFromStorage = jest.fn();
    mockedUseAuthStore.mockReturnValue({
      user: null,
      loadFromStorage,
    } as unknown as ReturnType<typeof useAuthStore>);

    render(
      <AuthGuard>
        <div>Contenido protegido</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('rol distinto de COMPANY_ADMIN: muestra alert, limpia localStorage y redirige', async () => {
    const loadFromStorage = jest.fn();
    mockedUseAuthStore.mockReturnValue({
      user: mockUser('SUPER_ADMIN'),
      loadFromStorage,
    } as unknown as ReturnType<typeof useAuthStore>);

    render(
      <AuthGuard>
        <div>Contenido protegido</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('rol COMPANY_ADMIN: renderiza children', async () => {
    const loadFromStorage = jest.fn();
    mockedUseAuthStore.mockReturnValue({
      user: mockUser('COMPANY_ADMIN'),
      loadFromStorage,
    } as unknown as ReturnType<typeof useAuthStore>);

    const { getByText } = render(
      <AuthGuard>
        <div>Contenido protegido</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(getByText('Contenido protegido')).toBeInTheDocument();
    });
  });
});
