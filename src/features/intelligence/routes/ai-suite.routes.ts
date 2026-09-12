import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { aiSuite } from '../services/CentralAISuiteService.js';
import { searchService } from '../../knowledge/search.service.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import {
  assertPiiExternalConsent,
  PiiConsentRequiredError,
} from '../services/guardrails.service.js';

export const aiSuiteRouter = Router();

// Achado real (auditoria de release-readiness, segurança/RBAC — já sinalizado em
// `.claude/PILOTS.md`, mas seguia sem correção): nenhum dos ~16 endpoints deste router tinha
// `requireRole`. `authenticateToken`/`requireTenant` já são aplicados antes deste router chegar a
// ser montado (`intelligence.routes.ts` → `router.use('/suite', aiSuiteRouter)`, por sua vez
// montado com auth em `rateLimiters.ts`), mas isso só garante "usuário autenticado do tenant" —
// não impede um `VISUALIZADOR` (papel só-leitura) de disparar higienização de dados no Bitrix,
// sanitização de LGPD e o restante do catálogo de ações de IA. Mesmo conjunto de papéis já usado
// para "qualquer papel que age" em `intelligence.routes.ts` (`pendingActionRoles`).
aiSuiteRouter.use(requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']));

// ACH-07-01 (P0): achado real de segurança/LGPD — 12 dos 20 recursos deste hub (decision-committee,
// bitrix-hygiene, o "Higienizador LGPD" em /lgpd/sanitize, mesa/triage e outros) recebiam
// nome/e-mail/telefone/CPF/CNH/dados bancários no corpo da requisição e despachavam esse conteúdo
// para Groq/OpenAI sem checar base legal — diferente dos caminhos de WhatsApp
// (`conversation-intelligence.service.ts`) e Birth Voice (`birthVoice.service.ts`), que já usam
// `assertPiiExternalConsent` desde as Ondas 7/43. Aplicado aqui como middleware do próprio router
// (em vez de em cada handler) para cobrir todo o catálogo de uma vez e não depender de cada
// endpoint novo lembrar de chamar o gate individualmente. Mesmo padrão fail-closed por organização
// de `AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS` (ver aiPiiConsent.service.ts) e mesmo formato de
// resposta 403 (`{ success: false, error }`) já usado em intelligence.routes.ts e
// birthVoice.routes.ts para o mesmo erro.
aiSuiteRouter.use((req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as AuthRequest).user?.organizationId ?? null;
    assertPiiExternalConsent(organizationId);
    next();
  } catch (error) {
    if (error instanceof PiiConsentRequiredError) {
      res.status(403).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
});

const knowledgeCopilotSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, 'Descreva a dúvida técnica com pelo menos 3 caracteres')
    .max(2000),
  userRole: z.string().trim().max(100).optional(),
});

// Endpoint de Inventário dos 20 recursos de IA
aiSuiteRouter.get('/inventory', (_req: Request, res: Response) => {
  res.json({ success: true, data: aiSuite.getCapabilitiesInventory() });
});

// #6 Mapeamento de Comitê de Decisores
aiSuiteRouter.post(
  '/decision-committee',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contacts, companyContext } = req.body;
      const result = await aiSuite.decisionCommittee.mapCommittee(contacts || [], companyContext);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #7 Higienização Bitrix
aiSuiteRouter.post('/bitrix-hygiene', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiSuite.bitrixHygiene.sanitizeLeadData(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// #8 Cadência Dinâmica
aiSuiteRouter.post('/cadence-step', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiSuite.cadenceAI.generateNextStep(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// #9 Roleplay Turno e Avaliação
aiSuiteRouter.post('/roleplay/turn', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiSuite.roleplayAI.simulateCustomerResponse(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

aiSuiteRouter.post(
  '/roleplay/evaluate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { persona, history } = req.body;
      const result = await aiSuite.roleplayAI.evaluateSession(persona, history || []);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #10 Geração de Proposta Comercial
aiSuiteRouter.post(
  '/proposal/generate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiSuite.proposalAI.generateProposalSections(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #11 Next Best Action
aiSuiteRouter.post('/next-best-action', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiSuite.nextBestAction.determineNextAction(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// #13 Churn Prediction
aiSuiteRouter.post('/churn/predict', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiSuite.churnPrediction.analyzeChurnRisk(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// #14 Smart Lead Router
// Achado da auditoria (PR #328): SmartLeadRouterService.matchLeadToRep já valida (schema Zod +
// checagem de pertencimento) que o vendedor sugerido pelo LLM está DENTRO de `reps` — mas `reps`
// em si ainda vem cru do body do cliente, não é buscado no banco por `organizationId`. Corrigir
// isso de verdade exige montar `RepProfile[]` a partir do banco (User CLOSER/SDR + winRate +
// contagem de leads abertos por owner) — não existe hoje nenhum agregador pronto para isso
// (confirmado: as peças soltas existem em assignment.service.ts/sellerPerformanceAggregator/
// PrismaAnalyticsRepository, mas nenhuma monta a lista completa), então é um serviço novo, maior
// que o escopo desta correção — documentado aqui para não ficar perdido.
aiSuiteRouter.post(
  '/lead-router/match',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { lead, reps } = req.body;
      const result = await aiSuite.leadRouter.matchLeadToRep(lead, reps || []);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #15 Knowledge Copilot
// AI-010: retrieval real acontece aqui, no servidor, contra a base de conhecimento do tenant
// autenticado — o cliente não fornece mais os trechos (`retrievedDocumentSnippets`), só a
// pergunta. Sem isso, um cliente podia enviar qualquer texto como "documento" e a IA citava como
// se fosse uma fonte real da base de conhecimento.
aiSuiteRouter.post(
  '/knowledge/copilot',
  validateRequest(knowledgeCopilotSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const { question, userRole } = req.body as z.infer<typeof knowledgeCopilotSchema>;

      const { hits } = await searchService.hybridSearch(organizationId, question);
      const result = await aiSuite.knowledgeCopilot.answerTechnicalQuestion({
        question,
        userRole,
        hits,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #16 Meeting Synthesis
aiSuiteRouter.post(
  '/meeting/synthesize',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiSuite.meetingSynthesis.synthesizeMeeting(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #17 Mesa de Tratamento Triage
aiSuiteRouter.post('/mesa/triage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiSuite.mesaTriage.triageIncident(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// #18 Seller Coaching
aiSuiteRouter.post('/coaching/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiSuite.sellerCoaching.generateCoachingReport(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// #19 Playbook Generator
aiSuiteRouter.post(
  '/playbook/generate-chapter',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiSuite.playbookAI.generatePlaybookChapter(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #20 LGPD Sanitizer
aiSuiteRouter.post('/lgpd/sanitize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiSuite.lgpdSanitizer.sanitizeText(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
