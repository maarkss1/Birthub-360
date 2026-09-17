import { describe, expect, it } from 'vitest';
import { SmartCostAiRouter } from '../../../../src/lib/ai/gateway/smartCostAiRouter.js';

describe('SmartCostAiRouter (Agente 07)', () => {
  it('roteia tarefas de raciocínio complexo para GPT-4o', () => {
    const router = new SmartCostAiRouter();
    const decision = router.routeTask('COMPLEX_REASONING');

    expect(decision.provider).toBe('openai');
    expect(decision.model).toBe('gpt-4o');
    expect(decision.reason).toContain('Diagnóstico complexo');
  });

  it('roteia tarefas de copywriting para Claude 3.5 Sonnet', () => {
    const router = new SmartCostAiRouter();
    const decision = router.routeTask('COPYWRITING');

    expect(decision.provider).toBe('anthropic');
    expect(decision.model).toBe('claude-3-5-sonnet');
    expect(decision.reason).toContain('Redação comercial');
  });

  it('roteia tarefas de classificação rápida para GPT-4o-mini', () => {
    const router = new SmartCostAiRouter();
    const decision = router.routeTask('FAST_CLASSIFICATION');

    expect(decision.provider).toBe('openai');
    expect(decision.model).toBe('gpt-4o-mini');
  });

  it('respeita limites rígidos de orçamento forçando modelos ultra-econômicos', () => {
    const router = new SmartCostAiRouter();
    const decision = router.routeTask('COMPLEX_REASONING', 0.0005);

    expect(decision.provider).toBe('gemini');
    expect(decision.model).toBe('gemini-1.5-flash');
    expect(decision.reason).toContain('Restrição severa de orçamento');
  });
});
