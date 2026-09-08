import type { CapabilityActionType, UserRole } from '@prisma/client';
import { hasRequiredRole, isKnownRole } from '../../../lib/auth/authorization.js';

/**
 * Política superior de UserRole para o Capability Engine.
 *
 * Não cria um RBAC paralelo: reaproveita a hierarquia canônica de
 * `src/lib/auth/authorization.ts` e apenas traduz cada tipo de ação para o
 * menor papel técnico capaz de continuar a avaliação funcional.
 *
 * Importante: passar por esta policy NÃO concede capability. A decisão final
 * ainda exige JobRole + RoleAgentGrant + AgentCapabilityGrant +
 * RoleCapabilityGrant + binding disponível + risco/aprovação.
 */
const MINIMUM_ROLE_BY_ACTION: Record<CapabilityActionType, UserRole> = {
  READ: 'VISUALIZADOR',
  EXECUTE: 'SDR',
  WRITE: 'SDR',
  ADMIN: 'GESTOR',
};

export function canUserRolePerformCapabilityAction(
  userRole: string,
  actionType: CapabilityActionType,
): boolean {
  if (!isKnownRole(userRole)) return false;
  return hasRequiredRole(userRole, [MINIMUM_ROLE_BY_ACTION[actionType]]);
}

export function minimumUserRoleForCapabilityAction(
  actionType: CapabilityActionType,
): UserRole {
  return MINIMUM_ROLE_BY_ACTION[actionType];
}
