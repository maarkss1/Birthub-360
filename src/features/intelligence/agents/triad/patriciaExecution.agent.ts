import type {
  CadenceStep,
  GiselleStrategyPlan,
  NextBestAction,
  PatriciaExecutionPlan,
} from './triad.types';

import { getAiModel } from '../../../../lib/ai/gateway';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

export class PatriciaExecutionAgent {
  public async planExecution(strategy: GiselleStrategyPlan): Promise<PatriciaExecutionPlan> {
    try {
      const ai = getAiModel(
        'groq-llama3-70b',
        0.2,
        'Você é a Patrícia, Especialista em Execução e Outbound.',
      );
      const prompt = new SystemMessage(
        `Gere um plano de execução de próxima melhor ação (Next Best Action) e battlecards para a conta ${strategy.account.companyName}, baseado no plano da Giselle.
Formato esperado:
{
  "nextBestAction": {
    "title": "📞 Ligar para [Nome]",
    "type": "CALL",
    "windowRecommendation": "Sugerir melhor horário (ex: Hoje entre 14h e 16h)",
    "reasons": ["Motivo 1", "Motivo 2"],
    "battlecardHints": ["Dica 1", "Dica 2"],
    "suggestedQuestions": ["Pergunta 1", "Pergunta 2"]
  }
}
RETORNE APENAS JSON VÁLIDO.`,
      );

      const userMsg = new HumanMessage(JSON.stringify(strategy));
      const result = await ai.invoke([prompt, userMsg]);
      const content = result.content || '{}';

      const cleanContent = content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleanContent);

      if (parsed.nextBestAction) {
        const contact = strategy.targetPersona;
        const nba: NextBestAction = {
          actionId: `nba-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: parsed.nextBestAction.title || `📞 Ligar para ${contact.name}`,
          type: parsed.nextBestAction.type || 'CALL',
          accountName: strategy.account.companyName,
          opportunityScore: strategy.scores.opportunity,
          contactName: contact.name,
          contactRole: contact.role,
          contactPhone: contact.phone ?? '+55 11 98765-4321',
          contactEmail: contact.email ?? 'carlos.mendes@empresa.com.br',
          windowRecommendation:
            parsed.nextBestAction.windowRecommendation || strategy.recommendedTiming,
          reasons: parsed.nextBestAction.reasons || [`Score ICP: ${strategy.scores.icp.score}`],
          battlecardHints: parsed.nextBestAction.battlecardHints || [],
          suggestedQuestions: parsed.nextBestAction.suggestedQuestions || [],
        };

        return {
          executionId: `exec-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          strategyId: strategy.strategyId,
          cadence: this.buildCadence(strategy),
          nextBestAction: nba,
          generatedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn(
        '[Patricia] Falha na inferência via AI Gateway, utilizando plano determinístico (fallback).',
        err,
      );
    }

    const cadence = this.buildCadence(strategy);
    const nextBestAction = this.deriveNextBestAction(strategy);

    return {
      executionId: `exec-fallback-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      strategyId: strategy.strategyId,
      cadence,
      nextBestAction,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildCadence(strategy: GiselleStrategyPlan): CadenceStep[] {
    const contactFirst = strategy.targetPersona.name.split(' ')[0];
    const company = strategy.account.companyName;

    return [
      {
        day: 1,
        channel: 'LINKEDIN',
        actionDescription: 'Conexão suave no LinkedIn com nota de contexto de negócio.',
        contentTemplate: `Olá ${contactFirst}, venho acompanhando o crescimento da ${company} no setor e o recente movimento operacional. Conectando por aqui!`,
        status: 'EXECUTED',
      },
      {
        day: 1,
        channel: 'EMAIL',
        actionDescription: 'Email executivo focado na hipótese de dor e validação de cenário.',
        contentTemplate: `Assunto: Eficiência operacional e consolidação na ${company}\n\nOlá ${contactFirst},\n${strategy.valueProposition}\n\n${strategy.suggestedCta}`,
        status: 'EXECUTED',
      },
      {
        day: 2,
        channel: 'PHONE_VOICE',
        actionDescription:
          'Ligação estratégica de descoberta (janela de ouro de retorno pós-email).',
        contentTemplate: `Abertura: "Olá ${contactFirst}, enviei uma mensagem sobre o novo CD em Campinas e a consolidação de dados da frota. Peguei você em um momento oportuno?"`,
        status: 'PENDING',
      },
      {
        day: 4,
        channel: 'WHATSAPP',
        actionDescription: 'Follow-up contextual curto com insights de mercado.',
        contentTemplate: `Oi ${contactFirst}, tudo bem? Compartilho um caso de 2 minutos sobre como reduzimos em 35% o retrabalho em frotas de porte similar à ${company}.`,
        status: 'SCHEDULED',
      },
      {
        day: 6,
        channel: 'PHONE_VOICE',
        actionDescription: 'Segunda tentativa de contato telefônico ou Voice Drop.',
        contentTemplate: `Tentativa de contato com mensagem de voz gravada caso caia na caixa postal.`,
        status: 'WAITING_EVENT',
      },
    ];
  }

  private deriveNextBestAction(strategy: GiselleStrategyPlan): NextBestAction {
    const contact = strategy.targetPersona;
    const oppScore = strategy.scores.opportunity;
    const competitors = strategy.account.competitors;

    const battlecardHints: string[] = [];
    if (competitors.some((c) => c.toLowerCase().includes('senior'))) {
      battlecardHints.push(
        'Senior Sistemas: Diferencial é nossa torre unificada mobile em tempo real sem necessidade de múltiplos módulos contratuais.',
      );
    }
    if (competitors.some((c) => c.toLowerCase().includes('totvs'))) {
      battlecardHints.push(
        'Totvs: Não cobramos customizações pesadas de ERP; plugamos na API e entregamos inteligência preditiva imediata.',
      );
    }

    const suggestedQuestions = [
      'Como a nova expansão regional impactou a capacidade da equipe de acompanhar sinistros e avarias em tempo real?',
      'Hoje vocês conseguem cruzar os custos de manutenção da frota diretamente com a produtividade de cada rota sem conciliação manual?',
      'Essa plataforma que vocês utilizam hoje também consolida indicadores comerciais e operacionais ou vocês precisam combinar várias ferramentas?',
    ];

    return {
      actionId: `nba-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: `📞 Ligar para ${contact.name}`,
      type: 'CALL',
      accountName: strategy.account.companyName,
      opportunityScore: oppScore,
      contactName: contact.name,
      contactRole: contact.role,
      contactPhone: contact.phone ?? '+55 11 98765-4321',
      contactEmail: contact.email ?? 'carlos.mendes@empresa.com.br',
      windowRecommendation: strategy.recommendedTiming,
      reasons: [
        `ICP Score ${strategy.scores.icp.score} (Frota de ${strategy.account.fleetSize} veículos, expansão regional detectada)`,
        'Abriu a proposta comercial enviada 4 vezes nas últimas 24h',
        'Decisor primário de operações e compras identificado e validado',
        '3 dias sem contato registrado do vendedor responsável',
      ],
      battlecardHints,
      suggestedQuestions,
    };
  }
}
