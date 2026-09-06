import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { CopyButton } from '@/components/ui/CopyButton';
import { Toggle } from '@/components/ui/Toggle';
import { TiltCard } from '@/components/ui/TiltCard';
import { Dialog } from '@/components/ui/Dialog';

describe('Onda 2 — Microinteractions and System Components', () => {
  it('renders CopyButton and handles copy action', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CopyButton value="AtlasGR Enterprise" label="Copiar Token" />);
    const button = screen.getByRole('button', { name: /copiar token/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(writeTextMock).toHaveBeenCalledWith('AtlasGR Enterprise');
  });

  it('renders Toggle and toggles state on click and keyboard', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Toggle checked={false} onChange={onChange} label="Ativar Alertas" />);
    
    const toggle = screen.getByRole('switch', { name: /ativar alertas/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);

    // Keyboard Space & Enter
    fireEvent.keyDown(toggle, { key: ' ' });
    expect(onChange).toHaveBeenCalledWith(true);

    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(<Toggle checked={true} onChange={onChange} label="Ativar Alertas" />);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('renders TiltCard with children', () => {
    render(
      <TiltCard className="test-card">
        <div>Conteudo do Card</div>
      </TiltCard>
    );
    expect(screen.getByText('Conteudo do Card')).toBeInTheDocument();
  });

  it('renders Dialog when open and handles close action', () => {
    const onClose = vi.fn();
    HTMLDialogElement.prototype.showModal = function mockShowModal() {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function mockClose() {
      this.removeAttribute('open');
    };

    render(
      <Dialog isOpen={true} onClose={onClose} title="Modal de Teste">
        <div>Corpo do modal</div>
      </Dialog>
    );

    expect(screen.getByText('Modal de Teste')).toBeInTheDocument();
    expect(screen.getByText('Corpo do modal')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /fechar/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
