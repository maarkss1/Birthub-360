import { ROLE_HIERARCHY, type Role } from '../../../lib/auth/authorization.js';

// PROMPT 10 — Agent Builder / Fábrica de Agentes. Política como código (mesma decisão de
// `access-request-policy.ts`/`memory-policy.ts`): nunca uma tabela nova só para configuração fixa.

/** Piso de `UserRole` para decidir (aprovar para desenvolvimento / rejeitar) um
 *  `AgentBuildProposal` — mesmo piso de quem decide categoria sensível de memória (PROMPT 9):
 *  "vale a pena desenvolver um agente/capability novo" é uma decisão de governança, nunca deixada
 *  para qualquer usuário autenticado. */
export const MIN_REVIEWER_USER_ROLE: Role = 'GESTOR';

export function isEligibleReviewer(reviewerUserRole: string): boolean {
  const level = ROLE_HIERARCHY[reviewerUserRole as Role] ?? 0;
  return level >= ROLE_HIERARCHY[MIN_REVIEWER_USER_ROLE];
}

/** As 9 dimensões de EVALS do prompt da onda, exatamente — `riskReview` (gerado por
 *  `computeRiskReview` em `agentBuilder.service.ts`) sempre preenche todas, nunca um subconjunto
 *  arbitrário. Cada dimensão é avaliada por um heurística determinística e real (nunca uma nota
 *  fabricada/vinda de IA) — "não pode: inventar fonte" aplica-se também à própria revisão de
 *  risco, não só ao spec do agente. */
export const RISK_REVIEW_DIMENSIONS = [
  'groundedness',
  'evidenceCoverage',
  'forbiddenCapability',
  'hallucinatedNumbers',
  'tenantIsolation',
  'unsafeWrite',
  'promptInjection',
  'missingSource',
  'rollbackVersion',
] as const;

export type RiskReviewDimension = (typeof RISK_REVIEW_DIMENSIONS)[number];
