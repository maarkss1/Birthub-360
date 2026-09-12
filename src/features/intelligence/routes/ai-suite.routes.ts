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

// ACH-07-02: os 19 endpoints abaixo liam `req.body` direto, sem `z.object().parse` — payload
// arbitrário do cliente compunha o prompt de IA sem teto de tamanho nem shape garantido. Um
// schema por endpoint, no molde de `knowledgeCopilotSchema` acima. Os 4 endpoints também citados
// no achado ACH-07-01 (decision-committee, bitrix-hygiene, mesa/triage, lgpd/sanitize) levam
// `.max(2000)` nos campos de texto livre para reduzir a superfície daquele achado (envio de PII a
// IA externa) — os demais campos de texto livre têm limites maiores quando o conteúdo legítimo
// (transcrição de reunião, notas de call) é normalmente mais longo que isso.

const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  role: z.string().trim().max(200).optional(),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  department: z.string().trim().max(200).optional(),
});

// #6 Mapeamento de Comitê de Decisores — um dos 4 do ACH-07-01.
const decisionCommitteeSchema = z.object({
  contacts: z.array(contactInputSchema).max(100).default([]),
  companyContext: z.string().trim().max(2000).optional(),
});

// #7 Higienização Bitrix — um dos 4 do ACH-07-01.
const bitrixHygieneSchema = z.object({
  companyName: z.string().trim().min(1).max(300),
  contactName: z.string().trim().max(200).optional(),
  jobTitle: z.string().trim().max(200).optional(),
  rawNotes: z.string().trim().max(2000).optional(),
  segmentHint: z.string().trim().max(200).optional(),
});

// #8 Cadência Dinâmica
const cadenceStepSchema = z.object({
  companyName: z.string().trim().min(1).max(300),
  contactName: z.string().trim().min(1).max(200),
  channel: z.enum(['email', 'whatsapp', 'call', 'linkedin']),
  stepNumber: z.number().int().min(0).max(1000),
  previousInteraction: z.string().trim().max(2000).optional(),
  leadReaction: z
    .enum(['sem_resposta', 'abriu_email', 'clicou_link', 'pediu_tempo', 'objecao_preco'])
    .optional(),
  valueProposition: z.string().trim().max(2000).optional(),
});

const roleplayPersonaSchema = z.object({
  name: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  companyProfile: z.string().trim().max(2000),
  difficulty: z.enum(['Fácil', 'Médio', 'Difícil', 'Extremo']),
  mainObjection: z.string().trim().max(2000),
  personality: z.string().trim().max(2000),
});

const roleplayHistoryEntrySchema = z.object({
  sender: z.enum(['user', 'persona']),
  text: z.string().trim().max(4000),
});

// #9 Roleplay Turno
const roleplayTurnSchema = z.object({
  persona: roleplayPersonaSchema,
  history: z.array(roleplayHistoryEntrySchema).max(500).default([]),
  userMessage: z.string().trim().min(1).max(2000),
});

// #9 Roleplay Avaliação
const roleplayEvaluateSchema = z.object({
  persona: roleplayPersonaSchema,
  history: z.array(roleplayHistoryEntrySchema).max(500).default([]),
});

// #10 Geração de Proposta Comercial
const proposalGenerateSchema = z.object({
  clientName: z.string().trim().min(1).max(300),
  fleetSize: z.number().int().min(0).max(1_000_000).optional(),
  diagnosedPains: z.array(z.string().trim().max(500)).max(50),
  proposedModules: z.array(z.string().trim().max(200)).max(50),
  monthlyInvestmentEstimated: z.number().min(0).optional(),
  competitorOrCurrentSolution: z.string().trim().max(300).optional(),
});

// #11 Next Best Action
const nextBestActionSchema = z.object({
  leadOrClientName: z.string().trim().min(1).max(300),
  stage: z.string().trim().min(1).max(200),
  rawNote: z.string().trim().min(1).max(4000),
  salesRepName: z.string().trim().max(200).optional(),
});

// #13 Churn Prediction
const churnPredictSchema = z.object({
  clientName: z.string().trim().min(1).max(300),
  contractAgeMonths: z.number().int().min(0).max(1200),
  monthlyRecurringRevenue: z.number().min(0),
  openSupportTickets: z.number().int().min(0),
  unresolvedComplaints: z.number().int().min(0),
  paymentDelaysLast90Days: z.number().int().min(0),
  platformUsageDropPercentage: z.number().min(-100).max(100),
  recentSentimentNotes: z.string().trim().max(2000).optional(),
});

const incomingLeadInfoSchema = z.object({
  leadId: z.string().trim().min(1).max(100),
  companyName: z.string().trim().min(1).max(300),
  estimatedFleet: z.number().int().min(0).max(1_000_000),
  segment: z.string().trim().min(1).max(200),
  urgency: z.enum(['Alta', 'Média', 'Baixa']),
  region: z.string().trim().min(1).max(200),
});

