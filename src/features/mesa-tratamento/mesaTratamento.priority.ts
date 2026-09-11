import type { Lead } from '@prisma/client';

/**
 * Ordem de urgência das etapas do funil de Lead (SDR) — quanto menor o índice, mais cedo aparece
 * na fila. `Lead_Desqualificado` e `Convertido_em_Oportunidade` nunca chegam aqui (já filtrados
 * na query — ver mesaTratamento.routes.ts), mas ficam no fim só por segurança caso um dia entrem.
 */
const STAGE_URGENCY: Record<string, number> = {
  Reuniao_Agendada: 0,
  Qualificacao_SDR: 1,
  Cadencia_Iniciada: 2,
  Lead_Recebido: 3,
};

const TEMPERATURE_WEIGHT: Record<string, number> = {
  Quente: 0,
  Morno: 1,
  Frio: 2,
};

function daysSince(date: Date | null): number {
  if (!date) return Number.MAX_SAFE_INTEGER; // nunca tocado = máxima prioridade de resgate
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

/**
 * Ordena a fila do SDR: etapa mais urgente primeiro, depois quem está há mais tempo sem toque
 * (`lastInteraction`), com temperatura como desempate final. Critério simples e auditável — sem
 * pontuação numérica opaca na hora de ORDENAR (mantido assim de propósito: um score único somado
 * poderia inverter esta ordem — ex. muitos dias sem toque numa etapa mais fria pesando mais que
 * uma etapa mais urgente — o que este produto nunca quis). Esta função continua sendo a ÚNICA
 * fonte de verdade da ordem da fila — `computeQueuePriorityScore`, abaixo, é só uma explicação em
 * pontos dos mesmos três fatores, para a UI mostrar "por que este lead está aqui"; não participa
 * do sort e, em casos extremos (ex.: muitos dias sem toque numa etapa menos urgente), pode
 * mostrar um score numérico que não bate exatamente com a posição na fila — isso é esperado, não
 * um bug: a fila sempre respeita etapa primeiro, o score é só pedagógico.
 */
export function rankLeadsForQueue<
  T extends Pick<Lead, 'status' | 'lastInteraction' | 'temperature'>,
>(leads: T[]): T[] {
  return [...leads].sort((a, b) => {
    const stageDiff = (STAGE_URGENCY[a.status] ?? 99) - (STAGE_URGENCY[b.status] ?? 99);
    if (stageDiff !== 0) return stageDiff;

    const touchDiff = daysSince(b.lastInteraction) - daysSince(a.lastInteraction);
    if (touchDiff !== 0) return touchDiff;

    return (
      (TEMPERATURE_WEIGHT[a.temperature ?? ''] ?? 3) -
      (TEMPERATURE_WEIGHT[b.temperature ?? ''] ?? 3)
    );
  });
}

// --- Score de prioridade com detalhamento por fator (AGENTS.md: "Pontuação do lead com
// detalhamento por fator") -----------------------------------------------------------------

/** Pontos de cada etapa (quanto mais urgente, mais pontos) — 0 a 45, o maior peso dos três
 *  fatores, porque etapa é o critério que `rankLeadsForQueue` sempre respeita primeiro. */
const STAGE_POINTS: Record<string, number> = {
  Reuniao_Agendada: 45,
  Qualificacao_SDR: 30,
  Cadencia_Iniciada: 15,
  Lead_Recebido: 5,
};

/** Pontos de temperatura — 0 a 15, o menor peso, porque é o último critério de desempate. */
const TEMPERATURE_POINTS: Record<string, number> = {
  Quente: 15,
  Morno: 8,
  Frio: 0,
};

/** Dias sem toque acima deste teto não somam mais pontos — 120 dias já é "o mais urgente
 *  possível" pra este fator; sem teto, um lead esquecido há anos dominaria a régua de exibição
 *  sem ganho real de informação. */
const DAYS_SINCE_TOUCH_CAP = 120;
/** 40 pontos no teto acima — o segundo maior peso, entre etapa (45) e temperatura (15). */
const DAYS_SINCE_TOUCH_MAX_POINTS = 40;

export interface QueuePriorityScoreBreakdownItem {
  label: string;
  points: number;
  detail: string;
}

export interface QueuePriorityScore {
  /** 0 a 100 — soma dos três fatores abaixo. Só para EXIBIÇÃO (explica por que este lead está
   *  onde está na fila); a ordem real da fila continua vindo de `rankLeadsForQueue`. */
  score: number;
  breakdown: QueuePriorityScoreBreakdownItem[];
}

/**
 * Detalha, por fator, a pontuação de prioridade de UM lead — mesmos três critérios de
 * `rankLeadsForQueue` (etapa, dias sem toque, temperatura), só que como número explicável (0-100)
 * em vez de comparação lexicográfica. Pesos escolhidos na mesma ORDEM de importância do sort real
 * (etapa=45 > dias sem toque=40 > temperatura=15), mas por serem uma SOMA (não uma comparação em
 * cascata), o número pode ocasionalmente não refletir a posição exata na fila — ex.: uma etapa
 * menos urgente com muitos dias sem toque pode somar mais pontos que uma etapa mais urgente recém
 * tocada. Isso é aceitável aqui porque este score é só explicativo (mostra ao SDR/gestão os fatores
 * que pesaram), nunca decide ordem — `rankLeadsForQueue` continua sendo a única fonte de verdade
 * de qual lead vem primeiro.
 */
export function computeQueuePriorityScore(
  lead: Pick<Lead, 'status' | 'lastInteraction' | 'temperature'>,
): QueuePriorityScore {
  const stagePoints = STAGE_POINTS[lead.status] ?? 0;
  const daysSinceTouch = daysSince(lead.lastInteraction);
  const cappedDays = Math.min(daysSinceTouch, DAYS_SINCE_TOUCH_CAP);
  const touchPoints = Math.round((cappedDays / DAYS_SINCE_TOUCH_CAP) * DAYS_SINCE_TOUCH_MAX_POINTS);
  const temperaturePoints = TEMPERATURE_POINTS[lead.temperature ?? ''] ?? 0;

  const breakdown: QueuePriorityScoreBreakdownItem[] = [
    {
      label: 'Etapa do funil',
      points: stagePoints,
      detail: lead.status
        ? `${lead.status.replace(/_/g, ' ')} — quanto mais perto do fechamento, maior a urgência`
        : 'Etapa não reconhecida',
    },
    {
      label: 'Dias sem toque',
      points: touchPoints,
      detail:
        lead.lastInteraction === null
          ? 'Nunca contatado — prioridade máxima de resgate neste fator'
          : `${daysSinceTouch} dia(s) sem contato registrado`,
    },
    {
      label: 'Temperatura',
      points: temperaturePoints,
      detail: lead.temperature ? `Lead classificado como ${lead.temperature}` : 'Sem temperatura definida',
    },
  ];

  return {
    score: stagePoints + touchPoints + temperaturePoints,
    breakdown,
  };
}
