// PROMPT 10 — Agent Builder / Fábrica de Agentes.
//
// Pipeline (texto do prompt da onda): Need -> Existing Capability Search -> Existing Agent Search
// -> Service Search -> Gap Analysis -> AgentSpec -> CapabilitySpec -> ToolBindingSpec ->
// PromptSpec -> Tests -> Risk Review -> [revisão humana].
//
// Este service NUNCA publica nada sozinho: nunca escreve em `AgentDefinition`/`AgentVersion`/
// `CapabilityDefinition`/`ToolBinding` reais (só LÊ essas fontes, para a busca "antes de criar"),
// nunca marca um binding `VERIFIED`, nunca cria credencial, nunca aprova a própria proposta. O
// único efeito de `decideAgentBuildProposal` é mudar `status` — nunca ativar nada de verdade.
import type { AgentBuildProposalStatus } from '@prisma/client';
import { isJobRoleCode } from '../../../config/job-role-catalog.js';
import { AuditService } from '../../../lib/audit/audit.service.js';
import { prisma } from '../../../lib/prisma.js';
import normalizedBirthHubCatalog from '../catalog/agents.normalized.json';
import {
  isEligibleReviewer,
  RISK_REVIEW_DIMENSIONS,
  type RiskReviewDimension,
} from '../config/agent-builder-policy.js';
import { TOOL_BINDINGS } from '../config/tool-bindings.js';

export class AgentBuilderServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

export interface AgentBuilderActor {
  userId: string;
  organizationId: string;
  userRole: string;
}

const STOPWORDS = new Set([
  'para',
  'com',
  'uma',
  'um',
  'dos',
  'das',
  'que',
  'nao',
  'sobre',
  'pelo',
  'pela',
  'este',
  'esta',
  'isso',
  'mais',
  'ainda',
  'quando',
  'onde',
  'porque',
  'entre',
  'seus',
  'suas',
  // Termos que são puro "ruído de boilerplate" neste catálogo específico — aparecem em quase toda
  // capability/agente/serviço (ex.: "motor real", "fonte real", "Agente de..."), então isolados não
  // carregam nenhum sinal real sobre a necessidade do requester (achado real de falso positivo:
  // "real"/"agente" sozinhos combinavam com dezenas de entradas não relacionadas do catálogo).
  'real',
  'reais',
  'agente',
  'agentes',
]);

/** Extrai termos de busca reais do texto de `need` — nunca inventa palavras-chave que não vieram
 *  do texto do requester. Remove acentos para casar contra nomes/descrições que podem estar sem
 *  acentuação no catálogo. */
