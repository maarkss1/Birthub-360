/**
 * REVOPS-004 (onda 5): antes desta correção, a varredura automática de sexta às 19h nunca
 * aparecia nesta tela — só o resultado da última vez que alguém clicou manualmente. Estes testes
 * provam que a tela agora carrega o último resultado persistido (automático OU manual) ao montar,
 * e que rodar uma nova análise manual atualiza a fonte exibida corretamente.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render as rtlRender, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

import { WinLossAnalysis } from '@/features/analytics/components/WinLossAnalysis';

function render(ui: React.ReactElement) {
  return rtlRender(ui);
}

const EMPTY_DASHBOARD = { isEmpty: true, overview: {}, lostReasons: [] };

beforeEach(() => {
  vi.clearAllMocks();
  getMock.mockImplementation((url: string) => {
    if (url.startsWith('/api/analytics/dashboard')) return Promise.resolve(EMPTY_DASHBOARD);
    if (url === '/api/intelligence/win-loss-analysis/latest') {
      return Promise.resolve({ success: true, data: null });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('WinLossAnalysis', () => {
  it('sem resultado persistido ainda: mostra o card de introdução, sem chamar POST', async () => {
    render(<WinLossAnalysis />);

    await waitFor(() => expect(getMock).toHaveBeenCalledWith('/api/intelligence/win-loss-analysis/latest'));
    expect(await screen.findByText('Análise Inteligente de Ciclos Comerciais')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('REVOPS-004: carrega o resultado automático persistido ao montar, com o aviso correto', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/analytics/dashboard')) return Promise.resolve(EMPTY_DASHBOARD);
      if (url === '/api/intelligence/win-loss-analysis/latest') {
        return Promise.resolve({
          success: true,
          data: {
            id: 'r1',
            content: '1. Ganhos\nConteúdo A',
            source: 'WEEKLY_WIN_LOSS_AUTO',
            createdAt: '2026-09-11T19:00:00.000Z',
          },
        });
      }
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    render(<WinLossAnalysis />);

    expect(await screen.findByText('Ganhos')).toBeInTheDocument();
    expect(
      screen.getByText(/resultado da varredura automática de sexta às 19h/),
    ).toBeInTheDocument();
  });

  it('roda uma análise manual e persiste como WIN_LOSS_ON_DEMAND (mostra o aviso de resultado manual)', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({ analysis: '1. Tópico\nConteúdo manual', leadsAnalyzed: 3 });

    render(<WinLossAnalysis />);
    await waitFor(() => expect(getMock).toHaveBeenCalledWith('/api/intelligence/win-loss-analysis/latest'));

    await user.click(screen.getByRole('button', { name: /Gerar Análise Agora/ }));

    expect(await screen.findByText('Tópico')).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledWith('/api/intelligence/win-loss-analysis', {});
    expect(
      screen.getByText(/Resultado da última análise disparada manualmente/),
    ).toBeInTheDocument();
  });
});
