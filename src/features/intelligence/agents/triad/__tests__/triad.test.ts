import { describe, expect, it, vi } from 'vitest';
import { GiselleStrategyAgent } from '../giselleStrategy.agent.js';
import { PatriciaExecutionAgent } from '../patriciaExecution.agent.js';
import { GuardiaoGovernanceAgent } from '../guardiaoGovernance.agent.js';
import { TagarelaRouterService } from '../tagarelaRouter.service.js';
import { classifyAgentFromCatalog, CORE_AND_SPECIALIST_TAXONOMY } from '../agentGraphTaxonomy.js';

// Mock do Gateway de IA para não fazer chamadas de rede durante os testes da tríade
vi.mock('../../../lib/ai/gateway/chat-model.js', () => ({
  getAiModel: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        icpScore: 96,
        fitScore: 82,
        intentScore: 75,
        opportunityScore: 88,
        reasoning: "Score calculado com sucesso"
      })
    })
  })
}));

describe('Tríade de Comando do Agente Comercial de Elite', () => {
  describe('GiselleStrategyAgent', () => {
    it('deve gerar estratégia com scores transparentes contendo score, reason, evidence e confidence', async () => {
      const agent = new GiselleStrategyAgent();
      const plan = await agent.generateStrategy({
        companyName: 'ACME Logística S/A',
        fleetSize: 85,
        estimatedRevenue: 48000000,
      });

      expect(plan.strategyId).toBeDefined();
      expect(plan.account.companyName).toBe('ACME Logística S/A');

      // Verifica contrato de score transparente
      const scores = [plan.scores.icp, plan.scores.fit, plan.scores.intent, plan.scores.opportunity];
      for (const score of scores) {
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
        expect(score.reason.length).toBeGreaterThan(10);
        expect(score.evidence.length).toBeGreaterThan(0);
        expect(score.confidence).toBeGreaterThan(0);
        expect(score.confidence).toBeLessThanOrEqual(1);
      }

      // Persona e proposta de valor
      expect(plan.targetPersona.name).toBeDefined();
      expect(plan.primaryPain).toBeDefined();
      expect(plan.valueProposition).toContain('frota');
      expect(plan.recommendedTiming).toBeDefined();
    });
  });

  describe('PatriciaExecutionAgent', () => {
    it('deve montar cadência adaptativa e Next Best Action com batalha de objeções e perguntas', async () => {
      const giselle = new GiselleStrategyAgent();
      const strategy = await giselle.generateStrategy({
        companyName: 'TransSul Transportes',
        fleetSize: 45,
        competitorsMentioned: ['Senior Sistemas'],
      });

      const patricia = new PatriciaExecutionAgent();
      const execution = await patricia.planExecution(strategy);

      expect(execution.executionId).toBeDefined();
      expect(execution.cadence.length).toBeGreaterThanOrEqual(4);

      const nba = execution.nextBestAction;
      expect(nba.type).toBe('CALL');
      expect(nba.contactName).toBeDefined();
      expect(nba.windowRecommendation).toBeDefined();
      expect(nba.reasons.length).toBeGreaterThan(0);
      expect(nba.battlecardHints).toBeDefined();
      expect(nba.suggestedQuestions?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GuardiaoGovernanceAgent', () => {
    const guardiao = new GuardiaoGovernanceAgent();

    it('deve aprovar desconto de até 8% diretamente para Closer', () => {
      const verdict = guardiao.evaluateDiscountPolicy({
        userRole: 'CLOSER',
        requestedDiscountPercent: 5,
        dealValue: 50000,
      });
      expect(verdict.verdict).toBe('APPROVED');
      expect(verdict.ruleId).toBe('DISCOUNT_SELLER_ALCADA_OK');
    });

    it('deve exigir aprovação de Gerente para desconto entre 8% e 15% pedido por Closer', () => {
      const verdict = guardiao.evaluateDiscountPolicy({
        userRole: 'CLOSER',
        requestedDiscountPercent: 12,
        dealValue: 50000,
      });
      expect(verdict.verdict).toBe('REQUIRES_APPROVAL');
      expect(verdict.requiredRoleForApproval).toBe('GERENTE');
    });

    it('deve exigir aprovação de Diretor para desconto acima de 15% pedido por Closer', () => {
      const verdict = guardiao.evaluateDiscountPolicy({
        userRole: 'CLOSER',
        requestedDiscountPercent: 20,
        dealValue: 50000,
      });
      expect(verdict.verdict).toBe('REQUIRES_APPROVAL');
      expect(verdict.requiredRoleForApproval).toBe('DIRETOR');
    });

    it('deve rejeitar automaticamente desconto acima do teto de 25%', () => {
      const verdict = guardiao.evaluateDiscountPolicy({
        userRole: 'DIRETOR',
        requestedDiscountPercent: 30,
        dealValue: 50000,
      });
      expect(verdict.verdict).toBe('REJECTED');
      expect(verdict.ruleId).toBe('DISCOUNT_MAX_CEILING_EXCEEDED');
    });

    it('deve auditar conformidade LGPD e integridade CRM', () => {
      const piiOk = guardiao.evaluatePiiAndConsent({
        hasConsent: true,
        containsSensitiveData: false,
      });
      expect(piiOk.verdict).toBe('APPROVED');

      const piiBlocked = guardiao.evaluatePiiAndConsent({
        hasConsent: false,
        containsSensitiveData: true,
      });
      expect(piiBlocked.verdict).toBe('REQUIRES_APPROVAL');

      const crmEmpty = guardiao.evaluateCrmIntegrity({ companyName: '' });
      expect(crmEmpty.verdict).toBe('REJECTED');

      const crmOk = guardiao.evaluateCrmIntegrity({ companyName: 'Logística Alfa' });
      expect(crmOk.verdict).toBe('APPROVED');
    });
  });

  describe('TagarelaRouterService', () => {
    it('deve orquestrar missão completa e gerar o grafo de rastreamento do Agent Center', async () => {
      const router = new TagarelaRouterService();
      const response = await router.runCommercialMission({
        accountName: 'Expresso Sudeste S/A',
        fleetSize: 120,
        estimatedRevenue: 75000000,
        userRole: 'CLOSER',
        requestedDiscountPercent: 6,
      });

      expect(response.missionId).toBeDefined();
      expect(response.strategy.scores.opportunity.score).toBeGreaterThan(70);
      expect(response.execution.nextBestAction).toBeDefined();

      const trace = response.trace;
      expect(trace.root).toContain('Tagarela');
      expect(trace.directors.giselle.status).toBe('COMPLETED');
      expect(trace.directors.giselle.specialists.length).toBeGreaterThan(0);
      expect(trace.directors.patricia.status).toBe('COMPLETED');
      expect(trace.directors.guardiao.status).toBe('COMPLETED');
    });
  });

  describe('Agent Graph Taxonomy', () => {
    it('deve classificar agentes da malha nas camadas Core, Specialist, Skill e Tool', () => {
      expect(CORE_AND_SPECIALIST_TAXONOMY['tagarela-supervisor'].layer).toBe('CORE');
      expect(CORE_AND_SPECIALIST_TAXONOMY['giselle-strategy'].layer).toBe('CORE');
      expect(CORE_AND_SPECIALIST_TAXONOMY['patricia-execution'].layer).toBe('CORE');
      expect(CORE_AND_SPECIALIST_TAXONOMY['guardiao-governance'].layer).toBe('CORE');
      expect(CORE_AND_SPECIALIST_TAXONOMY['icp-analyst'].layer).toBe('SPECIALIST');
      expect(CORE_AND_SPECIALIST_TAXONOMY['outbound-specialist'].layer).toBe('SPECIALIST');

      const emailWriter = classifyAgentFromCatalog('cold-email-writer');
      expect(emailWriter.layer).toBe('SKILL');

      const bitrixSync = classifyAgentFromCatalog('bitrix-data-sync');
      expect(bitrixSync.layer).toBe('TOOL');
    });
  });
});