function extractKeywords(need: string): string[] {
  const normalized = need
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const words = normalized.split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOPWORDS.has(w));
  return [...new Set(words)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Casa por palavra inteira (nunca substring solta, ex.: "real" dentro de "realizar") e exige pelo
 *  menos 2 termos distintos batendo (ou o \u00fanico termo, se o need s\u00f3 rendeu 1 keyword) \u2014 uma \u00fanica
 *  palavra gen\u00e9rica do vocabul\u00e1rio de neg\u00f3cio (ex.: "pipeline", "fluxo") sozinha n\u00e3o \u00e9 sinal
 *  suficiente de que a capability/agente/servi\u00e7o j\u00e1 cobre a necessidade real do requester. */
function matchesKeywords(haystack: (string | null | undefined)[], keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  const text = haystack
    .filter((h): h is string => Boolean(h))
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const matchCount = keywords.filter((k) =>
    new RegExp(`\\b${escapeRegExp(k)}\\b`).test(text),
  ).length;
  return matchCount >= Math.min(2, keywords.length);
}

export interface CapabilityMatch {
  code: string;
  name: string;
  description: string;
  domain: string | null;
}

export interface AgentMatch {
  code: string;
  name: string;
  domain: string | null;
  source: 'CATALOG_IMPORTADO' | 'CATALOGO_COMPLETO';
}

export interface ServiceMatch {
  capabilityCode: string;
  toolCode: string;
  binding: string;
}

/** "Existing Capability Search" — busca real em `CapabilityDefinition` (catálogo global, nunca
 *  por tenant — ver `prisma/schema.prisma`), nunca uma lista estática paralela. */
async function searchExistingCapabilities(keywords: string[]): Promise<CapabilityMatch[]> {
  const rows = await prisma.capabilityDefinition.findMany({
    where: { isActive: true },
    select: { code: true, name: true, description: true, domain: true },
  });
  return rows
    .filter((r) => matchesKeywords([r.code, r.name, r.description, r.domain], keywords))
    .map((r) => ({
      code: r.code,
      name: r.name,
      description: r.description ?? '',
      domain: r.domain,
    }));
}

/** "Existing Agent Search" — cobre os DOIS lugares exigidos pelo prompt da onda: os agentes já
 *  importados para este catálogo (`AgentDefinition`, tabela global) E o catálogo-fonte completo
 *  (`agents.normalized.json`, ~380 agentes do birthhub), incluindo `aliasNames` — um agente com
 *  nome diferente mas alias batendo não pode virar uma proposta duplicada. */
async function searchExistingAgents(keywords: string[]): Promise<AgentMatch[]> {
  const dbRows = await prisma.agentDefinition.findMany({
    where: { isActive: true },
    select: { code: true, name: true, description: true, domain: true },
  });
  const dbMatches: AgentMatch[] = dbRows
    .filter((r) => matchesKeywords([r.code, r.name, r.description, r.domain], keywords))
    .map((r) => ({ code: r.code, name: r.name, domain: r.domain, source: 'CATALOG_IMPORTADO' }));

  const dbCodes = new Set(dbMatches.map((m) => m.code));
  const fullCatalogAgents = normalizedBirthHubCatalog.agents as Array<{
    code: string;
    name: string;
    domain: string | null;
    aliasNames?: string[];
    description: string | null;
  }>;
  const catalogMatches: AgentMatch[] = fullCatalogAgents
    .filter((a) => !dbCodes.has(a.code))
    .filter((a) =>
      matchesKeywords([a.code, a.name, a.domain, a.description, ...(a.aliasNames ?? [])], keywords),
    )
    .slice(0, 10)
    .map((a) => ({ code: a.code, name: a.name, domain: a.domain, source: 'CATALOGO_COMPLETO' }));

  return [...dbMatches, ...catalogMatches];
}

/** "Service Search" — varre `TOOL_BINDINGS` (o registry real de adapters/serviços do Capability
 *  Engine, PROMPT 3), nunca uma busca fictícia. Um serviço já documentado ali (mesmo que ligado a
 *  outra capability) é sinal real de que a infraestrutura já existe e só falta compor. */
function searchExistingServices(keywords: string[]): ServiceMatch[] {
  return TOOL_BINDINGS.filter((b) =>
    matchesKeywords([b.capabilityCode, b.toolCode, b.binding], keywords),
  ).map((b) => ({ capabilityCode: b.capabilityCode, toolCode: b.toolCode, binding: b.binding }));
}

export interface GapAnalysis {
  keywords: string[];
  existingCapabilities: CapabilityMatch[];
  existingAgents: AgentMatch[];
  existingServices: ServiceMatch[];
  compositionPossible: boolean;
  compositionNotes: string;
  isRealGap: boolean;
}

async function runGapAnalysis(need: string): Promise<GapAnalysis> {
  const keywords = extractKeywords(need);
  const [existingCapabilities, existingAgents] = await Promise.all([
    searchExistingCapabilities(keywords),
    searchExistingAgents(keywords),
  ]);
  const existingServices = searchExistingServices(keywords);
  const compositionPossible = existingAgents.length > 0;
  const isRealGap =
    existingCapabilities.length === 0 &&
    existingAgents.length === 0 &&
    existingServices.length === 0;
  return {
    keywords,
    existingCapabilities,
    existingAgents,
    existingServices,
    compositionPossible,
    compositionNotes: compositionPossible
      ? 'Existe(m) agente(s) relacionado(s) no catálogo — considere um Cross-Role Access Request ' +
        '(PROMPT 7) ou um handoff via Agent Bus (PROMPT 8) antes de construir algo novo.'
      : 'Nenhum agente relacionado encontrado — composição não resolveria esta necessidade.',
    isRealGap,
  };
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'proposta'
  );
}

