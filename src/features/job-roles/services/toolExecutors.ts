// PROMPT 4 — Agent Runtime Genérico: Tool Executor Registry.
//
// Cada executor é um wrapper FINO sobre um serviço real já existente — nunca um motor de negócio
// novo, nunca uma segunda implementação (regra do prompt da onda: "agents são wrappers sobre
// serviços reais... não duplicar motores"). Só capabilities com `ToolBinding` `VERIFIED`
// (`tool-bindings.ts`, PROMPT 3) têm executor aqui — "Somente registrar executores comprovados".
//
// Os serviços reais vivem em outras features (`crm`, `companies`, `commercial-intelligence`,
// `knowledge`, `intelligence/agents`, `integrations/bitrix`, `integrations/google`,
// `chatbook`) — `job-roles` não os importa diretamente (`no-cross-feature-imports`,
// dependency-cruiser). Resolvidos via `container.resolve<T>(name)` com contrato estrutural local,
// mesmo padrão já usado por `src/features/intelligence/routes/agent.routes.ts` (ver comentário em
// `src/shared/di/setup.ts` para o racional completo e onde cada um é registrado).
import { container } from '../../../shared/di/container.js';
import { prisma } from '../../../lib/prisma.js';

export interface ToolExecutionContext {
  organizationId: string;
  actorId: string;
  resource: Record<string, unknown>;
  mission?: string;
}

export interface ToolFact {
  label: string;
  value: string;
  source: string;
}

export interface ToolExecutionOutput {
  summary: string;
  facts: ToolFact[];
  metrics: Record<string, number | string | null>;
  evidence: string[];
  missingData: string[];
  /** Retorno bruto do serviço real, para depuração/auditoria — nunca reformulado como fato novo. */
  raw?: unknown;
}

export type ToolExecutor = (ctx: ToolExecutionContext) => Promise<ToolExecutionOutput>;

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

function requireStr(resource: Record<string, unknown>, key: string): string {
  const v = str(resource[key]);
  if (!v) throw new Error(`resource.${key} é obrigatório para este executor.`);
  return v;
}

// ─── CRM: Lead ───────────────────────────────────────────────────────────────────────────────
interface LeadUseCasesContract {
  findLeadById(organizationId: string, id: string): Promise<Record<string, unknown> | null>;
  findLeads(
    organizationId: string,
    status?: string,
    page?: number,
    limit?: number,
    funnel?: string,
    query?: string,
  ): Promise<unknown>;
  enrichLead(organizationId: string, id: string): Promise<unknown>;
  updateLead(
    organizationId: string,
    id: string,
    data: Record<string, unknown>,
    actorUserId?: string,
  ): Promise<Record<string, unknown>>;
  updateLeadStatus(
    organizationId: string,
    id: string,
    newStatus: string,
    actorUserId?: string,
  ): Promise<Record<string, unknown>>;
}

function leadUseCases() {
  return container.resolve<LeadUseCasesContract>('LeadUseCases');
}

const leadRead: ToolExecutor = async (ctx) => {
  const id = requireStr(ctx.resource, 'leadId');
  const lead = await leadUseCases().findLeadById(ctx.organizationId, id);
  if (!lead) {
    return {
      summary: `Lead ${id} não encontrado nesta organização.`,
      facts: [],
      metrics: {},
      evidence: [],
      missingData: ['lead'],
      raw: null,
    };
  }
  return {
    summary: `Lead "${lead.title ?? id}" — status "${lead.status ?? 'desconhecido'}".`,
    facts: [
      { label: 'status', value: String(lead.status ?? ''), source: 'LeadUseCases.findLeadById' },
      { label: 'owner', value: String(lead.owner ?? ''), source: 'LeadUseCases.findLeadById' },
    ],
    metrics: {},
    evidence: [`Lead.id=${id}`],
    missingData: [],
    raw: lead,
  };
};

const leadSearch: ToolExecutor = async (ctx) => {
  const status = str(ctx.resource.status);
  const query = str(ctx.resource.query);
  const page = typeof ctx.resource.page === 'number' ? ctx.resource.page : undefined;
  const limit = typeof ctx.resource.limit === 'number' ? ctx.resource.limit : undefined;
  const result = await leadUseCases().findLeads(
    ctx.organizationId,
    status,
    page,
    limit,
    undefined,
    query,
  );
  const rows = Array.isArray((result as { data?: unknown[] })?.data)
    ? ((result as { data: unknown[] }).data as unknown[])
    : Array.isArray(result)
      ? (result as unknown[])
      : [];
  return {
    summary: `${rows.length} lead(s) encontrados${status ? ` com status "${status}"` : ''}.`,
    facts: [{ label: 'total', value: String(rows.length), source: 'LeadUseCases.findLeads' }],
    metrics: { total: rows.length },
    evidence: ['LeadUseCases.findLeads'],
    missingData: [],
    raw: result,
  };
};

