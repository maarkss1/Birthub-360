import type { Express } from 'express';
import { activityRoutes } from '../features/activities/routes/activity.routes';
import { analyticsRoutes } from '../features/analytics/routes/analytics.routes';
import { eventsRoutes } from '../features/analytics/routes/events.routes';
import { attachmentRoutes } from '../features/attachments/routes/attachment.routes';
import { authExtraRoutes } from '../features/auth/routes/auth-extra.routes';
import { automationRoutes } from '../features/automations/routes/automation.routes';
import { usageRoutes } from '../features/billing/routes/usage.routes';
import { bugReportRouter } from '../features/bug-reports/routes/bugReport.routes';
import { cadenceRoutes } from '../features/cadence/cadence.routes';
import {
  privateBookingRouter,
  publicBookingRouter,
} from '../features/calendar/routes/booking.routes';
import { commercialIntelligenceRoutes } from '../features/commercial-intelligence/routes/commercialIntelligence.routes';
import { companyRoutes } from '../features/companies/routes/company.routes';
import { contactRoutes } from '../features/contacts/routes/contact.routes';
import { copilotoIaRoutes } from '../features/copiloto-ia/routes/copilotoIa.routes';
import { companyDedupRoutes } from '../features/crm/routes/companyDedup.routes';
import { leadRoutes } from '../features/crm/routes/lead.routes';
import { leadDedupRoutes } from '../features/crm/routes/leadDedup.routes';
import { savedViewRoutes } from '../features/crm/routes/savedView.routes';
import { crm360Routes } from '../features/crm360/routes/crm360.routes';
import { featureFlagsRouter } from '../features/feature-flags/routes/featureFlags.routes';
import { gamificationRoutes } from '../features/gamification/routes/gamification.routes';
import { birthVoiceRoutes } from '../features/integrations/birth-voice/birthVoice.routes';
import { bitrixRoutes } from '../features/integrations/bitrix/bitrix.routes';
import { externalCrmRoutes } from '../features/integrations/shared/externalCrm.routes';
import { hubTasksRoutes } from '../features/integrations/bitrix/hubTasks.routes';
import { emailRoutes } from '../features/integrations/email/email.routes';
import { googleRoutes } from '../features/integrations/google/google.routes';
import { omieRoutes } from '../features/integrations/omie/omie.routes';
import { slackRoutes } from '../features/integrations/slack/slack.routes';
import { stripeRoutes } from '../features/integrations/stripe/stripe.routes';
import { threecxRoutes } from '../features/integrations/threecx/threecx.routes';
import { whatsappRoutes } from '../features/integrations/whatsapp/whatsapp.routes';
import { agentRoutes } from '../features/intelligence/routes/agent.routes';
import { intelligenceRoutes } from '../features/intelligence/routes/intelligence.routes';
import { promptRoutes } from '../features/intelligence/routes/prompt.routes';
import { accessRequestRoutes } from '../features/job-roles/routes/accessRequest.routes';
import { agentBuilderRoutes } from '../features/job-roles/routes/agentBuilder.routes';
import { agentBusRoutes } from '../features/job-roles/routes/agentBus.routes';
import { agentCatalogRoutes } from '../features/job-roles/routes/agentCatalog.routes';
import { capabilityRoutes } from '../features/job-roles/routes/capability.routes';
import { jobRoleRoutes } from '../features/job-roles/routes/jobRole.routes';
import { memoryRoutes } from '../features/job-roles/routes/memory.routes';
import { roleSupervisorRoutes } from '../features/job-roles/routes/roleSupervisor.routes';
import { workspaceRoutes } from '../features/job-roles/routes/workspace.routes';
import { knowledgeRoutes } from '../features/knowledge/knowledge.routes';
import { lgpdRouter } from '../features/lgpd/lgpd.routes';
import { accountIntelligenceRoutes } from '../features/market-intelligence/server/accountIntelligence.routes';
import { marketIntelligenceCompanyRoutes } from '../features/market-intelligence/server/marketIntelligenceCompany.routes';
import { mesaTratamentoRoutes } from '../features/mesa-tratamento/routes/mesaTratamento.routes';
import { moduleAccessRoutes } from '../features/module-access/routes/moduleAccess.routes';
import { noteRoutes } from '../features/notes/routes/note.routes';
import { notificationRoutes } from '../features/notifications/notification.routes';
import { sseService } from '../features/notifications/sse.service';
import { livingPlaybookRoutes } from '../features/playbook/living-playbook/routes/living-playbook.routes';
import { objectionMatrixRoutes } from '../features/playbook/objection-matrix/routes/objection-matrix.routes';
import { qualificationMatrixRoutes } from '../features/playbook/qualification-matrix/routes/qualification-matrix.routes';
import { prospectingRoutes } from '../features/prospecting/routes/prospecting.routes';
import { prospectingToolsRoutes } from '../features/prospecting/routes/prospecting-tools.routes';
import { teamRoutes } from '../features/team/routes/team.routes';
import { COMMERCIAL_INTELLIGENCE_ROLES, COPILOTO_IA_ROLES } from '../lib/auth/authorization';
import { type AuthRequest, authenticateToken } from '../shared/middlewares/authenticateToken';
import { requireTenant } from '../shared/middlewares/authorization';
import { requireRole } from '../shared/middlewares/requireRole';

