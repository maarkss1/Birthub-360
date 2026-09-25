import type { MemoryCategory } from '@prisma/client';
import { ROLE_HIERARCHY, type Role } from '../../../lib/auth/authorization.js';

// PROMPT 9 — Memória + Aprendizado Contínuo Governado. `MemoryCategory` (a MATRIZ do prompt da
// onda) é CÓDIGO, não tabela — mesma decisão de `access-request-policy.ts`/`tool-bindings.ts`:
// política fixa de governança do produto.
//
// "Memória aprovada sensível requer humano: pricing, discount, forecast rule, contract, finance,
// compliance, write automation, capability" (texto literal do prompt da onda) — as 8 categorias
// abaixo, exatamente. `OPERATIONAL` é a única categoria elegível a aprovação automática, e mesmo
// assim nunca quando a sanitização de PII (`LgpdSanitizerService`) sinaliza revisão manual — ver
// `resolveAutoApproval`.
const SENSITIVE_CATEGORIES: readonly MemoryCategory[] = [
  'PRICING',
  'DISCOUNT',
  'FORECAST_RULE',
  'CONTRACT',
  'FINANCE',
  'COMPLIANCE',
  'WRITE_AUTOMATION',
  'CAPABILITY',
];

export function requiresHumanDecision(category: MemoryCategory): boolean {
  return SENSITIVE_CATEGORIES.includes(category);
}

/** Piso de `UserRole` (autoridade técnica real, mesmo espírito de `MIN_ROLE_BY_ACTION_TYPE` em
 *  `capabilityAuthorization.service.ts`) para DECIDIR (aprovar/rejeitar) um `LearningCandidate` —
 *  categorias sensíveis exigem GESTOR+; `OPERATIONAL` só exige SDR+ (mesmo piso mínimo de
 *  execução do Capability Engine). */
export function minDeciderUserRole(category: MemoryCategory): Role {
  return requiresHumanDecision(category) ? 'GESTOR' : 'SDR';
}

export function isEligibleDecider(category: MemoryCategory, deciderUserRole: string): boolean {
  const level = ROLE_HIERARCHY[deciderUserRole as Role] ?? 0;
  return level >= ROLE_HIERARCHY[minDeciderUserRole(category)];
}

/** Aprovação automática (SYSTEM) — só `OPERATIONAL` E só quando a sanitização de PII não sinalizou
 *  revisão manual. Nunca para categoria sensível, mesmo que o conteúdo já esteja limpo — a MATRIZ
 *  do prompt da onda não abre exceção por "sensibilidade baixa dentro da categoria", só por
 *  categoria inteira (mesmo critério de `resolveAutoApproval` em `access-request-policy.ts`). */
export function resolveMemoryAutoApproval(
  category: MemoryCategory,
  sanitizationRequiresManualReview: boolean,
): boolean {
  return category === 'OPERATIONAL' && !sanitizationRequiresManualReview;
}
