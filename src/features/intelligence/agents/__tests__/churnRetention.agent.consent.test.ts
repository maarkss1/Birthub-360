import { afterEach, describe, expect, it, vi } from 'vitest';

const mockEnv: Record<string, unknown> = { AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS: undefined };
vi.mock('../../../../config/env.js', () => ({ env: mockEnv }));

vi.mock('../../../../lib/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { requestContext } = await import('../../../../lib/async-context');
const { ChurnRetentionAgent } = await import('../churnRetention.agent');
const { PiiConsentRequiredError } = await import('../../services/guardrails.service');

afterEach(() => {
  mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = undefined;
  vi.restoreAllMocks();
});

// ChurnRetentionAgent estende BaseAgent (mesmo caminho `run`/StateGraph de CRMAgent) e nunca
// recalcula churn — narra um resultado já pronto. Mesmo padrão de
// `base.agent.consent.test.ts`/`CRMAgent`: a trava de consentimento LGPD roda antes de montar
// qualquer modelo de IA.
describe('ChurnRetentionAgent.run — trava de consentimento LGPD (BaseAgent)', () => {
  it('bloqueia sem base legal registrada, sem montar nenhum modelo de IA', async () => {
    const gateway = await import('../../../../lib/ai/gateway.js');
    const getModelSpy = vi.spyOn(gateway, 'getAiModel');
    const agent = new ChurnRetentionAgent();

    const result = await requestContext.run({ tenantId: 'org-sem-consentimento' }, () =>
      agent.run('Resultado de churn já calculado para a conta X.'),
    );

    expect(result.error).toContain('org-sem-consentimento');
    expect(new PiiConsentRequiredError('org-sem-consentimento').message).toBe(result.error);
    expect(getModelSpy).not.toHaveBeenCalled();
  }, 15_000);

  it('a trava grava a falha em AgentMemory (status Failed), mesmo padrão de auditoria do resto do enxame', async () => {
    const agentMemoryStore = await import('../agentMemory.store.js');
    const recordSpy = vi.spyOn(agentMemoryStore, 'recordAgentFailure').mockResolvedValue(undefined);
    const agent = new ChurnRetentionAgent();

    await requestContext.run({ tenantId: 'org-sem-consentimento' }, () =>
      agent.run('Resultado de churn já calculado para a conta X.', 'session-churn-consent-audit'),
    );

    expect(recordSpy).toHaveBeenCalledWith({
      sessionId: 'session-churn-consent-audit',
      agentType: 'CHURN_RETENTION',
      organizationId: 'org-sem-consentimento',
      errorMessage: expect.stringContaining('org-sem-consentimento'),
    });
  }, 15_000);
});