const leadEnrich: ToolExecutor = async (ctx) => {
  const id = requireStr(ctx.resource, 'leadId');
  const result = await leadUseCases().enrichLead(ctx.organizationId, id);
  return {
    summary: `Enriquecimento disparado para o lead ${id}.`,
    facts: [],
    metrics: {},
    evidence: [`Lead.id=${id}`],
    missingData: [],
    raw: result,
  };
};

const leadUpdate: ToolExecutor = async (ctx) => {
  const id = requireStr(ctx.resource, 'leadId');
  const data = (ctx.resource.data as Record<string, unknown>) ?? {};
  const updated = await leadUseCases().updateLead(ctx.organizationId, id, data, ctx.actorId);
  return {
    summary: `Lead ${id} atualizado.`,
    facts: [
      { label: 'status', value: String(updated.status ?? ''), source: 'LeadUseCases.updateLead' },
    ],
    metrics: {},
    evidence: [`Lead.id=${id}`],
    missingData: [],
    raw: updated,
  };
};

const dealMoveStage: ToolExecutor = async (ctx) => {
  const id = requireStr(ctx.resource, 'leadId');
  const newStatus = requireStr(ctx.resource, 'newStatus');
  const updated = await leadUseCases().updateLeadStatus(
    ctx.organizationId,
    id,
    newStatus,
    ctx.actorId,
  );
  return {
    summary: `Negociação ${id} movida para o estágio "${newStatus}".`,
    facts: [
      {
        label: 'status',
        value: String(updated.status ?? newStatus),
        source: 'LeadUseCases.updateLeadStatus',
      },
    ],
    metrics: {},
    evidence: [`Lead.id=${id}`],
    missingData: [],
    raw: updated,
  };
};

// ─── CRM: Company ────────────────────────────────────────────────────────────────────────────
interface CompanyUseCasesContract {
  findCompanyById(organizationId: string, id: string): Promise<Record<string, unknown> | null>;
  findCompanies(
    organizationId: string,
    query?: string,
    page?: number,
    limit?: number,
  ): Promise<unknown>;
}

function companyUseCases() {
  return container.resolve<CompanyUseCasesContract>('CompanyUseCases');
}

const companyRead: ToolExecutor = async (ctx) => {
  const id = requireStr(ctx.resource, 'companyId');
  const company = await companyUseCases().findCompanyById(ctx.organizationId, id);
  if (!company) {
    return {
      summary: `Empresa ${id} não encontrada nesta organização.`,
      facts: [],
      metrics: {},
      evidence: [],
      missingData: ['company'],
      raw: null,
    };
  }
  return {
    summary: `Empresa "${company.tradeName ?? company.legalName ?? id}".`,
    facts: [
      {
        label: 'segment',
        value: String(company.segment ?? ''),
        source: 'CompanyUseCases.findCompanyById',
      },
    ],
    metrics: {},
    evidence: [`Company.id=${id}`],
    missingData: [],
    raw: company,
  };
};

const companySearch: ToolExecutor = async (ctx) => {
  const query = str(ctx.resource.query);
  const result = await companyUseCases().findCompanies(ctx.organizationId, query);
  const rows = Array.isArray((result as { data?: unknown[] })?.data)
    ? ((result as { data: unknown[] }).data as unknown[])
    : Array.isArray(result)
      ? (result as unknown[])
      : [];
  return {
    summary: `${rows.length} empresa(s) encontrada(s)${query ? ` para "${query}"` : ''}.`,
    facts: [
      { label: 'total', value: String(rows.length), source: 'CompanyUseCases.findCompanies' },
    ],
    metrics: { total: rows.length },
    evidence: ['CompanyUseCases.findCompanies'],
    missingData: [],
    raw: result,
  };
};

// ─── Reuniões ────────────────────────────────────────────────────────────────────────────────
interface MeetingSynthesisContract {
  synthesizeMeeting(input: { transcript: string; leadId?: string }): Promise<{
    summary: string;
    actionItems?: { title: string }[];
    risks?: unknown[];
  }>;
}

const meetingAnalyze: ToolExecutor = async (ctx) => {
  const transcript = requireStr(ctx.resource, 'transcript');
  const leadId = str(ctx.resource.leadId);
  const service = container.resolve<MeetingSynthesisContract>('MeetingSynthesisService');
  const result = await service.synthesizeMeeting({ transcript, leadId });
  return {
    summary: result.summary,
    facts: [],
    metrics: { actionItems: result.actionItems?.length ?? 0 },
    evidence: ['MeetingSynthesisService.synthesizeMeeting'],
    missingData: [],
    raw: result,
  };
};

