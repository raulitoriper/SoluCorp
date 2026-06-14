import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ReportPage from './ReportPage';
import { api } from '@solucorp/shared';

// Mock the shared api module
jest.mock('@solucorp/shared', () => ({
  api: {
    get: jest.fn(),
  },
}));

// Mock AppLayout to avoid the AuthGuard → Sidebar → next/link → usePathname chain
jest.mock('./layout/AppLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

const mockedApi = api as jest.Mocked<typeof api>;

const defaultColumns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Nombre' },
  { key: 'status', label: 'Estado' },
];

const defaultProps = {
  title: 'Reporte de Visitas',
  endpoint: '/reports/visits',
  columns: defaultColumns,
};

describe('ReportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza las columnas esperadas en el encabezado de la tabla', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });

    render(<ReportPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Nombre')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
    });
  });

  it('muestra "Cargando..." mientras la carga está pendiente', () => {
    // Never resolve so the component stays in loading state
    mockedApi.get.mockReturnValueOnce(new Promise(() => undefined));

    render(<ReportPage {...defaultProps} />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('muestra "Sin datos" cuando la respuesta es un array vacío', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });

    render(<ReportPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Sin datos')).toBeInTheDocument();
    });
  });

  it('invoca api.get con el endpoint y los params correctos', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });

    render(<ReportPage {...defaultProps} />);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/reports/visits', { params: {} });
    });
  });

  it('el botón de exportar está deshabilitado cuando no hay datos', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });

    render(<ReportPage {...defaultProps} />);

    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /exportar csv/i });
      expect(exportButton).toBeDisabled();
    });
  });
});
