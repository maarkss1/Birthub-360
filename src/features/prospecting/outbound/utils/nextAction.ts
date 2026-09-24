import { Lead } from '../types';

export type NextActionUrgency = 'alta' | 'media' | 'baixa';

export interface NextAction {
  action: string;
  reason: string;
  urgency: NextActionUrgency;
}

const URGENCY_WEIGHT: Record<NextActionUrgency, number> = { alta: 3, media: 2, baixa: 1 };

export function urgencyWeight(urgency: NextActionUrgency): number {
  return URGENCY_WEIGHT[urgency] ?? 0;
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
}

/**
 * Tarefa recomendada por lead: regras determinísticas sobre estágio, tempo parado
 * e o que já foi feito (roteiros gerados, dossiê de notícias, checagem no Bitrix).
 * Não é IA generativa — é a mesma lógica sempre para o mesmo estado do lead, o que
 * é o ponto: previsibilidade em vez de um texto diferente a cada consulta.
 */
export function computeNextAction(lead: Partial<Lead> & { bitrix_check_status?: string }): NextAction {
  const stage = lead.stage || 'prospecto';
  const days = daysSince(lead.created_at);
  const hasCopies = Boolean(lead.copies_generated);
  const isEnriched = Boolean(lead.is_enriched);
  const bitrixStatus = lead.bitrix_check_status;

  if (stage === 'ganho') {
    return { action: 'Nenhuma ação — negócio ganho', reason: 'Lead já convertido em cliente.', urgency: 'baixa' };
  }

  if (stage === 'perdido') {
    return { action: 'Nenhuma ação — negócio perdido', reason: 'Lead encerrado sem conversão.', urgency: 'baixa' };
  }

  if (bitrixStatus === 'existing_client') {
    return {
      action: 'Confirmar relação atual antes de abordar',
      reason: 'Esta empresa já aparece como cliente/contato no Bitrix24 — alinhar com o time antes de tratar como lead novo.',
      urgency: 'alta'
    };
  }

  if (stage === 'prospecto' && !hasCopies) {
    return {
      action: 'Gerar roteiros de abordagem',
      reason: 'Lead novo, ainda sem cold call, e-mail ou WhatsApp preparados.',
      urgency: 'media'
    };
  }

  if (stage === 'prospecto' && hasCopies) {
    return {
      action: 'Fazer o primeiro contato',
      reason: days > 2
        ? `Roteiros prontos há ${days} dias e o primeiro contato ainda não foi feito.`
        : 'Roteiros prontos — falta a primeira ligação, e-mail ou WhatsApp.',
      urgency: days > 2 ? 'alta' : 'media'
    };
  }

  if (stage === 'qualificado') {
    return {
      action: 'Avançar para o primeiro contato',
      reason: 'Lead qualificado aguardando abordagem.',
      urgency: 'media'
    };
  }

  if (stage === 'contatado') {
    if (days >= 3) {
      return {
        action: 'Fazer follow-up — sem retorno',
        reason: `Em contato há ${days} dias sem avançar de estágio.`,
        urgency: 'alta'
      };
    }
    return {
      action: 'Aguardar resposta / preparar follow-up',
      reason: 'Contato recente, ainda dentro do prazo esperado de retorno.',
      urgency: 'baixa'
    };
  }

  if (stage === 'negociacao') {
    if (!isEnriched) {
      return {
        action: 'Enriquecer com dossiê de notícias',
        reason: 'Negociação em andamento sem dossiê de notícias/ganchos comerciais gerado.',
        urgency: 'media'
      };
    }
    return {
      action: 'Confirmar reunião / enviar proposta',
      reason: days >= 5 ? `Negociação parada há ${days} dias — retomar contato.` : 'Negociação ativa com dossiê já preparado.',
      urgency: days >= 5 ? 'alta' : 'media'
    };
  }

  return { action: 'Revisar lead', reason: 'Estágio não reconhecido.', urgency: 'baixa' };
}
