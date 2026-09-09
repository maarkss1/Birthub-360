import type { AccessRequestCategory } from '@prisma/client';
import { CAPABILITY_CATALOG, type CapabilityCode } from '../../../config/capability-catalog.js';
import type { JobRoleCode } from '../../../config/job-role-catalog.js';
import { ROLE_HIERARCHY, type Role } from '../../../lib/auth/authorization.js';

// PROMPT 7 — Cross-Role Authorization + Aprovações. `ApprovalPolicy` (a MATRIZ do prompt da onda)
// é CÓDIGO, não tabela — mesma decisão de `tool-bindings.ts`/`role-supervisor-profiles.ts`/
// `role-workspace-definitions.ts`: é uma política fixa de governança do produto, sem necessidade
// real de customização por organização em runtime (ver comentário da seção correspondente em
// prisma/schema.prisma).
//
// A MATRIZ do prompt da onda usa nomes de organograma comercial ("coordenador", "gerente",
// "diretor", "financeiro") que não são `UserRole` (só ADMIN/GESTOR/CLOSER/SDR/VISUALIZADOR
// existem de verdade — ver `authorization.ts`) nem sempre `JobRole` isolado. Traduzido aqui em
// DUAS checagens independentes, nunca uma só (`aprovação não vira bypass de UserRole` é invariante
// do prompt mestre):
//   1. `minApproverUserRole` — piso ESTRUTURAL de `UserRole` (a autoridade técnica real), sempre
//      aplicado, exatamente como `MIN_ROLE_BY_ACTION_TYPE` em `capabilityAuthorization.service.ts`.
//   2. `eligibleApproverJobRoles` — quando preenchido, o aprovador precisa TAMBÉM ter um desses
//      `JobRole` como cargo principal ativo (o "quem" de domínio que a MATRIZ nomeia). `undefined`
//      = qualquer usuário que já satisfaça o piso de `UserRole` pode aprovar (ex.: `BITRIX_CONFIG`,
///     onde a MATRIZ já nomeia diretamente "ADMIN/GESTOR", papéis de `UserRole`, não cargos).
//
// `DEPLOY` ("fora do fluxo", regra explícita da MATRIZ) não existe como valor do enum
// `AccessRequestCategory` de propósito — nenhuma capability deste catálogo é deploy, e não há
// como abrir um `AccessRequest` para uma categoria que nunca deveria ter uma.
export interface ApprovalPolicy {
  category: AccessRequestCategory;
  label: string;
  minApproverUserRole: Role;
  /** `undefined` = qualquer usuário que satisfaça `minApproverUserRole` pode aprovar. */
  eligibleApproverJobRoles?: readonly JobRoleCode[];
  /** `true` só para `READ_CONSULTA` — aprovação automática pelo SYSTEM quando a capability
   *  requisitada é `riskLevel: 'LOW'` (ver `resolveAutoApproval` abaixo); nunca para as demais
   *  categorias, mesmo que uma capability específica seja LOW risk (a MATRIZ classifica por
   *  categoria de negócio, não só por risco numérico). */
  autoApprove: boolean;
  /** "assinatura: humano obrigatório" da MATRIZ — documentativo (nenhuma categoria além de
   *  `READ_CONSULTA` tem `autoApprove: true`, então toda `ASSINATURA` já exige humano por
   *  construção; o campo só torna essa garantia explícita/consultável em vez de implícita). */
  requiresHuman: boolean;
}

