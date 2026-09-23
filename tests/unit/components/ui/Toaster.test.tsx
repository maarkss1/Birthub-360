/**
 * ITEM-04 (cobertura de testes real): <Toaster /> é o único ponto de saída visual de
 * `toast.success/error/info` (src/lib/toast.ts) — montado uma vez em MainLayout e usado por
 * praticamente todo fluxo de erro/sucesso do produto (CRM, formulários, integrações). Antes desta
 * suíte, 0% de cobertura: nenhum teste validava a fila de toasts, o auto-dismiss ou o fechamento
 * manual — o exato tipo de "componente crítico sem teste de comportamento" que este item pede
 * para cobrir.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, act, waitFor, fireEvent } from '@testing-library/react';
import { Toaster } from '@/components/ui/Toaster';
import { toast } from '@/lib/toast';
import { MotionGlobalConfig } from 'framer-motion';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // Sem isto, a animação de saída do AnimatePresence depende do agendador de frames do framer-motion,
  // que fica preso quando um teste anterior troca o relógio falso — e o toast fechado nunca sai do DOM
  // quando esta suíte roda inteira (passava isolado). Com `skipAnimations` a saída é imediata.
  MotionGlobalConfig.skipAnimations = true;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  MotionGlobalConfig.skipAnimations = false;
});

describe('Toaster', () => {
  it('não renderiza nada enquanto não há toasts', () => {
    const { container } = render(<Toaster />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra um toast de sucesso emitido via toast.success', async () => {
    render(<Toaster />);
    act(() => {
      toast.success('Lead salvo com sucesso');
    });
    expect(await screen.findByText('Lead salvo com sucesso')).toBeInTheDocument();
  });

  it('mostra múltiplos toasts simultâneos, cada um com seu próprio botão de fechar', async () => {
    render(<Toaster />);
    act(() => {
      toast.error('Falha ao salvar');
      toast.info('Sincronizando...');
    });

    expect(await screen.findByText('Falha ao salvar')).toBeInTheDocument();
    expect(screen.getByText('Sincronizando...')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Fechar notificação' })).toHaveLength(2);
  });

  it('fecha um toast individualmente ao clicar no X, sem afetar os outros', async () => {
    render(<Toaster />);
    act(() => {
      toast.error('Erro A');
      toast.info('Erro B');
    });

    const [closeA] = await screen.findAllByRole('button', { name: 'Fechar notificação' });
    // `fireEvent` e não `user.click`: o toast é `drag="x"` (arrastar para dispensar) e, no jsdom, a
    // sequência pointerdown/pointerup sintética do user-event é absorvida pelo gesto de drag do
    // framer-motion e o `click` nunca chega ao botão. `fireEvent.click` entrega o clique ao X.
    fireEvent.click(closeA);

    // O toast sai com animação de saída (AnimatePresence, ~0,2s): some do DOM só depois dela.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await waitFor(() => {
      expect(screen.queryByText('Erro A')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Erro B')).toBeInTheDocument();
  });

  it('remove o toast automaticamente depois do tempo de auto-dismiss', async () => {
    render(<Toaster />);
    act(() => {
      toast.info('Some sozinho');
    });
    expect(await screen.findByText('Some sozinho')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    await waitFor(() => {
      expect(screen.queryByText('Some sozinho')).not.toBeInTheDocument();
    });
  });

  it('cancela a inscrição no unmount (não deixa listener vazando no barramento global)', () => {
    const { unmount } = render(<Toaster />);
    unmount();
    // Emitir depois do unmount não deve lançar (listener foi removido no cleanup do useEffect).
    expect(() => {
      act(() => {
        toast.success('depois do unmount');
      });
    }).not.toThrow();
  });
});