/**
 * Monta todas as rotas de API protegidas (autenticação + tenant + papel, conforme o módulo) e o
 * fallback 404 de `/api/*`. Deve ser montado depois do parser JSON, do handler de auth e do
 * BullBoard, e antes do fallback de frontend — mesma posição do server.ts original.
 */
export function mountFeatureRoutes(app: Express): void {
  // Precisa vir ANTES de '/api/companies': o path de 1 segmento
  // '/api/companies/market-intelligence' colidiria com companyRoutes 'GET /:id' (que trataria
  // "market-intelligence" como um id de empresa) se companyRoutes fosse verificado primeiro. Ver
  // o comentário de topo de marketIntelligenceCompany.routes.ts.
  app.use(
    '/api/companies/market-intelligence',
    authenticateToken,
    requireTenant,
    marketIntelligenceCompanyRoutes,
  );
  // Montado ANTES de /api/companies pelo mesmo motivo do /api/leads/dedup acima.
  app.use('/api/companies/dedup', authenticateToken, requireTenant, companyDedupRoutes);
  app.use('/api/companies', authenticateToken, requireTenant, companyRoutes);
  app.use('/api/contacts', authenticateToken, requireTenant, contactRoutes);
  // Montado ANTES de /api/leads de propósito: rota mais específica primeiro (mesmo que hoje não
  // colida com nenhum padrão de lead.routes.ts, evita qualquer ambiguidade futura).
  app.use('/api/leads/dedup', authenticateToken, requireTenant, leadDedupRoutes);
  app.use('/api/leads', authenticateToken, requireTenant, leadRoutes);
  app.use('/api/crm/saved-views', authenticateToken, requireTenant, savedViewRoutes);
  app.use('/api/crm', authenticateToken, requireTenant, crm360Routes);
  app.use(
    '/api/playbook/qualification-matrix',
    authenticateToken,
    requireTenant,
    qualificationMatrixRoutes,
  );
  app.use(
    '/api/playbook/objection-matrix',
    authenticateToken,
    requireTenant,
    objectionMatrixRoutes,
  );
  app.use('/api/playbook/living-playbook', authenticateToken, requireTenant, livingPlaybookRoutes);
  app.use('/api/leads/:leadId/notes', authenticateToken, requireTenant, noteRoutes);
  // CRM-004: Note deixou de ser exclusiva de Lead — mesmo router, montado também nos prefixos de
  // Company/Contact (NoteController resolve a entidade pelo param que realmente chegou).
  app.use('/api/companies/:companyId/notes', authenticateToken, requireTenant, noteRoutes);
  app.use('/api/contacts/:contactId/notes', authenticateToken, requireTenant, noteRoutes);
  // CRM-005: primeiro modelo de anexo/arquivo para CRM — mesmo padrão de montagem em três
  // prefixos usado acima por noteRoutes.
  app.use('/api/leads/:leadId/attachments', authenticateToken, requireTenant, attachmentRoutes);
  app.use(
    '/api/companies/:companyId/attachments',
    authenticateToken,
    requireTenant,
    attachmentRoutes,
  );
  app.use(
    '/api/contacts/:contactId/attachments',
    authenticateToken,
    requireTenant,
    attachmentRoutes,
  );
  app.use('/api/activities', authenticateToken, requireTenant, activityRoutes);
  app.use('/api/mesa-tratamento', authenticateToken, requireTenant, mesaTratamentoRoutes);
  app.use('/api/prospecting', authenticateToken, requireTenant, prospectingRoutes);
  app.use('/api/prospecting/tools', authenticateToken, requireTenant, prospectingToolsRoutes);
  // authenticateToken já rodou pra estas 3 (junto com o aiLimiter, ver SEC-008b em rateLimiters.ts) —
  // só falta requireTenant aqui, chamar de novo seria uma segunda consulta de sessão redundante.
  app.use('/api/intelligence', requireTenant, intelligenceRoutes);
  app.use('/api/prompts', authenticateToken, requireTenant, promptRoutes);
  app.use('/api/analytics', authenticateToken, requireTenant, analyticsRoutes);
  app.use('/api/events', authenticateToken, requireTenant, eventsRoutes);
  // Comercial Inteligente — módulo executivo restrito (ver AGENTS.md/CLAUDE.md e
  // src/lib/auth/authorization.ts). `requireRole` aqui é defesa em profundidade: o router em
  // commercialIntelligence.routes.ts já se protege sozinho (router.use(requireRole(...))), mas
  // o mount explícito garante que NENHUM caminho de acesso a este módulo (direto por URL,
  // include futuro em outro arquivo, etc.) escapa da checagem de papel no servidor.
  app.use(
    '/api/commercial-intelligence',
    authenticateToken,
    requireTenant,
    requireRole([...COMMERCIAL_INTELLIGENCE_ROLES]),
    commercialIntelligenceRoutes,
  );
  // Copiloto Comercial IA (fundação — Onda 1). `requireRole` aqui é defesa em profundidade: o
  // router em copilotoIa.routes.ts já se protege sozinho (router.use(requireRole(...))), mesmo
  // desenho do mount de Comercial Inteligente logo acima.
  app.use(
    '/api/copiloto-ia',
    authenticateToken,
    requireTenant,
    requireRole([...COPILOTO_IA_ROLES]),
    copilotoIaRoutes,
  );
  app.use('/api/knowledge', requireTenant, knowledgeRoutes);
  app.use('/api/lgpd', authenticateToken, requireTenant, lgpdRouter);
  app.use('/api/feature-flags', authenticateToken, requireTenant, featureFlagsRouter);
  // authenticateToken + bugReportLimiter já rodaram pra esta rota (ver rateLimiters.ts) — só
  // falta requireTenant aqui, mesmo padrão de /api/intelligence.
  app.use('/api/bug-reports', requireTenant, bugReportRouter);
  app.use('/api/notifications', authenticateToken, requireTenant, notificationRoutes);

  app.get('/api/notifications/stream', authenticateToken, requireTenant, (req, res) => {
    const { organizationId } = (req as AuthRequest).user;
    sseService.addClient(req, res, organizationId);
  });

  app.use('/api/automations', authenticateToken, requireTenant, automationRoutes);
  // ADMIN-only: consumo/custo de IA da organização. A Sidebar (src/components/layout/Sidebar.tsx)
  // já trata este item como admin-only na navegação — este era o lado que faltava (rota
  // administrativa sem autorização real por cargo, achado da Onda 1/Roadmap v2, Agente 02).
  app.use(
    '/api/usage',
    authenticateToken,
    requireTenant,
    requireRole(['ADMIN', 'GESTOR']),
    usageRoutes,
  );
  // Coaching semanal por IA (Piloto 007) — cada vendedor só gera o próprio, sem restrição de papel.
  app.use('/api/gamification', authenticateToken, requireTenant, gamificationRoutes);
  app.use('/api/whatsapp', authenticateToken, requireTenant, whatsappRoutes);
  app.use('/api/integrations/birth-voice', authenticateToken, requireTenant, birthVoiceRoutes);
  app.use('/api/integrations/3cx', authenticateToken, requireTenant, threecxRoutes);

  // EXTERNAL TOOLS: Integrados do BIRTH-VOICES-HUB e Leads-Outbound
  app.use('/api/voice-hub', authenticateToken, requireTenant, (req, res, next) => {
    import('../features/voice-hub/routes/index.js').then((m) => m.default(req, res, next)).catch(next);
  });
  app.use('/api/outbound', authenticateToken, requireTenant, (req, res, next) => {
    import('../features/prospecting/outbound/server/routes.js').then((m) => m.apiRouter(req, res, next)).catch(next);
  });
  app.use('/api/dialer-3cx', authenticateToken, requireTenant, (req, res, next) => {
    // Dialer exposes campaigns, dnc, leads
    import('../features/cadence/dialer/interface/http/server.js').then((m) => {
      // It's a full express app, but we can mount its router if exported, or just mock it here.
      // This is a placeholder for the actual dialer routes.
      next();
    }).catch(next);
  });

  app.use('/api/integrations/email', authenticateToken, requireTenant, emailRoutes);
  app.use('/api/integrations/slack', authenticateToken, requireTenant, slackRoutes);
  app.use('/api/integrations/stripe', authenticateToken, requireTenant, stripeRoutes);
  app.use('/api/integrations/omie', authenticateToken, requireTenant, omieRoutes);
  app.use('/api/google', authenticateToken, requireTenant, googleRoutes);
  app.use('/api/bitrix', authenticateToken, requireTenant, bitrixRoutes);
  app.use('/api/integrations/external-crm', authenticateToken, requireTenant, externalCrmRoutes);
  app.use('/api/bitrix', authenticateToken, requireTenant, hubTasksRoutes);
  app.use('/api/team', authenticateToken, requireTenant, teamRoutes);
  app.use('/api/module-access', authenticateToken, requireTenant, moduleAccessRoutes);
  // Fundação Multi-Cargo (PROMPT 1) — catálogo de cargos/agentes é leitura livre por usuário
  // autenticado; gestão de atribuição de cargo (`/assignments/**`) exige ADMIN dentro do próprio
  // router (mesmo padrão de team.routes.ts/moduleAccess.routes.ts).
  app.use('/api/job-roles', authenticateToken, requireTenant, jobRoleRoutes);
  app.use('/api/agents', authenticateToken, requireTenant, agentCatalogRoutes);
  app.use('/api/capabilities', authenticateToken, requireTenant, capabilityRoutes);
  app.use('/api/role-supervisor', authenticateToken, requireTenant, roleSupervisorRoutes);
  // PROMPT 6 — Workspaces por Login/Cargo: mesmo padrão de mount independente de
  // /api/module-access (rota "me" própria, não aninhada em /api/job-roles).
  app.use('/api/workspace', authenticateToken, requireTenant, workspaceRoutes);
  // PROMPT 7 — Cross-Role Authorization + Aprovações: mesmo padrão de mount independente.
  app.use('/api/access-requests', authenticateToken, requireTenant, accessRequestRoutes);
  // PROMPT 8 — Agent Bus + Handoffs: mesmo padrão de mount independente.
  app.use('/api/agent-bus', authenticateToken, requireTenant, agentBusRoutes);
  // PROMPT 9 — Memória + Aprendizado Contínuo Governado: mesmo padrão de mount independente.
  app.use('/api/memory', authenticateToken, requireTenant, memoryRoutes);
  // PROMPT 10 — Agent Builder / Fábrica de Agentes: mesmo padrão de mount independente.
  app.use('/api/agent-builder', authenticateToken, requireTenant, agentBuilderRoutes);
  app.use('/api/auth-extra', authenticateToken, requireTenant, authExtraRoutes);
  app.use('/api/agent', requireTenant, agentRoutes);
  app.use('/api/cadence', authenticateToken, requireTenant, cadenceRoutes);
  app.use('/api/calendar/booking-links', privateBookingRouter);
  app.use('/api/calendar/book', publicBookingRouter);

  // Rotas de inteligência de conta (LDR, /accounts/...) — checagem de papel própria
  // (requireRole dentro do router).
  app.use('/api/market-intelligence', authenticateToken, requireTenant, accountIntelligenceRoutes);

  // Qualquer /api/* que não bateu em nenhuma rota acima deve 404 aqui, e nunca
  // cair no fallback do Vite/SPA (mountFrontend, em frontend.ts): em dev, `vite.middlewares`
  // reprocessa requisições sem arquivo correspondente e isso re-executa toda a cadeia de
  // middlewares (incluindo o apiLimiter) repetidamente para a mesma requisição,
  // estourando o rate limit em segundos com uma única chamada a um endpoint
  // inexistente (ex.: /api/analytics/overview, que nunca teve rota registrada).
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });
}
