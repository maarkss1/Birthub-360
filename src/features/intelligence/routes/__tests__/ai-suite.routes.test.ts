import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../../../shared/middlewares/errorHandler.js';
import { aiSuiteRouter } from '../ai-suite.routes.js';
import { env } from '../../../../config/env.js';

vi.mock('../../services/CentralAISuiteService.js', () => ({
  aiSuite: {
    decisionCommittee: { mapCommittee: vi.fn().mockResolvedValue({ mapped: true }) },
    bitrixHygiene: { sanitizeLeadData: vi.fn().mockResolvedValue({ sanitized: true }) },
    lgpdSanitizer: { sanitizeText: vi.fn().mockResolvedValue({ clean: true }) },
    mesaTriage: { triageIncident: vi.fn().mockResolvedValue({ triaged: true }) },
  },
}));

function buildApp(organizationId: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = {
      id: 'test-user',
      organizationId,
      role: 'ADMIN',
    };
    next();
  });
  app.use('/api/ai-suite', aiSuiteRouter);
  app.use(errorHandler);
  return app;
}

describe('AI Suite Routes - LGPD Middleware', () => {
  let originalEnvConsent: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnvConsent = env.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS;
  });

  afterEach(() => {
    env.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = originalEnvConsent;
  });

  it('retorna 403 para organização sem consentimento', async () => {
    env.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = 'org-autorizada';
    const app = buildApp('org-sem-consentimento');

    const endpoints = [
      '/api/ai-suite/decision-committee',
      '/api/ai-suite/bitrix-hygiene',
      '/api/ai-suite/lgpd/sanitize',
      '/api/ai-suite/mesa/triage',
    ];

    for (const endpoint of endpoints) {
      const res = await request(app).post(endpoint).send({});
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Consentimento/base legal LGPD não registrado');
    }
  });

  it('permite acesso para organização autorizada', async () => {
    env.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = 'org-autorizada';
    const app = buildApp('org-autorizada');

    const endpoints = [
      '/api/ai-suite/decision-committee',
      '/api/ai-suite/bitrix-hygiene',
      '/api/ai-suite/lgpd/sanitize',
      '/api/ai-suite/mesa/triage',
    ];

    for (const endpoint of endpoints) {
      const res = await request(app).post(endpoint).send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });
});
