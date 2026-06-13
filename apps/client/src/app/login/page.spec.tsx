import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';
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

// The LoginPage uses bare <label> elements without htmlFor — no programmatic
// association with inputs. We query the email field by placeholder and the
// password field by its input type via the rendered container.

describe('LoginPage', () => {
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
  });

  it('submit llama login con email y password, luego router.push("/dashboard")', async () => {
    const mockLogin = jest.fn().mockResolvedValueOnce(undefined);
    mockedUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthStore>);

    const { container } = render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('admin@empresa.com.py'), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(container.querySelector('input[type="password"]')!, {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /ingresar/i }).closest('form')!);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'password123');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('cuando login lanza error, muestra el mensaje de error en el formulario', async () => {
    const mockLogin = jest.fn().mockRejectedValueOnce(new Error('Credenciales inválidas'));
    mockedUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthStore>);

    const { container } = render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('admin@empresa.com.py'), {
      target: { value: 'wrong@test.com' },
    });
    fireEvent.change(container.querySelector('input[type="password"]')!, {
      target: { value: 'wrongpass' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /ingresar/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Email o contraseña incorrectos')).toBeInTheDocument();
    });
  });

  it('el botón submit está deshabilitado cuando isLoading es true', () => {
    mockedUseAuthStore.mockReturnValue({
      login: jest.fn(),
      isLoading: true,
    } as unknown as ReturnType<typeof useAuthStore>);

    render(<LoginPage />);

    expect(screen.getByRole('button', { name: /ingresando\.\.\./i })).toBeDisabled();
  });
});
