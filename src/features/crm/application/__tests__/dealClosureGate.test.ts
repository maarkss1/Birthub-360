import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../../shared/middlewares/errorHandler';
import { ensureManualDealClosureAllowed, type DealClosureEvidencePort } from '../dealClosureGate';

/**
 * CYC-007 — gate que decide se um lead pode mesmo ser movido para "Negócios Ganhos". A regra de
 * negócio central: só uma confirmação humana real (evidenciada por uma Note criada de fato) pode
 * fechar um negócio; qualquer `actorUserId` com cara de IA/automação (ai-, agent-, swarm-,
 * closer-, bot-) é rejeitado ANTES de criar qualquer evidência (ver comentário de
 * `ensureManualDealClosureAllowed` em dealClosureGate.ts).
 */
function makePort(overrides?: Partial<DealClosureEvidencePort>): DealClosureEvidencePort & {
  createConfirmationNote: ReturnType<typeof vi.fn>;
  saveDealClosureEvent: ReturnType<typeof vi.fn>;
} {
  return {
    createConfirmationNote: vi.fn().mockResolvedValue({ id: 'note-1' }),
    saveDealClosureEvent: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as DealClosureEvidencePort & {
    createConfirmationNote: ReturnType<typeof vi.fn>;
    saveDealClosureEvent: ReturnType<typeof vi.fn>;
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ensureManualDealClosureAllowed', () => {
  it('confirmação manual de um humano real: cria a nota e salva o DealClosureEvent aceito', async () => {
    const port = makePort();

    await ensureManualDealClosureAllowed(port, {
      organizationId: 'org-1',
      leadId: 'lead-1',
      actorUserId: 'user-42',
    });

    expect(port.createConfirmationNote).toHaveBeenCalledWith({
      organizationId: 'org-1',
      leadId: 'lead-1',
      authorUserId: 'user-42',
    });
    expect(port.saveDealClosureEvent).toHaveBeenCalledTimes(1);
    const [event] = port.saveDealClosureEvent.mock.calls[0];
    expect(event).toMatchObject({
      organizationId: 'org-1',
      leadId: 'lead-1',
      type: 'manual_crm_confirmation',
      evidenceRef: 'note-1',
      triggeredBy: 'user-42',
    });
    expect(event.id).toEqual(expect.any(String));
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it.each(['ai-agente1', 'agent:closer', 'swarm-04', 'closer_bot', 'bot-13'])(
    'rejeita um actorUserId sintético (%s) com 403 antes de criar qualquer evidência',
    async (actorUserId) => {
      const port = makePort();

      await expect(
        ensureManualDealClosureAllowed(port, {
          organizationId: 'org-1',
          leadId: 'lead-1',
          actorUserId,
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('untrusted-trigger'),
      });

      // Nenhuma nota falsa de "confirmação manual" deve ser criada quando o gate rejeita —
      // é exatamente o que o comentário do código documenta como o motivo do pré-check rodar antes.
      expect(port.createConfirmationNote).not.toHaveBeenCalled();
      expect(port.saveDealClosureEvent).not.toHaveBeenCalled();
    },
  );

  it('rejeita actorUserId vazio/em branco sem tentar criar evidência', async () => {
    const port = makePort();

    await expect(
      ensureManualDealClosureAllowed(port, {
        organizationId: 'org-1',
        leadId: 'lead-1',
        actorUserId: '   ',
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(port.createConfirmationNote).not.toHaveBeenCalled();
  });

  it('se a nota criada pelo port vier sem id válido, rejeita mesmo após criar a nota (evidência ausente)', async () => {
    // Caso defensivo: o preflight só valida o actorUserId, não o retorno do port. Se a
    // infraestrutura devolver uma nota sem id de verdade, o segundo check (evaluateDealClosure,
    // que usa o id da nota como evidenceRef) precisa pegar isso e recusar o fechamento mesmo
    // assim — não é para o Lead avançar com uma evidência vazia.
    const port = makePort({ createConfirmationNote: vi.fn().mockResolvedValue({ id: '' }) });

    await expect(
      ensureManualDealClosureAllowed(port, {
        organizationId: 'org-1',
        leadId: 'lead-1',
        actorUserId: 'user-42',
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('missing-evidence'),
    });

    expect(port.createConfirmationNote).toHaveBeenCalledTimes(1);
    expect(port.saveDealClosureEvent).not.toHaveBeenCalled();
  });
});