const repProfileSchema = z.object({
  repId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  specialties: z.array(z.string().trim().max(100)).max(50),
  winRatePercent: z.number().min(0).max(100),
  currentLeadCount: z.number().int().min(0),
});

// #14 Smart Lead Router
const leadRouterMatchSchema = z.object({
  lead: incomingLeadInfoSchema,
  reps: z.array(repProfileSchema).max(500).default([]),
});

// #16 Meeting Synthesis — transcrição de reunião real, limite maior que os campos de texto curto.
const meetingSynthesizeSchema = z.object({
  meetingTitle: z.string().trim().min(1).max(300),
  participants: z.array(z.string().trim().max(200)).max(100),
  rawTranscript: z.string().trim().min(1).max(20_000),
  dealName: z.string().trim().max(300).optional(),
});

// #17 Mesa de Tratamento Triage — um dos 4 do ACH-07-01.
const mesaTriageSchema = z.object({
  alertId: z.string().trim().min(1).max(100),
  vehiclePlate: z.string().trim().max(20).optional(),
  clientName: z.string().trim().min(1).max(300),
  alertType: z.string().trim().min(1).max(200),
  telemetryDataSummary: z.string().trim().min(1).max(2000),
  driverName: z.string().trim().max(200).optional(),
  cargoValueEstimated: z.number().min(0).optional(),
  riskZoneClassification: z.string().trim().max(200).optional(),
});

// #18 Seller Coaching
const coachingReportSchema = z.object({
  sellerName: z.string().trim().min(1).max(200),
  role: z
    .enum(['SDR / Hunter', 'Closer / Executivo de Contas', 'Account Manager / Farmer'])
    .optional(),
  period: z.string().trim().min(1).max(100),
  callsMade: z.number().int().min(0),
  connectionsRatePercent: z.number().min(0).max(100).optional(),
  meetingsScheduled: z.number().int().min(0),
  proposalsSent: z.number().int().min(0).optional(),
  dealsClosed: z.number().int().min(0),
  conversionRatePercent: z.number().min(0).max(100),
  avgTicket: z.number().min(0),
  topLossReason: z.string().trim().max(500).optional(),
});

// #19 Playbook Generator
const playbookGenerateSchema = z.object({
  topic: z.string().trim().min(1).max(500),
  targetAudience: z.enum(['SDR', 'Closer', 'Onboarding', 'CS']),
  industrySegment: z.string().trim().min(1).max(300),
  winningPatternsObserved: z.array(z.string().trim().max(500)).max(50).optional(),
});

// #20 LGPD Sanitizer — um dos 4 do ACH-07-01.
const lgpdSanitizeSchema = z.object({
  rawText: z.string().trim().min(1).max(2000),
  preserveCompanyNames: z.boolean().optional(),
  maskLevel: z.enum(['estrito', 'moderado']),
});

// Endpoint de Inventário dos 20 recursos de IA
aiSuiteRouter.get('/inventory', (_req: Request, res: Response) => {
  res.json({ success: true, data: aiSuite.getCapabilitiesInventory() });
});

// #6 Mapeamento de Comitê de Decisores
aiSuiteRouter.post(
  '/decision-committee',
  validateRequest(decisionCommitteeSchema),
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
aiSuiteRouter.post(
  '/bitrix-hygiene',
  validateRequest(bitrixHygieneSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiSuite.bitrixHygiene.sanitizeLeadData(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #8 Cadência Dinâmica
aiSuiteRouter.post(
  '/cadence-step',
  validateRequest(cadenceStepSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiSuite.cadenceAI.generateNextStep(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #9 Roleplay Turno e Avaliação
aiSuiteRouter.post(
  '/roleplay/turn',
  validateRequest(roleplayTurnSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiSuite.roleplayAI.simulateCustomerResponse(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

aiSuiteRouter.post(
  '/roleplay/evaluate',
  validateRequest(roleplayEvaluateSchema),
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
  validateRequest(proposalGenerateSchema),
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
aiSuiteRouter.post(
  '/next-best-action',
  validateRequest(nextBestActionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiSuite.nextBestAction.determineNextAction(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #13 Churn Prediction
aiSuiteRouter.post(
  '/churn/predict',
  validateRequest(churnPredictSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiSuite.churnPrediction.analyzeChurnRisk(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

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
  validateRequest(leadRouterMatchSchema),
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
  validateRequest(meetingSynthesizeSchema),
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
aiSuiteRouter.post(
  '/mesa/triage',
  validateRequest(mesaTriageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiSuite.mesaTriage.triageIncident(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #18 Seller Coaching
aiSuiteRouter.post(
  '/coaching/report',
  validateRequest(coachingReportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiSuite.sellerCoaching.generateCoachingReport(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// #19 Playbook Generator
aiSuiteRouter.post(
  '/playbook/generate-chapter',
  validateRequest(playbookGenerateSchema),
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
aiSuiteRouter.post(
  '/lgpd/sanitize',
  validateRequest(lgpdSanitizeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await aiSuite.lgpdSanitizer.sanitizeText(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);