export const APPROVAL_POLICIES: Record<AccessRequestCategory, ApprovalPolicy> = {
  READ_CONSULTA: {
    category: 'READ_CONSULTA',
    label: 'Leitura/consulta',
    minApproverUserRole: 'VISUALIZADOR',
    autoApprove: true,
    requiresHuman: false,
  },
  HANDOFF_OPERACIONAL: {
    category: 'HANDOFF_OPERACIONAL',
    label: 'Handoff operacional',
    minApproverUserRole: 'CLOSER',
    eligibleApproverJobRoles: ['COORDENADOR_COMERCIAL', 'GERENTE_COMERCIAL', 'DIRETOR_COMERCIAL'],
    autoApprove: false,
    requiresHuman: true,
  },
  DEAL_CHANGES: {
    category: 'DEAL_CHANGES',
    label: 'Alteração de negócio',
    minApproverUserRole: 'CLOSER',
    eligibleApproverJobRoles: ['COORDENADOR_COMERCIAL', 'GERENTE_COMERCIAL', 'DIRETOR_COMERCIAL'],
    autoApprove: false,
    requiresHuman: true,
  },
  FORECAST_META: {
    category: 'FORECAST_META',
    label: 'Forecast/meta',
    minApproverUserRole: 'GESTOR',
    eligibleApproverJobRoles: ['GERENTE_COMERCIAL', 'DIRETOR_COMERCIAL'],
    autoApprove: false,
    requiresHuman: true,
  },
  DESCONTO_PRECO: {
    category: 'DESCONTO_PRECO',
    label: 'Desconto/preço',
    minApproverUserRole: 'GESTOR',
    eligibleApproverJobRoles: ['GERENTE_COMERCIAL', 'DIRETOR_COMERCIAL'],
    autoApprove: false,
    requiresHuman: true,
  },
  CONTRATO: {
    category: 'CONTRATO',
    label: 'Contrato',
    minApproverUserRole: 'GESTOR',
    eligibleApproverJobRoles: ['GERENTE_COMERCIAL', 'DIRETOR_COMERCIAL', 'CONTRATOS_ASSINATURA'],
    autoApprove: false,
    requiresHuman: true,
  },
  FINANCEIRO: {
    category: 'FINANCEIRO',
    label: 'Financeiro',
    minApproverUserRole: 'GESTOR',
    eligibleApproverJobRoles: ['GERENTE_COMERCIAL', 'DIRETOR_COMERCIAL', 'RECEITA_FATURAMENTO'],
    autoApprove: false,
    requiresHuman: true,
  },
  ASSINATURA: {
    category: 'ASSINATURA',
    label: 'Assinatura',
    minApproverUserRole: 'GESTOR',
    eligibleApproverJobRoles: ['DIRETOR_COMERCIAL', 'CONTRATOS_ASSINATURA'],
    autoApprove: false,
    requiresHuman: true,
  },
  BITRIX_CONFIG: {
    category: 'BITRIX_CONFIG',
    label: 'Configuração Bitrix',
    // MATRIZ nomeia diretamente "ADMIN/GESTOR" (UserRole, não cargo) — sem
    // `eligibleApproverJobRoles` de propósito: qualquer usuário GESTOR+ pode aprovar, igual ao
    // gate real já aplicado a conectar/reconfigurar o Bitrix em `bitrix.routes.ts`.
    minApproverUserRole: 'GESTOR',
    autoApprove: false,
    requiresHuman: true,
  },
};

/** Mapa exaustivo `CapabilityCode -> AccessRequestCategory` — cada uma das capabilities do
 *  catálogo canônico (`capability-catalog.ts`) pertence a exatamente uma categoria da MATRIZ.
 *  Nunca inferido de `domain`/`riskLevel` em runtime (texto livre demais para decidir política de
 *  aprovação com segurança) — mapeamento explícito, verificado exaustivamente no fim deste
 *  arquivo (falha em import-time se o catálogo ganhar uma capability nova sem categoria).
 *
 *  Critério aplicado (documentado para a próxima capability nova precisar só seguir o padrão):
 *   - toda capability `actionType: 'READ'` de domínio não-sensível (CRM/Reuniões/Pipeline-Forecast
 *     básico/Conhecimento/Contratos/Bitrix/Governança de Agentes) -> READ_CONSULTA;
 *   - leitura de domínio financeiro (`billing.read`) NÃO é READ_CONSULTA — dado sensível, mesma
 *     categoria de `billing.reconcile` (FINANCEIRO), a MATRIZ não abre exceção de leitura para
 *     financeiro;
 *   - escrita/execução operacional sobre lead/reunião -> HANDOFF_OPERACIONAL;
 *   - escrita sobre negócio (`deal.update`/`deal.move_stage`) -> DEAL_CHANGES;
 *   - `forecast.explain` -> FORECAST_META (a MATRIZ nomeia "forecast/meta" como categoria própria,
 *     mesmo a capability sendo `riskLevel: LOW` — sensibilidade de categoria, não só de risco);
 *   - `contract.generate` -> CONTRATO; `signature.request` -> ASSINATURA (CRITICAL, humano
 *     obrigatório);
 *   - `billing.*` -> FINANCEIRO;
 *   - `bitrix.write`/`bitrix.configure` -> BITRIX_CONFIG (`bitrix.read` continua READ_CONSULTA);
 *   - `agent.execute`/`agent.request_cross_role` (Governança de Agentes, ações sobre o próprio
 *     motor de agentes) -> HANDOFF_OPERACIONAL (nenhuma categoria de negócio específica se aplica;
 *     mesmo piso de aprovação que qualquer outra ação operacional). Nenhuma delas é
 *     `DESCONTO_PRECO` deste catálogo — a capability de preço/desconto ainda não existe no
 *     catálogo canônico desta fundação (só os exemplos EXATOS do PROMPT 3, ver comentário em
 *     `capability-catalog.ts`); `DESCONTO_PRECO` fica pronta na MATRIZ para quando essa capability
 *     for adicionada, sem precisar de mudança de schema.
 */
