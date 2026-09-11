import type { QueueLeadDetail } from './mesaTratamento.api';

/**
 * Sugestão de abordagem ("script coach") — portada do protótipo standalone `acompanhamento-sdr`
 * (`abordagemSugerida()`, templates por estágio do Bitrix com nome do contato interpolado ao
 * vivo), mas adaptada ao modelo de qualificação do Birth Hub 360 em vez dos rótulos genéricos de
 * etapa do protótipo original.
 *
 * Deliberadamente NÃO usa IA (nenhuma chamada ao gateway de IA, `src/lib/ai/gateway.ts`): a Mesa
 * de Tratamento é um fluxo cronometrado (Pomodoro) onde o SDR precisa da sugestão instantaneamente
 * ao abrir o lead, não depois de esperar uma resposta de LLM — e o dado necessário (etapa,
 * qualificação já registrada, dias sem toque, temperatura) já está inteiramente disponível no
 * `QueueLeadDetail` que a tela já carregou, sem chamada extra ao backend. Mesmo princípio "simples
 * e auditável" já adotado em `mesaTratamento.priority.ts` para a fila.
 */

export interface ApproachSuggestion {
  headline: string;
  talkingPoints: string[];
}

function contactLabel(lead: QueueLeadDetail): string {
  if (lead.contactName) return lead.contactRole ? `${lead.contactName} (${lead.contactRole})` : lead.contactName;
  return 'o decisor';
}

/** Reconexão entra antes do roteiro de etapa quando o lead está esfriando há um tempo — mesmo
 *  sinal que `computeQueuePriorityScore` usa para "dias sem toque", aqui como texto de abertura. */
function reconnectionOpener(lead: QueueLeadDetail): string | null {
  if (lead.daysSinceTouch === null) {
    return `Primeiro contato com este lead — não presuma que ${contactLabel(lead)} já conhece o Birth Hub 360.`;
  }
  if (lead.daysSinceTouch >= 14) {
    return `Já se passaram ${lead.daysSinceTouch} dias sem contato — reconecte antes de avançar: relembre o motivo da conversa anterior em vez de retomar como se fosse contínuo.`;
  }
  if (lead.daysSinceTouch >= 5) {
    return `${lead.daysSinceTouch} dias sem toque — confirme se ainda é um bom momento antes de aprofundar.`;
  }
  return null;
}

function stageSuggestion(lead: QueueLeadDetail): ApproachSuggestion {
  const q = lead.qualification;
  const hasQualification = !!q && Object.values(q).some((v) => !!v);
  const contact = contactLabel(lead);

  switch (lead.status) {
    case 'Lead_Recebido':
      return {
        headline: `Primeiro contato — descubra a dor antes de falar de produto`,
        talkingPoints: [
          `Confirme que está falando com ${contact} e apresente-se em 1 frase (quem você é, de onde é).`,
          'Pergunta aberta: "o que fez vocês buscarem uma solução como essa agora?" — deixe o lead nomear a dor antes de você nomear a solução.',
          lead.segment
            ? `Segmento "${lead.segment}" — cite um caso de sucesso próximo desse segmento se tiver à mão.`
            : 'Confirme o segmento/porte da empresa — ainda não está registrado.',
          'Feche a ligação com um próximo passo concreto (nova ligação, reunião, envio de material), nunca "vou aguardar retorno".',
        ],
      };
    case 'Cadencia_Iniciada':
      return {
        headline: 'Em cadência — seja direto e confirme o momento',
        talkingPoints: [
          `Referencie a tentativa de contato anterior com ${contact} antes de repetir a apresentação.`,
          'Pergunta de qualificação rápida: confirme se o momento é bom e se ainda há interesse ativo.',
          'Se não atender: deixe uma mensagem/e-mail curto e objetivo, sem repetir tudo que já foi dito na tentativa anterior.',
        ],
      };
    case 'Qualificacao_SDR':
      return hasQualification
        ? {
            headline: 'Qualificação em andamento — aprofunde o que já foi levantado',
            talkingPoints: [
              q?.dorPrincipal
                ? `Dor já registrada: "${q.dorPrincipal}" — confirme se ainda é a principal ou se mudou.`
                : 'Ainda sem dor principal registrada — priorize descobrir isso nesta ligação.',
              q?.nivelAutoridade
                ? `Autoridade registrada como "${q.nivelAutoridade}" — confirme quem mais participa da decisão.`
                : 'Autoridade do decisor ainda não confirmada — pergunte quem mais precisa aprovar.',
              q?.horizonteDecisao
                ? `Horizonte de decisão: "${q.horizonteDecisao}" — use isso para calibrar a urgência da proposta.`
                : 'Horizonte de decisão ainda não confirmado — pergunte "quando vocês pretendem decidir isso?"',
              'Se BANT estiver completo (orçamento, autoridade, necessidade, tempo), proponha agendar a reunião agora, nesta ligação.',
            ],
          }
        : {
            headline: 'Qualificação em andamento — sem dado registrado ainda',
            talkingPoints: [
              'Foque em descobrir orçamento, autoridade, necessidade e urgência (BANT) nesta ligação.',
              `Pergunte a ${contact} quem mais participa da decisão de compra.`,
              'Registre o que descobrir no card do lead assim que desligar — a próxima ligação já parte daqui.',
            ],
          };
    case 'Reuniao_Agendada': {
      const when = lead.nextAction
        ? new Date(lead.nextAction).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : null;
      return {
        headline: 'Reunião já agendada — confirme presença e prepare a agenda',
        talkingPoints: [
          when
            ? `Confirme a presença para ${when} — reforce o valor combinado antes da data, não só no dia.`
            : 'Confirme data/hora da reunião — ainda não está registrada no card.',
          q?.temaProximaReuniao
            ? `Tema combinado: "${q.temaProximaReuniao}" — prepare os materiais específicos para isso, não uma apresentação genérica.`
            : 'Nenhum tema específico combinado — alinhe a pauta com o contato antes da reunião.',
          'Se o lead pedir para remarcar: entenda o motivo antes de aceitar — pode ser sinal de baixa prioridade.',
        ],
      };
    }
    default:
      return {
        headline: 'Sem roteiro específico para esta etapa',
        talkingPoints: ['Etapa não reconhecida pelo assistente — siga o processo comercial padrão.'],
      };
  }
}

export function suggestApproach(lead: QueueLeadDetail): ApproachSuggestion {
  const base = stageSuggestion(lead);
  const opener = reconnectionOpener(lead);
  const coldNote =
    lead.temperature === 'Frio'
      ? 'Lead frio — priorize reengajar/qualificar antes de tentar avançar de etapa.'
      : null;

  return {
    headline: base.headline,
    talkingPoints: [opener, ...base.talkingPoints, coldNote].filter(
      (v): v is string => !!v,
    ),
  };
}