interface GoogleCalendarContract {
  createCalendarEvent(
    organizationId: string,
    input: { title: string; startTime: string; endTime: string; attendeeEmails?: string[] },
  ): Promise<{ id: string; meetLink?: string | null }>;
}

const meetingSchedule: ToolExecutor = async (ctx) => {
  const title = requireStr(ctx.resource, 'title');
  const startTime = requireStr(ctx.resource, 'startTime');
  const endTime = requireStr(ctx.resource, 'endTime');
  const service = container.resolve<GoogleCalendarContract>('GoogleCalendarService');
  const result = await service.createCalendarEvent(ctx.organizationId, {
    title,
    startTime,
    endTime,
  });
  return {
    summary: `Reunião "${title}" agendada.`,
    facts: [{ label: 'eventId', value: result.id, source: 'createCalendarEvent' }],
    metrics: {},
    evidence: [`CalendarEvent.id=${result.id}`],
    missingData: [],
    raw: result,
  };
};

// ─── Pipeline / Forecast (via CommercialIntelligenceUseCases) ─────────────────────────────────
interface CommercialIntelligenceFilter {
  month: string;
  owner?: string;
  product?: string;
  source?: string;
  icp?: string;
  company?: string;
}
interface CommercialIntelligenceContract {
  pipelineCreation(organizationId: string, filter: CommercialIntelligenceFilter): Promise<unknown>;
  performance(organizationId: string, filter: CommercialIntelligenceFilter): Promise<unknown>;
  executiveOverview(organizationId: string, filter: CommercialIntelligenceFilter): Promise<unknown>;
  forecastExplain(organizationId: string, leadId: string): Promise<unknown>;
  crmQuality(organizationId: string, filter: CommercialIntelligenceFilter): Promise<unknown>;
}

function commercialIntelligence() {
  return container.resolve<CommercialIntelligenceContract>('CommercialIntelligenceUseCases');
}

function resolveFilter(ctx: ToolExecutionContext): CommercialIntelligenceFilter {
  const { currentPeriod } = container.resolve<{ currentPeriod: () => string }>(
    'CommercialIntelligencePeriod',
  );
  return {
    month: str(ctx.resource.month) ?? currentPeriod(),
    owner: str(ctx.resource.owner),
    product: str(ctx.resource.product),
    source: str(ctx.resource.source),
    icp: str(ctx.resource.icp),
    company: str(ctx.resource.company),
  };
}

function makeCiExecutor(
  label: string,
  call: (
    ci: CommercialIntelligenceContract,
    organizationId: string,
    filter: CommercialIntelligenceFilter,
  ) => Promise<unknown>,
): ToolExecutor {
  return async (ctx) => {
    const filter = resolveFilter(ctx);
    const result = await call(commercialIntelligence(), ctx.organizationId, filter);
    return {
      summary: `${label} para o período ${filter.month}.`,
      facts: [],
      metrics: {},
      evidence: [`CommercialIntelligenceUseCases.${label} — período ${filter.month}`],
      missingData: [],
      raw: result,
    };
  };
}

const pipelineRead = makeCiExecutor('pipelineCreation', (ci, org, f) =>
  ci.pipelineCreation(org, f),
);
const pipelineAnalyze = makeCiExecutor('performance', (ci, org, f) => ci.performance(org, f));
const forecastRead = makeCiExecutor('executiveOverview', (ci, org, f) =>
  ci.executiveOverview(org, f),
);
const bitrixRead = makeCiExecutor('crmQuality', (ci, org, f) => ci.crmQuality(org, f));

const forecastExplain: ToolExecutor = async (ctx) => {
  const leadId = requireStr(ctx.resource, 'leadId');
  const result = await commercialIntelligence().forecastExplain(ctx.organizationId, leadId);
  if (!result) {
    return {
      summary: `Sem forecast explicável para o lead ${leadId} (fora do pipeline elegível ou sem dado suficiente).`,
      facts: [],
      metrics: {},
      evidence: [],
      missingData: ['forecastExplain'],
      raw: null,
    };
  }
  return {
    summary: `Explicação de forecast gerada para o lead ${leadId}.`,
    facts: [],
    metrics: {},
    evidence: [`CommercialIntelligenceUseCases.forecastExplain leadId=${leadId}`],
    missingData: [],
    raw: result,
  };
};

