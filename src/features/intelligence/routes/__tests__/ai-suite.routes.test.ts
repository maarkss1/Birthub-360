/**
 * ACH-07-01 (P0, LGPD): até esta correção, o router `/api/intelligence/suite` (ai-suite.routes.ts)
 * não tinha NENHUM gate de consentimento — 12 dos 20 recursos do AI Suite Hub (decision-committee,
 * bitrix-hygiene, o "Higienizador LGPD" em /lgpd/sanitize, mesa/triage e outros) recebiam
 * nome/e-mail/telefone/CPF/CNH/dados bancários no corpo da requisição e despachavam esse conteúdo
 * para Groq/OpenAI sem checar base legal — diferente dos caminhos de WhatsApp
 * (`conversation-intelligence.service.ts`) e Birth Voice (`birthVoice.service.ts`), que já usam
 * `assertPiiExternalConsent` desde as Ondas 7/43.
 *
 * Este teste cobre o contrato HTTP do gate adicionado como middleware do próprio router (logo após
 * `requireRole`): organização fora de `AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS` recebe 403 em
 * formato canônico `{ success: false, error }` em pelo menos 4 dos 12 endpoints afetados
 * (decision-committee, bitrix-hygiene, lgpd/sanitize, mesa/triage); organização autorizada
 * continua funcionando normalmente. Segue o mesmo padrão de
 * `src/features/prospecting/routes/__tests__/prospecting-tools.routes.test.ts`: mocka a camada de
 * serviço (`CentralAISuiteService.js`) e foca só no contrato do router.
 */

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../../shared/middlewares/errorHandler.js';

// `vi.mock` é hoisted para o topo do arquivo — antes até do `import { errorHandler }` acima, que
// puxa `config/env.js` na sua própria cadeia estática de imports. Sem `vi.hoisted`, o factory do
// mock rodaria antes de `mockEnv` ser inicializado ("Cannot access 'mockEnv' before
// initialization") — mesmo padrão já usado em budget.test.ts/secretFields.unit.test.ts/etc.
const mockEnv = vi.hoisted(() => ({
  AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS: undefined as string | undefined,
}));
vi.mock('../../../../config/env.js', () => ({ env: mockEnv }));

const mapCommitteeMock = vi.fn();
const sanitizeLeadDataMock = vi.fn();
const triageIncidentMock = vi.fn();
const sanitizeTextMock = vi.fn();
const getCapabilitiesInventoryMock = vi.fn();

vi.mock('../../services/CentralAISuiteService.js', () => ({
  aiSuite: {
    decisionCommittee: { mapCommittee: (...args: unknown[]) => mapCommitteeMock(...args) },
    bitrixHygiene: { sanitizeLeadData: (...args: unknown[]) => sanitizeLeadDataMock(...args) },
    mesaTriage: { triageIncident: (...args: unknown[]) => triageIncidentMock(...args) },
    lgpdSanitizer: { sanitizeText: (...args: unknown[]) => sanitizeTextMock(...args) },
    getCapabilitiesInventory: (...args: unknown[]) => getCapabilitiesInventoryMock(...args),
  },
}));

vi.mock('../../../knowledge/search.service.js', () => ({
  searchService: { hybridSearch: vi.fn() },
}));

const { aiSuiteRouter } = await import('../ai-suite.routes.js');

function buildApp(organizationId: string, role = 'ADMIN') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: { id: string; organizationId: string; role: string } }).user = {
      id: 'test-user',
      organizationId,
      role,
    };
    next();
  });
  app.use('/api/intelligence/suite', aiSuiteRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = undefined;
});

afterEach(() => {
  mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = undefined;
});

