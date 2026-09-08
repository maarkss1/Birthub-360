import { getToolBinding, type ToolBinding } from './toolBindings.js';

export type ToolBindingVerification = 'VERIFIED' | 'UNVERIFIED';

export interface EffectiveToolBinding extends ToolBinding {
  verification: ToolBindingVerification;
  evidencePath: string | null;
}

interface VerifiedBindingEvidence {
  binding: string;
  evidencePath: string;
}

/**
 * Allowlist conservadora de bindings comprovados no código atual.
 *
 * O catálogo bruto de `toolBindings.ts` é descritivo e pode conter nomes
 * conceituais. O Capability Engine nunca deve transformar um nome conceitual
 * em permissão executável. Somente entradas desta allowlist podem sair como
 * `available: true` para autorização.
 *
 * Esta lista deve crescer apenas quando o símbolo/operação real for
 * localizado no repositório e coberto por teste.
 */
export const VERIFIED_TOOL_BINDINGS: Readonly<Record<string, VerifiedBindingEvidence>> = {
  'account.read': {
    binding: 'AccountIntelligenceService.getIntelligence',
    evidencePath: 'src/features/market-intelligence/server/accountIntelligence.service.ts',
  },
  'account.research': {
    binding: 'AccountIntelligenceService.getIntelligence',
    evidencePath: 'src/features/market-intelligence/server/accountIntelligence.service.ts',
  },
  'forecast.read': {
    binding: 'CommercialIntelligenceUseCases.executiveOverview',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'forecast.explain': {
    binding: 'CommercialIntelligenceUseCases.forecastExplain',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'revenue.read': {
    binding: 'CommercialIntelligenceUseCases.executiveOverview',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'revenue.analyze': {
    binding: 'CommercialIntelligenceAiService.generateExecutiveSummary',
    evidencePath:
      'src/features/commercial-intelligence/infra/CommercialIntelligenceAiService.ts',
  },
  'coverage.read': {
    binding: 'CommercialIntelligenceUseCases.executiveOverview',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'conversion.read': {
    binding: 'CommercialIntelligenceUseCases.performance',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'sales_cycle.read': {
    binding: 'CommercialIntelligenceUseCases.performance',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'aging.read': {
    binding: 'CommercialIntelligenceUseCases.aging',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'loss.read': {
    binding: 'CommercialIntelligenceUseCases.losses',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'health_score.read': {
    binding: 'CommercialIntelligenceUseCases.healthScore',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'executive.read': {
    binding: 'CommercialIntelligenceUseCases.executiveOverview',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'performance.read': {
    binding: 'CommercialIntelligenceUseCases.performance',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'alert.read': {
    binding: 'CommercialIntelligenceUseCases.alerts',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'goal.read': {
    binding: 'CommercialIntelligenceUseCases.getGoal',
    evidencePath:
      'src/features/commercial-intelligence/application/CommercialIntelligenceUseCases.ts',
  },
  'churn.analyze': {
    binding: 'ChurnPredictionService.analyzeChurnRisk',
    evidencePath: 'src/features/analytics/services/churn-prediction.service.ts',
  },
  'agent.discover': {
    binding: 'AgentCatalogService.listAgentDefinitions',
    evidencePath: 'src/features/job-roles/services/agentCatalog.service.ts',
  },
};

export function getVerifiedToolBinding(
  capabilityCode: string,
): EffectiveToolBinding | undefined {
  const raw = getToolBinding(capabilityCode);
  if (!raw) return undefined;

  const verified = VERIFIED_TOOL_BINDINGS[capabilityCode];
  if (verified) {
    return {
      ...raw,
      binding: verified.binding,
      available: true,
      reason: 'AVAILABLE',
      verification: 'VERIFIED',
      evidencePath: verified.evidencePath,
    };
  }

  if (raw.reason === 'SOURCE_REQUIRED') {
    return {
      ...raw,
      available: false,
      verification: 'UNVERIFIED',
      evidencePath: null,
    };
  }

  return {
    ...raw,
    available: false,
    reason: 'FUTURE_TOOL',
    verification: 'UNVERIFIED',
    evidencePath: null,
  };
}