// ─── Conhecimento ────────────────────────────────────────────────────────────────────────────
interface SearchServiceContract {
  hybridSearch(
    organizationId: string,
    query: string,
    limit?: number,
  ): Promise<{ hits: { title?: string; content?: string; score?: number }[] } | unknown>;
}

const knowledgeSearch: ToolExecutor = async (ctx) => {
  const query = requireStr(ctx.resource, 'query');
  const service = container.resolve<SearchServiceContract>('KnowledgeSearchService');
  const result = await service.hybridSearch(ctx.organizationId, query);
  const hits = (result as { hits?: unknown[] })?.hits ?? [];
  return {
    summary: `${hits.length} resultado(s) na base de conhecimento para "${query}".`,
    facts: [{ label: 'total', value: String(hits.length), source: 'SearchService.hybridSearch' }],
    metrics: { total: hits.length },
    evidence: ['SearchService.hybridSearch'],
    missingData: [],
    raw: result,
  };
};

// ─── Contratos ───────────────────────────────────────────────────────────────────────────────
// Lê diretamente `CrmDocumentSignatureRequest` via o cliente Prisma compartilhado — não é import
// cross-feature (é o mesmo `prisma` que toda feature já usa), e é a fonte mais direta e honesta
// do status real de assinatura (mesma tabela por trás de `signature.ts`/`documentSignature.ts`).
const contractRead: ToolExecutor = async (ctx) => {
  const documentId = requireStr(ctx.resource, 'documentId');
  const requests = await prisma.crmDocumentSignatureRequest.findMany({
    where: { organizationId: ctx.organizationId, documentId },
    orderBy: { requestedAt: 'desc' },
    select: { id: true, status: true, signerEmail: true, requestedAt: true },
  });
  const output: ToolExecutionOutput = {
    summary:
      requests.length === 0
        ? `Nenhuma solicitação de assinatura encontrada para o documento ${documentId}.`
        : `Documento ${documentId} — status de assinatura mais recente: "${requests[0]!.status}".`,
    facts:
      requests.length === 0
        ? []
        : [
            {
              label: 'status',
              value: String(requests[0]!.status),
              source: 'CrmDocumentSignatureRequest',
            },
          ],
    metrics: { totalRequests: requests.length },
    evidence: requests.length === 0 ? [] : [`CrmDocumentSignatureRequest.id=${requests[0]!.id}`],
    missingData: requests.length === 0 ? ['signatureRequest'] : [],
    raw: requests,
  };
  return output;
};

// ─── Bitrix ──────────────────────────────────────────────────────────────────────────────────
interface BitrixWritebackContract {
  updateLeadFields(
    organizationId: string,
    bitrixLeadId: string,
    fields: Record<string, string>,
  ): Promise<void>;
}

const bitrixWrite: ToolExecutor = async (ctx) => {
  const bitrixLeadId = requireStr(ctx.resource, 'bitrixLeadId');
  const fields = (ctx.resource.fields as Record<string, string>) ?? {};
  const adapter = container.resolve<BitrixWritebackContract>('BitrixLeadWritebackAdapter');
  await adapter.updateLeadFields(ctx.organizationId, bitrixLeadId, fields);
  return {
    summary: `Campos gravados no lead Bitrix ${bitrixLeadId}.`,
    facts: [],
    metrics: { fieldsUpdated: Object.keys(fields).length },
    evidence: [`Bitrix.leadId=${bitrixLeadId}`],
    missingData: [],
  };
};

interface BitrixConnectionOpsContract {
  testBitrixConnection(organizationId: string, connectionId: string): Promise<unknown>;
}

const bitrixConfigure: ToolExecutor = async (ctx) => {
  const connectionId = requireStr(ctx.resource, 'connectionId');
  const ops = container.resolve<BitrixConnectionOpsContract>('BitrixConnectionOps');
  const result = await ops.testBitrixConnection(ctx.organizationId, connectionId);
  return {
    summary: `Conexão Bitrix ${connectionId} testada.`,
    facts: [],
    metrics: {},
    evidence: [`BitrixConnection.id=${connectionId}`],
    missingData: [],
    raw: result,
  };
};

// ─── Governança de Agentes ───────────────────────────────────────────────────────────────────
const agentDiscover: ToolExecutor = async () => ({
  summary: 'Agente presente no catálogo (AgentDefinition ativo).',
  facts: [],
  metrics: {},
  evidence: ['AgentDefinition'],
  missingData: [],
});

