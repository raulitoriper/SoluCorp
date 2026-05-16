import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza el texto del children', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByText('Guardar')).toBeInTheDocument();
  });

  it('disabled={true} deja el botón deshabilitado y no llama onClick', () => {
    const onClick = jest.fn();
    render(<Button disabled onClick={onClick}>Acción</Button>);
    const btn = screen.getByRole('button', { name: 'Acción' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading={true} también deshabilita el botón', () => {
    render(<Button loading>Cargando</Button>);
    const btn = screen.getByRole('button', { name: /cargando/i });
    expect(btn).toBeDisabled();
  });

  it('llama onClick cuando no está deshabilitado', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Click' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renderiza con variante secondary sin error', () => {
    render(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });
});
