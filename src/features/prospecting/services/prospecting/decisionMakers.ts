import type { DecisionMakerCriteria } from '../apollo.service.js';
import { searchDecisionMakersAdvanced } from '../apollo.service.js';

/**
 * Busca de decisores para uma empresa específica (por domínio).
 */
export async function discoverDecisionMakers(domain: string, criteria: DecisionMakerCriteria) {
  const result = await searchDecisionMakersAdvanced(domain, criteria, 10);
  return { decisionMakers: result.contacts, error: result.error };
}