// ─── SDR/Closer (agentes reais de LangGraph — já em produção) ──────────────────────────────────
// Diferente dos demais executores (função pura ou use case síncrono com retorno estruturado),
// estes dois chamam agentes de IA reais já em produção no Enxame (BaseAgent/LangGraph, tenant lido
// de `getTenantId()` via async-context — por isso não recebem `organizationId` como parâmetro).
// O retorno deles é `{success, sessionId}` (ver `base.agent.ts`/`sdrQualification.agent.ts`), não
// o contrato rico de facts/evidence — o resultado completo (mensagens, tool calls) continua vivo
// em `AgentMemory` (`GET /agents/sdr/status/:sessionId`, já existente), nunca duplicado aqui.
// Nunca invocados nesta onda em `SUCCEEDED`: `lead.qualify`/`deal.analyze` são MEDIUM/LOW mas o
// caminho síncrono de request/response do Agent Runtime não é adequado para uma execução
// LangGraph de vários segundos com chamada de LLM real — registrados aqui para completude do
// registry (regra "somente executores comprovados", e o binding É real/VERIFIED), com aviso
// explícito em `missingData` de que a execução completa acontece de forma assíncrona.
interface SDRQualificationContract {
  run(
    leadId: string,
    sessionId?: string,
    instruction?: string,
  ): Promise<{ success: boolean; sessionId?: string; error?: string }>;
}
interface CloserAgentContract {
  run(
    inputData: string,
    sessionId?: string,
  ): Promise<{ success: boolean; sessionId?: string; error?: string }>;
}

const leadQualify: ToolExecutor = async (ctx) => {
  const leadId = requireStr(ctx.resource, 'leadId');
  const agent = container.resolve<SDRQualificationContract>('SDRQualificationAgent');
  const result = await agent.run(leadId, undefined, ctx.mission);
  return {
    summary: result.success
      ? `Qualificação do lead ${leadId} iniciada — acompanhe em AgentMemory (sessionId=${result.sessionId}).`
      : `Qualificação do lead ${leadId} falhou: ${result.error ?? 'motivo desconhecido'}.`,
    facts: [],
    metrics: {},
    evidence: result.sessionId ? [`AgentMemory.sessionId=${result.sessionId}`] : [],
    missingData: [
      'Resultado completo (mensagens/tool calls) vive em AgentMemory, não neste registro.',
    ],
    raw: result,
  };
};

const dealAnalyze: ToolExecutor = async (ctx) => {
  const leadId = requireStr(ctx.resource, 'leadId');
  const instruction = ctx.mission ? `${leadId}\n\n${ctx.mission}` : leadId;
  const agent = container.resolve<CloserAgentContract>('CloserAgent');
  const result = await agent.run(instruction);
  return {
    summary: result.success
      ? `Análise de negociação ${leadId} iniciada — acompanhe em AgentMemory (sessionId=${result.sessionId}).`
      : `Análise da negociação ${leadId} falhou: ${result.error ?? 'motivo desconhecido'}.`,
    facts: [],
    metrics: {},
    evidence: result.sessionId ? [`AgentMemory.sessionId=${result.sessionId}`] : [],
    missingData: [
      'Resultado completo (mensagens/tool calls) vive em AgentMemory, não neste registro.',
    ],
    raw: result,
  };
};

/** Registry final — chave é sempre um `CapabilityDefinition.code` com `ToolBinding.verification
 *  === 'VERIFIED'` (tool-bindings.ts). Nunca contém entrada para capability SOURCE_REQUIRED/
 *  FUTURE_TOOL/TOOL_UNAVAILABLE — essas nunca alcançam a etapa de execução
 *  (`capabilityAuthorization.service.ts` já nega antes). */
export const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  'lead.read': leadRead,
  'lead.search': leadSearch,
  'lead.enrich': leadEnrich,
  'lead.qualify': leadQualify,
  'lead.update': leadUpdate,
  'company.read': companyRead,
  'company.search': companySearch,
  'meeting.analyze': meetingAnalyze,
  'meeting.schedule': meetingSchedule,
  'deal.read': leadRead,
  'deal.analyze': dealAnalyze,
  'deal.update': leadUpdate,
  'deal.move_stage': dealMoveStage,
  'pipeline.read': pipelineRead,
  'pipeline.analyze': pipelineAnalyze,
  'forecast.read': forecastRead,
  'forecast.explain': forecastExplain,
  'knowledge.search': knowledgeSearch,
  'contract.read': contractRead,
  'bitrix.read': bitrixRead,
  'bitrix.write': bitrixWrite,
  'bitrix.configure': bitrixConfigure,
  'agent.discover': agentDiscover,
};

export function getToolExecutor(capabilityCode: string): ToolExecutor | undefined {
  return TOOL_EXECUTORS[capabilityCode];
}