describe('AI Suite Hub — trava de consentimento LGPD (ACH-07-01)', () => {
  describe('organização sem base legal registrada', () => {
    it('bloqueia POST /decision-committee com 403 canônico, sem chamar o serviço', async () => {
      const app = buildApp('org-sem-consentimento');

      const res = await request(app)
        .post('/api/intelligence/suite/decision-committee')
        .send({ contacts: [{ name: 'Fulano de Tal' }], companyContext: 'x' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        error: expect.stringContaining('org-sem-consentimento'),
      });
      expect(mapCommitteeMock).not.toHaveBeenCalled();
    });

    it('bloqueia POST /bitrix-hygiene com 403 canônico, sem chamar o serviço', async () => {
      const app = buildApp('org-sem-consentimento');

      const res = await request(app)
        .post('/api/intelligence/suite/bitrix-hygiene')
        .send({ name: 'Fulano de Tal', email: 'fulano@example.com' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        error: expect.stringContaining('org-sem-consentimento'),
      });
      expect(sanitizeLeadDataMock).not.toHaveBeenCalled();
    });

    it('bloqueia POST /lgpd/sanitize (Higienizador LGPD) com 403 canônico, sem chamar o serviço', async () => {
      const app = buildApp('org-sem-consentimento');

      const res = await request(app)
        .post('/api/intelligence/suite/lgpd/sanitize')
        .send({ text: 'CPF 123.456.789-00 de Fulano de Tal' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        error: expect.stringContaining('org-sem-consentimento'),
      });
      expect(sanitizeTextMock).not.toHaveBeenCalled();
    });

    it('bloqueia POST /mesa/triage com 403 canônico, sem chamar o serviço', async () => {
      const app = buildApp('org-sem-consentimento');

      const res = await request(app)
        .post('/api/intelligence/suite/mesa/triage')
        .send({ description: 'Ocorrência envolvendo dados bancários do cliente' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        error: expect.stringContaining('org-sem-consentimento'),
      });
      expect(triageIncidentMock).not.toHaveBeenCalled();
    });
  });

  describe('organização com base legal registrada', () => {
    beforeEach(() => {
      mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = 'org-autorizada';
    });

    it('permite POST /decision-committee normalmente', async () => {
      mapCommitteeMock.mockResolvedValue({ committee: [] });
      const app = buildApp('org-autorizada');

      const res = await request(app)
        .post('/api/intelligence/suite/decision-committee')
        .send({ contacts: [{ name: 'Fulano de Tal' }], companyContext: 'x' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { committee: [] } });
      expect(mapCommitteeMock).toHaveBeenCalledWith([{ name: 'Fulano de Tal' }], 'x');
    });

    it('permite POST /bitrix-hygiene normalmente', async () => {
      sanitizeLeadDataMock.mockResolvedValue({ sanitized: true });
      const app = buildApp('org-autorizada');

      const res = await request(app)
        .post('/api/intelligence/suite/bitrix-hygiene')
        .send({ companyName: 'Fulano de Tal Transportes' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { sanitized: true } });
      expect(sanitizeLeadDataMock).toHaveBeenCalledWith({
        companyName: 'Fulano de Tal Transportes',
      });
    });

    it('permite POST /lgpd/sanitize normalmente', async () => {
      sanitizeTextMock.mockResolvedValue({ text: '[CPF OCULTADO]' });
      const app = buildApp('org-autorizada');

      const res = await request(app)
        .post('/api/intelligence/suite/lgpd/sanitize')
        .send({ rawText: 'CPF 123.456.789-00 de Fulano de Tal', maskLevel: 'estrito' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { text: '[CPF OCULTADO]' } });
      expect(sanitizeTextMock).toHaveBeenCalled();
    });

    it('permite POST /mesa/triage normalmente', async () => {
      triageIncidentMock.mockResolvedValue({ severity: 'low' });
      const app = buildApp('org-autorizada');

      const res = await request(app).post('/api/intelligence/suite/mesa/triage').send({
        alertId: 'alert-1',
        clientName: 'Fulano de Tal',
        alertType: 'desvio-rota',
        telemetryDataSummary: 'Ocorrência envolvendo dados bancários do cliente',
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { severity: 'low' } });
      expect(triageIncidentMock).toHaveBeenCalled();
    });
  });
});