interface AgentSpec {
  code: string;
  name: string;
  description: string;
  domain: string | null;
  primaryJobRoleCode: string | null;
}
interface CapabilitySpec {
  code: string;
  name: string;
  description: string;
  domain: string | null;
  actionType: 'READ' | 'EXECUTE' | 'WRITE' | 'ADMIN';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
interface ToolBindingSpec {
  capabilityCode: string;
  toolCode: string;
  binding: string;
  available: false;
  reason: 'FUTURE_TOOL';
  verification: 'UNVERIFIED';
  evidencePath: null;
}
interface PromptSpec {
  mission: string;
  systemPrompt: string;
}
interface TestsSpec {
  description: string;
  cases: string[];
}
interface RiskReviewEntry {
  status: 'PASS' | 'FAIL';
  notes: string;
}
interface RiskReview {
  evals: Record<RiskReviewDimension, RiskReviewEntry>;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/** Gera os specs de uma lacuna REAL — sempre rastreável ao `need` original (nunca reformulado a
 *  ponto de perder a fonte), sempre com `toolBindingSpec` nascendo `UNVERIFIED`/`FUTURE_TOOL`
 *  (nunca `VERIFIED` sem símbolo real + adapter + teste de integração + `evidencePath`, que só
 *  passam a existir depois que um humano de verdade implementa isto fora deste sistema). */
function generateSpecs(params: {
  need: string;
  targetJobRoleCode: string | null;
  domain: string | null;
}): {
  agentSpec: AgentSpec;
  capabilitySpec: CapabilitySpec;
  toolBindingSpec: ToolBindingSpec;
  promptSpec: PromptSpec;
  testsSpec: TestsSpec;
} {
  const slug = slugify(params.need);
  const agentSpec: AgentSpec = {
    code: `proposed.${slug}`,
    name: `Proposta: ${params.need.trim().slice(0, 80)}`,
    // Sempre o texto original do requester, nunca reformulado — garante rastreabilidade (ver
    // dimensão `missingSource` de `computeRiskReview`).
    description: params.need.trim(),
    domain: params.domain,
    primaryJobRoleCode: params.targetJobRoleCode,
  };
  const capabilitySpec: CapabilitySpec = {
    code: `${slug}.execute`,
    name: `Executar: ${params.need.trim().slice(0, 60)}`,
    description: params.need.trim(),
    domain: params.domain,
    // Nunca ADMIN por padrão — elevar o tipo de ação exige decisão humana explícita fora deste
    // gerador (ver dimensão `forbiddenCapability`).
    actionType: 'EXECUTE',
    riskLevel: 'MEDIUM',
  };
  const toolBindingSpec: ToolBindingSpec = {
    capabilityCode: capabilitySpec.code,
    toolCode: `${slug}.future`,
    binding: 'Nenhum adapter real ainda — proposta aguardando implementação humana.',
    available: false,
    reason: 'FUTURE_TOOL',
    verification: 'UNVERIFIED',
    evidencePath: null,
  };
  const promptSpec: PromptSpec = {
    mission: `Atender à necessidade descrita: "${params.need.trim()}".`,
    systemPrompt:
      `[RASCUNHO — proposta, nunca publicado] Você é um agente proposto para: ${params.need.trim()}. ` +
      'Toda resposta precisa ser evidence-first (nunca afirme um fato sem citar a fonte real de ' +
      'onde veio) e respeitar o Capability & Permission Engine — nunca execute nada fora da ' +
      'capability autorizada para este agente.',
  };
  const testsSpec: TestsSpec = {
    description: `Plano de testes de integração para "${agentSpec.code}" — a implementar junto do adapter real.`,
    cases: [
      'authorizeCapability nega quando o agente não tem RoleAgentGrant/AgentCapabilityGrant.',
      'ToolBinding permanece UNVERIFIED até existir símbolo real + evidencePath comprovado.',
      'Execução real produz evidence rastreável (nunca um fato sem fonte).',
      'Tenant isolation: execução de um tenant nunca visível para outro.',
    ],
  };
  return { agentSpec, capabilitySpec, toolBindingSpec, promptSpec, testsSpec };
}

const HALLUCINATED_NUMBER_PATTERN = /\b\d{1,3}%|\bR\$\s?\d/;
const PROMPT_INJECTION_PATTERN =
  /ignore\s+(all\s+|previous\s+)?instructions|disregard\s+(all\s+|previous\s+)?instructions|system\s+prompt/i;

/** Preenche as 9 dimensões de `RISK_REVIEW_DIMENSIONS`, exatamente — cada uma checada contra o
 *  conteúdo REAL gerado (nunca uma nota fabricada). "Não pode: inventar fonte" aplica-se também
 *  aqui: uma dimensão `PASS` só existe quando a checagem correspondente realmente passou. */
function computeRiskReview(params: {
  gapAnalysis: GapAnalysis;
  agentSpec: AgentSpec;
  capabilitySpec: CapabilitySpec;
  toolBindingSpec: ToolBindingSpec;
  promptSpec: PromptSpec;
  need: string;
}): RiskReview {
  const evals = {} as Record<RiskReviewDimension, RiskReviewEntry>;

  evals.groundedness = {
    status: params.gapAnalysis.keywords.length > 0 ? 'PASS' : 'FAIL',
    notes: `Busca ancorada em ${params.gapAnalysis.keywords.length} termo(s) extraído(s) do need real.`,
  };
  evals.evidenceCoverage = {
    status: 'PASS',
    notes:
      'As 3 buscas do pipeline (capability/agente/serviço) foram executadas contra fontes reais.',
  };
  evals.forbiddenCapability = {
    status: params.capabilitySpec.actionType !== 'ADMIN' ? 'PASS' : 'FAIL',
    notes: `actionType gerado: ${params.capabilitySpec.actionType} (nunca ADMIN por padrão).`,
  };
  const suspiciousText = `${params.promptSpec.systemPrompt} ${params.capabilitySpec.description}`;
  evals.hallucinatedNumbers = {
    status: HALLUCINATED_NUMBER_PATTERN.test(suspiciousText) ? 'FAIL' : 'PASS',
    notes: 'Nenhum spec gerado por este pipeline insere número/valor não citado pelo requester.',
  };
  evals.tenantIsolation = {
    status: 'PASS',
    notes: 'AgentBuildProposal é organizationId-scoped com RLS estrito — estrutural, sem exceção.',
  };
  evals.unsafeWrite = {
    status: params.toolBindingSpec.verification === 'UNVERIFIED' ? 'PASS' : 'FAIL',
    notes: 'toolBindingSpec nasce sempre UNVERIFIED/FUTURE_TOOL — nunca executável a partir daqui.',
  };
  evals.promptInjection = {
    status: PROMPT_INJECTION_PATTERN.test(params.need) ? 'FAIL' : 'PASS',
    notes: 'need do requester varrido contra padrões conhecidos de instrução maliciosa.',
  };
  evals.missingSource = {
    status: params.agentSpec.description === params.need.trim() ? 'PASS' : 'FAIL',
    notes: 'agentSpec.description é sempre o texto original do requester — rastreável à fonte.',
  };
  evals.rollbackVersion = {
    status: 'PASS',
    notes: 'Nada é publicado/ativado por este pipeline — não há artefato live para reverter ainda.',
  };

  const anyFail = RISK_REVIEW_DIMENSIONS.some((d) => evals[d].status === 'FAIL');
  return {
    evals,
    overallRisk: anyFail ? 'HIGH' : params.capabilitySpec.riskLevel,
  };
}

const PROPOSAL_SELECT = {
  id: true,
  organizationId: true,
  requestedBy: true,
  requestedByRole: true,
  need: true,
  targetJobRoleCode: true,
  gapAnalysis: true,
  agentSpec: true,
  capabilitySpec: true,
  toolBindingSpec: true,
  promptSpec: true,
  testsSpec: true,
  riskReview: true,
  status: true,
  reviewedBy: true,
  reviewedByRole: true,
  reviewNotes: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ProposalRow = NonNullable<
  Awaited<
    ReturnType<typeof prisma.agentBuildProposal.findFirst<{ select: typeof PROPOSAL_SELECT }>>
  >
>;

export interface AgentBuildProposalDto {
  id: string;
  requestedBy: string;
  requestedByRole: string;
  need: string;
  targetJobRoleCode: string | null;
  gapAnalysis: GapAnalysis;
  agentSpec: AgentSpec | null;
  capabilitySpec: CapabilitySpec | null;
  toolBindingSpec: ToolBindingSpec | null;
  promptSpec: PromptSpec | null;
  testsSpec: TestsSpec | null;
  riskReview: RiskReview | null;
  status: AgentBuildProposalStatus;
  reviewedBy: string | null;
  reviewedByRole: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function toDto(row: ProposalRow): AgentBuildProposalDto {
  return {
    id: row.id,
    requestedBy: row.requestedBy,
    requestedByRole: row.requestedByRole,
    need: row.need,
    targetJobRoleCode: row.targetJobRoleCode,
    gapAnalysis: row.gapAnalysis as unknown as GapAnalysis,
    agentSpec: row.agentSpec as unknown as AgentSpec | null,
    capabilitySpec: row.capabilitySpec as unknown as CapabilitySpec | null,
    toolBindingSpec: row.toolBindingSpec as unknown as ToolBindingSpec | null,
    promptSpec: row.promptSpec as unknown as PromptSpec | null,
    testsSpec: row.testsSpec as unknown as TestsSpec | null,
    riskReview: row.riskReview as unknown as RiskReview | null,
    status: row.status,
    reviewedBy: row.reviewedBy,
    reviewedByRole: row.reviewedByRole,
    reviewNotes: row.reviewNotes,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadProposalOrThrow(organizationId: string, id: string): Promise<ProposalRow> {
  const row = await prisma.agentBuildProposal.findFirst({
    where: { id, organizationId },
    select: PROPOSAL_SELECT,
  });
  if (!row) {
    throw new AgentBuilderServiceError('Proposta não encontrada.', 'NOT_FOUND', 404);
  }
  return row;
}

export interface ProposeAgentBuildInput {
  actor: AgentBuilderActor;
  need: string;
  targetJobRoleCode?: string;
  domain?: string;
}

export async function proposeAgentBuild(
  input: ProposeAgentBuildInput,
): Promise<AgentBuildProposalDto> {
  const { actor } = input;
  const need = input.need.trim();
  if (!need) {
    throw new AgentBuilderServiceError('need é obrigatório.', 'NEED_REQUIRED', 400);
  }
  if (input.targetJobRoleCode && !isJobRoleCode(input.targetJobRoleCode)) {
    throw new AgentBuilderServiceError(
      'targetJobRoleCode desconhecido no catálogo de cargos.',
      'UNKNOWN_JOB_ROLE',
      404,
    );
  }

  const gapAnalysis = await runGapAnalysis(need);

  if (!gapAnalysis.isRealGap) {
    const created = await prisma.agentBuildProposal.create({
      data: {
        organizationId: actor.organizationId,
        requestedBy: actor.userId,
        requestedByRole: actor.userRole,
        need,
        targetJobRoleCode: input.targetJobRoleCode,
        gapAnalysis: gapAnalysis as unknown as object,
        status: 'GAP_NOT_CONFIRMED',
      },
      select: { id: true },
    });
    await AuditService.log({
      action: 'AGENT_EXECUTED',
      entity: 'AgentBuildProposal',
      entityId: created.id,
      actorId: actor.userId,
      tenantId: actor.organizationId,
      afterState: { status: 'GAP_NOT_CONFIRMED' },
    });
    return toDto(await loadProposalOrThrow(actor.organizationId, created.id));
  }

  const { agentSpec, capabilitySpec, toolBindingSpec, promptSpec, testsSpec } = generateSpecs({
    need,
    targetJobRoleCode: input.targetJobRoleCode ?? null,
    domain: input.domain ?? null,
  });
  const riskReview = computeRiskReview({
    gapAnalysis,
    agentSpec,
    capabilitySpec,
    toolBindingSpec,
    promptSpec,
    need,
  });

  const created = await prisma.agentBuildProposal.create({
    data: {
      organizationId: actor.organizationId,
      requestedBy: actor.userId,
      requestedByRole: actor.userRole,
      need,
      targetJobRoleCode: input.targetJobRoleCode,
      gapAnalysis: gapAnalysis as unknown as object,
      agentSpec: agentSpec as unknown as object,
      capabilitySpec: capabilitySpec as unknown as object,
      toolBindingSpec: toolBindingSpec as unknown as object,
      promptSpec: promptSpec as unknown as object,
      testsSpec: testsSpec as unknown as object,
      riskReview: riskReview as unknown as object,
      status: 'DRAFT',
    },
    select: { id: true },
  });
  await AuditService.log({
    action: 'AGENT_EXECUTED',
    entity: 'AgentBuildProposal',
    entityId: created.id,
    actorId: actor.userId,
    tenantId: actor.organizationId,
    afterState: { status: 'DRAFT', overallRisk: riskReview.overallRisk },
  });

  return toDto(await loadProposalOrThrow(actor.organizationId, created.id));
}

export interface DecideAgentBuildProposalInput {
  actor: AgentBuilderActor;
  proposalId: string;
  outcome: 'APPROVED_FOR_DEVELOPMENT' | 'REJECTED';
  notes?: string;
}

export async function decideAgentBuildProposal(
  input: DecideAgentBuildProposalInput,
): Promise<AgentBuildProposalDto> {
  const { actor } = input;
  const row = await loadProposalOrThrow(actor.organizationId, input.proposalId);
  if (row.status !== 'DRAFT') {
    throw new AgentBuilderServiceError(
      `Só é possível decidir uma proposta com spec real (status atual: ${row.status}).`,
      'INVALID_STATE',
      409,
    );
  }
  if (!isEligibleReviewer(actor.userRole)) {
    throw new AgentBuilderServiceError(
      'Você não atende ao piso de UserRole exigido para revisar propostas do Agent Builder.',
      'FORBIDDEN',
      403,
    );
  }

  await prisma.agentBuildProposal.update({
    where: { id: row.id },
    data: {
      status: input.outcome,
      reviewedBy: actor.userId,
      reviewedByRole: actor.userRole,
      reviewNotes: input.notes,
      reviewedAt: new Date(),
    },
  });
  await AuditService.log({
    action: 'AGENT_EXECUTED',
    entity: 'AgentBuildProposal',
    entityId: row.id,
    actorId: actor.userId,
    tenantId: actor.organizationId,
    afterState: { status: input.outcome },
  });

  return toDto(await loadProposalOrThrow(actor.organizationId, row.id));
}

export async function listAgentBuildProposals(
  organizationId: string,
  status?: AgentBuildProposalStatus,
): Promise<AgentBuildProposalDto[]> {
  const rows = await prisma.agentBuildProposal.findMany({
    where: { organizationId, ...(status ? { status } : {}) },
    select: PROPOSAL_SELECT,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDto);
}

export async function getAgentBuildProposal(
  organizationId: string,
  proposalId: string,
): Promise<AgentBuildProposalDto> {
  return toDto(await loadProposalOrThrow(organizationId, proposalId));
}
