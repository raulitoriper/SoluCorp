import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal } from './Modal';

const noop = () => {};

describe('Modal', () => {
  it('no renderiza contenido cuando isOpen={false}', () => {
    render(
      <Modal isOpen={false} onClose={noop} title="Confirmar">
        <p>Contenido oculto</p>
      </Modal>
    );
    expect(screen.queryByText('Contenido oculto')).not.toBeInTheDocument();
    expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();
  });

  it('renderiza título y children cuando isOpen={true}', () => {
    render(
      <Modal isOpen={true} onClose={noop} title="Crear empresa">
        <p>Formulario de empresa</p>
      </Modal>
    );
    expect(screen.getByText('Crear empresa')).toBeInTheDocument();
    expect(screen.getByText('Formulario de empresa')).toBeInTheDocument();
  });

  it('llama onClose cuando se clickea el botón de cerrar', () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Contenido</p>
      </Modal>
    );
    // El botón de cierre contiene ×
    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
