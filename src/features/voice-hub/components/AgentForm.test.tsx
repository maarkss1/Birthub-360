// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AgentForm } from './AgentForm';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

function renderAgentForm() {
  return render(
    <MemoryRouter>
      <AgentForm />
    </MemoryRouter>
  );
}

describe('AgentForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders without crashing with default field values', () => {
    renderAgentForm();

    expect(screen.getByText('Escolha um Ponto de Partida')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Novo Agente Virtual')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar e configurar agente/i })).toBeInTheDocument();
  });

  it('selecting a template card updates the name and description fields', async () => {
    const user = userEvent.setup();
    renderAgentForm();

    await user.click(screen.getByText('SDR (Vendas)'));

    expect(screen.getByDisplayValue('SDR Virtual')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Qualificação rápida e prospecção ativa de leads inbound/outbound.')
    ).toBeInTheDocument();
  });

  it('submits the form and navigates to the new agent editor on success', async () => {
    const user = userEvent.setup();
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ agent: { id: 'agent-123' } })
    });

    renderAgentForm();
    await user.click(screen.getByRole('button', { name: /criar e configurar agente/i }));

    expect(fetch).toHaveBeenCalledWith(
      '/api/agents',
      expect.objectContaining({ method: 'POST' })
    );
    expect(await screen.findByText(/inicializando/i)).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/agents/agent-123');
    });
  });

  it('shows a dismissible error message instead of navigating when the API call fails', async () => {
    const user = userEvent.setup();
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Nome do agente é obrigatório.' })
    });

    renderAgentForm();
    await user.click(screen.getByRole('button', { name: /criar e configurar agente/i }));

    expect(await screen.findByText('Nome do agente é obrigatório.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    // Dismissing the error clears it from the DOM.
    const dismissButton = screen.getByText('Nome do agente é obrigatório.').nextElementSibling as HTMLElement;
    await user.click(dismissButton);
    expect(screen.queryByText('Nome do agente é obrigatório.')).not.toBeInTheDocument();
  });
});
