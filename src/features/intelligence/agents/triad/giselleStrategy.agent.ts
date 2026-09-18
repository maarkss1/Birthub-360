import type {
  AccountIntelligencePack,
  DecisionMakerInfo,
  GiselleStrategyPlan,
  TransparentScore,
} from './triad.types.js';
import { getAiModel } from '../../../../lib/ai/gateway/chat-model.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

export interface GiselleStrategyInput {
  companyName: string;
  cnpj?: string;
  segment?: string;
  fleetSize?: number;
  estimatedRevenue?: number;
  rawNotes?: string;
  knownDecisionMakers?: DecisionMakerInfo[];
  competitorsMentioned?: string[];
}

export class GiselleStrategyAgent {
  public async generateStrategy(input: GiselleStrategyInput): Promise<GiselleStrategyPlan> {
    const account = this.buildAccountIntelligence(input);

    try {
      const ai = getAiModel(
        'groq-llama3-70b',
        0.2,
        'Você é a Giselle, Head de Inteligência Comercial.',
      );
      const prompt = new SystemMessage(
        `Avalie a conta ${account.companyName} e retorne um plano estratégico em JSON estrito.
Formato esperado:
{
  "scores": {
    "icp": { "score": 90, "reason": "...", "evidence": ["..."], "confidence": 0.9 },
    "fit": { "score": 85, "reason": "...", "evidence": ["..."], "confidence": 0.8 },
    "intent": { "score": 70, "reason": "...", "evidence": ["..."], "confidence": 0.7 },
    "opportunity": { "score": 82, "reason": "...", "evidence": ["..."], "confidence": 0.85 }
  },
  "targetPersona": { "name": "Nome", "role": "Cargo", "seniority": "Seniority", "linkedinUrl": "Url", "email": "email", "phone": "phone" },
  "primaryPain": "Dor principal identificada",
  "valueProposition": "Proposta de valor conectada à dor",
  "recommendedAngle": "Ângulo de abordagem",
  "recommendedChannel": "EMAIL | PHONE | LINKEDIN | WHATSAPP",
  "recommendedTiming": "Quando abordar",
  "suggestedCta": "Chamada para ação"
}
RETORNE APENAS JSON VÁLIDO.`,
      );

      const userMsg = new HumanMessage(JSON.stringify(account));
      const result = await ai.invoke([prompt, userMsg]);
      const content = result.content || '{}';

      // Limpeza de markdown de code block caso a LLM insira
      const cleanContent = content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleanContent);

      if (parsed.scores && parsed.targetPersona) {
        return {
          strategyId: `strat-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          account,
          scores: parsed.scores,
          targetPersona: parsed.targetPersona,
          primaryPain: parsed.primaryPain || this.formulatePainHypothesis(account),
          valueProposition:
            parsed.valueProposition ||
            this.craftValueProposition(account, this.formulatePainHypothesis(account)),
          recommendedAngle:
            parsed.recommendedAngle ||
            this.determineApproachAngle(account, this.formulatePainHypothesis(account)),
          recommendedChannel:
            parsed.recommendedChannel ||
            this.chooseOptimalChannel(parsed.targetPersona, parsed.scores.intent.score),
          recommendedTiming: parsed.recommendedTiming || this.determineOptimalTiming(),
          suggestedCta:
            parsed.suggestedCta || this.createSuggestedCta(parsed.targetPersona, 'PHONE_VOICE'),
          generatedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn(
        '[Giselle] Falha na inferência via AI Gateway, utilizando plano determinístico (fallback).',
        err,
      );
    }

    const scores = this.calculateScores(account);
    const targetPersona = this.selectTargetPersona(account);
    const primaryPain = this.formulatePainHypothesis(account);
    const valueProposition = this.craftValueProposition(account, primaryPain);
    const recommendedAngle = this.determineApproachAngle(account, primaryPain);
    const recommendedChannel = this.chooseOptimalChannel(targetPersona, scores.intent.score);
    const recommendedTiming = this.determineOptimalTiming();
    const suggestedCta = this.createSuggestedCta(targetPersona, recommendedChannel);

    return {
      strategyId: `strat-fallback-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      account,
      scores,
      targetPersona,
      primaryPain,
      valueProposition,
      recommendedAngle,
      recommendedChannel,
      recommendedTiming,
      suggestedCta,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildAccountIntelligence(input: GiselleStrategyInput): AccountIntelligencePack {
    const decisionMakers: DecisionMakerInfo[] =
      input.knownDecisionMakers && input.knownDecisionMakers.length > 0
        ? input.knownDecisionMakers
        : [
            {
              name: 'Carlos Mendes',
              role: 'Diretor de Operações e Logística',
              seniority: 'Director',
              linkedinUrl: 'https://linkedin.com/in/carlos-mendes-log',
              email: 'carlos.mendes@empresa.com.br',
              phone: '+55 11 98765-4321',
            },
          ];

    const competitors =
      input.competitorsMentioned && input.competitorsMentioned.length > 0
        ? input.competitorsMentioned
        : ['Senior Sistemas', 'Totvs Logística'];

    return {
      companyName: input.companyName,
      cnpj: input.cnpj ?? '12.345.678/0001-90',
      domain: `${input.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`,
      segment: input.segment ?? 'Transporte & Logística Rodoviária',
      region: 'Sudeste (São Paulo / Minas Gerais)',
      fleetSize: input.fleetSize ?? 85,
      headcount: 240,
      estimatedRevenue: input.estimatedRevenue ?? 48000000,
      decisionMakers,
      technologies: ['ERP Legado', 'Planilhas Excel', 'Rastreadores Heterogêneos'],
      competitors,
      recentNewsOrEvents: [
        'Abertura de novo centro de distribuição em Campinas/SP',
        'Contratação de 15 novos motoristas agregados no último trimestre',
      ],
      probablePainHypothesis: [
        'Fragmentação operacional entre monitoramento de frota e controle financeiro',
        'Dificuldade de visibilidade em tempo real para tomada de decisão em sinistros',
        'Custo elevado com retrabalho e falta de integração com embarcadores',
      ],
    };
  }

  private calculateScores(account: AccountIntelligencePack): GiselleStrategyPlan['scores'] {
    const isFleetFit = (account.fleetSize ?? 0) >= 30;
    const isRevenueFit = (account.estimatedRevenue ?? 0) >= 10000000;

    const icpScore: TransparentScore = {
      score: isFleetFit && isRevenueFit ? 96 : 78,
      reason: `Empresa no segmento de ${account.segment} com frota de ${account.fleetSize} veículos e faturamento estimado compatível com o ICP ideal.`,
      evidence: [
        `Frota cadastrada/estimada em ${account.fleetSize} veículos (critério ICP: >30 veículos)`,
        `Faturamento estimado de R$ ${((account.estimatedRevenue ?? 0) / 1000000).toFixed(1)}M/ano`,
        `Região prioritária de atendimento: ${account.region}`,
      ],
      confidence: 0.94,
    };

    const fitScore: TransparentScore = {
      score: 89,
      reason:
        'Stack tecnológica atual (ERP legado + planilhas) tem alta aderência para substituição/integração pela Birth Hub 360.',
      evidence: [
        `Tecnologias mapeadas: ${account.technologies.join(', ')}`,
        'Ausência de torre de controle operacional unificada',
      ],
      confidence: 0.88,
    };

    const intentScore: TransparentScore = {
      score: 74,
      reason: 'Sinais de expansão recente e vagas estratégicas abertas para gestão logística.',
      evidence: account.recentNewsOrEvents,
      confidence: 0.82,
    };

    const opportunityScoreValue = Math.round(
      icpScore.score * 0.4 + fitScore.score * 0.35 + intentScore.score * 0.25,
    );

    const opportunityScore: TransparentScore = {
      score: opportunityScoreValue,
      reason: `Prioridade alta (${opportunityScoreValue}/100): alinhamento de frota e dor de fragmentação operacional confirmada.`,
      evidence: [
        `ICP Score consolidado: ${icpScore.score}`,
        `Fit Tecnológico: ${fitScore.score}`,
        `Sinais de Intenção: ${intentScore.score}`,
      ],
      confidence: 0.91,
    };

    return {
      icp: icpScore,
      fit: fitScore,
      intent: intentScore,
      opportunity: opportunityScore,
    };
  }

  private selectTargetPersona(account: AccountIntelligencePack): DecisionMakerInfo {
    const preferred = account.decisionMakers.find(
      (dm) => dm.role.toLowerCase().includes('opera') || dm.role.toLowerCase().includes('log'),
    );
    return preferred ?? account.decisionMakers[0];
  }

  private formulatePainHypothesis(account: AccountIntelligencePack): string {
    return account.probablePainHypothesis[0] ?? 'Fragmentação de processos e dados operacionais.';
  }

  private craftValueProposition(account: AccountIntelligencePack, pain: string): string {
    return `Unificar a gestão de frota de ${account.fleetSize} veículos e dados operacionais em uma torre única, eliminando a ${pain.toLowerCase()} e reduzindo o tempo de resposta em ocorrências em até 40%.`;
  }

  private determineApproachAngle(_account: AccountIntelligencePack, _pain: string): string {
    return `Abordar pelo recente crescimento da frota e abertura de CD, questionando como estão sustentando a governança operacional sem sobrecarregar a equipe com ferramentas desconexas.`;
  }

  private chooseOptimalChannel(
    persona: DecisionMakerInfo,
    intentScore: number,
  ): GiselleStrategyPlan['recommendedChannel'] {
    if (intentScore >= 70 && persona.phone) {
      return 'PHONE_VOICE';
    }
    return 'EMAIL';
  }

  private determineOptimalTiming(): string {
    return 'Hoje entre 10h00 e 11h30 (janela de maior assertividade para Diretores Operacionais)';
  }

  private createSuggestedCta(
    persona: DecisionMakerInfo,
    channel: GiselleStrategyPlan['recommendedChannel'],
  ): string {
    if (channel === 'PHONE_VOICE') {
      return `Olá ${persona.name.split(' ')[0]}, notei a recente expansão das operações da empresa e gostaria de entender como vocês estão lidando com a consolidação dos dados de telemetria e sinistros na nova estrutura.`;
    }
    return `Podemos reservar 15 minutos na quinta-feira às 10h para compartilhar como empresas com frota similar resolveram a fragmentação operacional?`;
  }
}