export const CAPABILITY_CATEGORY_MAP: Record<CapabilityCode, AccessRequestCategory> = {
  'lead.read': 'READ_CONSULTA',
  'lead.search': 'READ_CONSULTA',
  'lead.enrich': 'HANDOFF_OPERACIONAL',
  'lead.qualify': 'HANDOFF_OPERACIONAL',
  'lead.update': 'HANDOFF_OPERACIONAL',
  'company.read': 'READ_CONSULTA',
  'company.search': 'READ_CONSULTA',
  'meeting.read': 'READ_CONSULTA',
  'meeting.analyze': 'READ_CONSULTA',
  'meeting.schedule': 'HANDOFF_OPERACIONAL',
  'deal.read': 'READ_CONSULTA',
  'deal.analyze': 'READ_CONSULTA',
  'deal.update': 'DEAL_CHANGES',
  'deal.move_stage': 'DEAL_CHANGES',
  'pipeline.read': 'READ_CONSULTA',
  'pipeline.analyze': 'READ_CONSULTA',
  'forecast.read': 'READ_CONSULTA',
  'forecast.explain': 'FORECAST_META',
  'knowledge.search': 'READ_CONSULTA',
  'contract.read': 'READ_CONSULTA',
  'contract.generate': 'CONTRATO',
  'signature.request': 'ASSINATURA',
  'billing.read': 'FINANCEIRO',
  'billing.reconcile': 'FINANCEIRO',
  'bitrix.read': 'READ_CONSULTA',
  'bitrix.write': 'BITRIX_CONFIG',
  'bitrix.configure': 'BITRIX_CONFIG',
  'agent.discover': 'READ_CONSULTA',
  'agent.execute': 'HANDOFF_OPERACIONAL',
  'agent.request_cross_role': 'HANDOFF_OPERACIONAL',
};

export function getAccessRequestCategory(
  capabilityCode: string,
): AccessRequestCategory | undefined {
  return (CAPABILITY_CATEGORY_MAP as Record<string, AccessRequestCategory>)[capabilityCode];
}

export function getApprovalPolicy(category: AccessRequestCategory): ApprovalPolicy {
  return APPROVAL_POLICIES[category];
}

/** "read/consulta: automática quando seguro" — a MATRIZ condiciona a automação da categoria
 *  `READ_CONSULTA` a "seguro", não a incondicional. Aplicado aqui como `riskLevel === 'LOW'` (toda
 *  capability hoje mapeada para `READ_CONSULTA` já é LOW no catálogo canônico — este guard existe
 *  para nunca auto-aprovar silenciosamente se uma capability MEDIUM+ vier a ser remapeada para
 *  esta categoria no futuro sem revisar esta regra). */
export function resolveAutoApproval(
  category: AccessRequestCategory,
  capabilityRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
): boolean {
  const policy = getApprovalPolicy(category);
  return policy.autoApprove && capabilityRiskLevel === 'LOW';
}

/** Um aprovador é elegível para decidir um `AccessRequest` desta categoria quando satisfaz o piso
 *  de `UserRole` E (quando a política restringe por cargo) tem um dos `JobRole` elegíveis como
 *  cargo principal ativo. `hasApproverRole`/`hasEligibleJobRole` são injetados pelo chamador
 *  (`accessRequest.service.ts`) para este módulo de config nunca importar `authorization.ts`'s
 *  `hasRequiredRole` diretamente aqui em cima de dado assíncrono (jobRole vem do banco) — mantém
 *  este arquivo síncrono e puro, mesmo espírito de `role-workspace-definitions.ts`. */
export function isEligibleApprover(
  category: AccessRequestCategory,
  approverUserRole: string,
  approverJobRoleCode: string | null,
): boolean {
  const policy = getApprovalPolicy(category);
  const approverLevel = ROLE_HIERARCHY[approverUserRole as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[policy.minApproverUserRole];
  if (approverLevel < requiredLevel) return false;
  if (!policy.eligibleApproverJobRoles || policy.eligibleApproverJobRoles.length === 0) {
    return true;
  }
  return (
    approverJobRoleCode != null &&
    policy.eligibleApproverJobRoles.includes(approverJobRoleCode as JobRoleCode)
  );
}

for (const entry of CAPABILITY_CATALOG) {
  if (!CAPABILITY_CATEGORY_MAP[entry.code]) {
    throw new Error(`Capability sem categoria de AccessRequest mapeada: ${entry.code}`);
  }
}
