import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card, StatCard } from './Card';

describe('Card', () => {
  it('renderiza sin error con children', () => {
    render(<Card>Contenido de tarjeta</Card>);
    expect(screen.getByText('Contenido de tarjeta')).toBeInTheDocument();
  });

  it('renderiza children complejos', () => {
    render(
      <Card>
        <h2>Título</h2>
        <p>Descripción</p>
      </Card>
    );
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Descripción')).toBeInTheDocument();
  });

  it('acepta className adicional sin romper render', () => {
    render(<Card className="mt-4">Hola</Card>);
    expect(screen.getByText('Hola')).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('renderiza title y value', () => {
    render(<StatCard title="Visitas hoy" value={42} />);
    expect(screen.getByText('Visitas hoy')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renderiza subtitle cuando se provee', () => {
    render(<StatCard title="Pedidos" value="128" subtitle="Último mes" />);
    expect(screen.getByText('Último mes')).toBeInTheDocument();
  });

  it('no renderiza subtitle cuando no se provee', () => {
    render(<StatCard title="GPS" value={0} />);
    expect(screen.queryByText('Último mes')).not.toBeInTheDocument();
  });
});
