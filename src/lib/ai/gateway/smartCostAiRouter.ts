export type AiTaskType = 'COMPLEX_REASONING' | 'COPYWRITING' | 'FAST_CLASSIFICATION';

export interface ModelRouteDecision {
  provider: 'openai' | 'anthropic' | 'gemini';
  model: string;
  reason: string;
  estimatedCostPer1kTokens: number;
}

export class SmartCostAiRouter {
  /**
   * Roteia a solicitação de IA para o modelo ideal considerando o tipo de tarefa e orçamento.
   */
  routeTask(taskType: AiTaskType, maxBudgetUsdPerCall?: number): ModelRouteDecision {
    if (maxBudgetUsdPerCall && maxBudgetUsdPerCall < 0.001) {
      return {
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        reason: 'Restrição severa de orçamento ativada',
        estimatedCostPer1kTokens: 0.00015,
      };
    }

    switch (taskType) {
      case 'COMPLEX_REASONING':
        return {
          provider: 'openai',
          model: 'gpt-4o',
          reason: 'Diagnóstico complexo e raciocínio multi-etapa exigem alta precisão',
          estimatedCostPer1kTokens: 0.005,
        };
      case 'COPYWRITING':
        return {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet',
          reason: 'Redação comercial e tom de voz fluido e persuasivo',
          estimatedCostPer1kTokens: 0.003,
        };
      default:
        return {
          provider: 'openai',
          model: 'gpt-4o-mini',
          reason: 'Classificação rápida de intenção e extração de baixo custo',
          estimatedCostPer1kTokens: 0.0003,
        };
    }
  }
}

export const smartCostAiRouter = new SmartCostAiRouter();
