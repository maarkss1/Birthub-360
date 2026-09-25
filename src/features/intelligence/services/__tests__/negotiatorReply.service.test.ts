import { beforeEach, describe, expect, it, vi } from 'vitest';

const whatsAppFindFirstMock = vi.fn();
const whatsAppFindManyMock = vi.fn();
const agentRunMock = vi.fn();
const playbookInvokeMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    whatsAppMessage: {
      findFirst: (...args: unknown[]) => whatsAppFindFirstMock(...args),
      findMany: (...args: unknown[]) => whatsAppFindManyMock(...args),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../agents/negotiatorDraft.agent.js', () => ({
  NegotiatorDraftAgent: vi.fn().mockImplementation(function NegotiatorDraftAgent(this: {
    run: (...args: unknown[]) => unknown;
  }) {
    this.run = (...args: unknown[]) => agentRunMock(...args);
  }),
}));

vi.mock('../../tools/playbookTool.js', () => ({
  searchPlaybookTool: { invoke: (...args: unknown[]) => playbookInvokeMock(...args) },
}));

import { draftNegotiatorReply } from '../negotiatorReply.service.js';

const baseContext = {
  leadId: 'lead-1',
  organizationId: 'org-1',
  conversationSignalId: 'signal-1',
  intent: 'objecao_preco' as const,
  urgency: 'alta' as const,
  objections: ['preço alto'],
  summary: 'Lead achou o valor alto e pediu desconto.',
  leadFacts: 'Lead lead-1; status Proposta_Enviada; score 82.',
};

beforeEach(() => {
  vi.clearAllMocks();
  whatsAppFindManyMock.mockResolvedValue([]);
  playbookInvokeMock.mockResolvedValue('Nenhum trecho relevante encontrado.');
});

describe('draftNegotiatorReply', () => {
  it('retorna null quando não há mensagem WhatsApp inbound rastreável — nunca inventa destinatário', async () => {
    whatsAppFindFirstMock.mockResolvedValue(null);

    const result = await draftNegotiatorReply(baseContext);

    expect(result).toBeNull();
    expect(agentRunMock).not.toHaveBeenCalled();
  });

  it('gera a réplica com o número da última mensagem inbound quando o agente responde', async () => {
    whatsAppFindFirstMock.mockResolvedValue({ phoneE164: '+5511999998888' });
    agentRunMock.mockResolvedValue({ reply: 'Oi! Já te confirmo o valor certinho.' });

    const result = await draftNegotiatorReply(baseContext);

    expect(result).toEqual({
      to: '+5511999998888',
      body: 'Oi! Já te confirmo o valor certinho.',
    });
    expect(agentRunMock).toHaveBeenCalledWith(
      expect.stringContaining('Lead lead-1'),
      'negotiator-lead-1-signal-1',
    );
  });

  it('retorna null quando o agente falha, em vez de propor uma mensagem vazia ou fabricada', async () => {
    whatsAppFindFirstMock.mockResolvedValue({ phoneE164: '+5511999998888' });
    agentRunMock.mockResolvedValue({ error: 'orçamento de IA excedido' });

    const result = await draftNegotiatorReply(baseContext);

    expect(result).toBeNull();
  });

  it('retorna null quando o agente responde vazio', async () => {
    whatsAppFindFirstMock.mockResolvedValue({ phoneE164: '+5511999998888' });
    agentRunMock.mockResolvedValue({ reply: '   ' });

    const result = await draftNegotiatorReply(baseContext);

    expect(result).toBeNull();
  });

  it('segue sem o playbook quando a busca falha, em vez de derrubar a geração da réplica', async () => {
    whatsAppFindFirstMock.mockResolvedValue({ phoneE164: '+5511999998888' });
    playbookInvokeMock.mockRejectedValue(new Error('vetor indisponível'));
    agentRunMock.mockResolvedValue({ reply: 'Segue sem playbook.' });

    const result = await draftNegotiatorReply(baseContext);

    expect(result).toEqual({ to: '+5511999998888', body: 'Segue sem playbook.' });
  });
});
