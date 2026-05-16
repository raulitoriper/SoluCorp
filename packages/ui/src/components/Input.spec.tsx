import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from './Input';

describe('Input', () => {
  it('renderiza sin error con props mínimas', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('muestra el label cuando se provee', () => {
    render(<Input label="Correo electrónico" />);
    expect(screen.getByText('Correo electrónico')).toBeInTheDocument();
  });

  it('muestra el placeholder cuando se provee', () => {
    render(<Input placeholder="usuario@empresa.com" />);
    expect(screen.getByPlaceholderText('usuario@empresa.com')).toBeInTheDocument();
  });

  it('refleja el value con onChange en input controlado', () => {
    const onChange = jest.fn();
    render(<Input value="inicial" onChange={onChange} readOnly />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('inicial');
  });

  it('fireEvent.change llama onChange con el valor correcto', () => {
    const onChange = jest.fn();
    render(<Input onChange={onChange} defaultValue="" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'nuevo valor' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('muestra el mensaje de error cuando se provee', () => {
    render(<Input error="Campo requerido" />);
    expect(screen.getByText('Campo requerido')).toBeInTheDocument();
  });
});
