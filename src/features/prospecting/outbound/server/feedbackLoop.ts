// Wave 13 (CPI) — Feedback Loop.
//
// Esta é a única onda do pacote CPI sem um arquivo de especificação dedicado
// (ver `21_RELEASE_EM_ONDAS.txt`): a única descrição existente é a linha do
// roadmap geral —
//   "WAVE 13 — FEEDBACK LOOP: feedback SDR; ganho/perdido; motivo;
//    calibração de score; aprendizado controlado."
// O escopo abaixo foi definido a partir dessa linha + do que já existia
// parcialmente implementado no código antes desta onda: `messages.feedback`
// (Wave 0/pré-CPI, se o roteiro de IA foi usado como veio/editado/não usado)
// e `leads.loss_reason` (motivo de perda estruturado). Esta onda adiciona o
// par simétrico que faltava — `leads.win_reason` — e expõe agregações sobre
// os três.
//
// DECISÃO DE DESIGN — "calibração de score" e "aprendizado controlado":
// este módulo NUNCA ajusta peso, prompt ou score sozinho. Ele só calcula
// estatísticas agregadas, honestas e determinísticas, a partir de histórico
// já capturado, para que uma pessoa decida manualmente se e como ajustar
// pesos/prompts. Um sistema de auto-ajuste automático sem supervisão
// violaria a regra 14 do prompt mestre do pacote CPI ("Não alterar
// comportamento de produção sem testes") e a regra 15 ("Não fazer deploy sem
// autorização explícita") — mudar o comportamento de scoring/geração de
// roteiro em produção, sozinho, a partir de uma agregação estatística, é
// exatamente esse tipo de mudança não controlada. "Aprendizado controlado"
// aqui significa: os dados de aprendizado existem, são honestos, e o
// controle (a decisão de agir sobre eles) permanece humano.
//
// PLUGABILIDADE FUTURA (Wave 8 — Scoring): quando a Wave 8 (scoring de
// Fit/Intent/Data Quality) estiver mesclada, ela pode consumir
// `buildFeedbackSummary()` como um insumo read-only para um painel de
// calibração — por exemplo, comparar a taxa de conversão por segmento com o
// Fit Score médio daquele segmento, e sinalizar para um humano quando os
// dois divergem muito (sinal de que os pesos do Fit Score podem estar
// desalinhados com o que realmente converte). Nenhuma dependência de
// `server/scoring.ts` foi adicionada aqui porque esse módulo pode não
// existir ainda neste worktree — a integração é responsabilidade da onda
// que mesclar as duas por último.

// --- Tipos de entrada: registros "achatados", desacoplados do shape exato
// de linha do Postgres, para que as funções de agregação sejam puras e
// testáveis com objetos sintéticos (sem precisar de um banco real). ---

export interface FeedbackMessageRecord {
  channel: string | null | undefined;
  feedback?: string | null;
}

export interface FeedbackLeadRecord {
  stage?: string | null;
  loss_reason?: string | null;
  win_reason?: string | null;
  segment?: string | null;
  company?: string | null;
}

// Canais que de fato recebem um roteiro de IA + feedback de uso (ver
// VALID_COPY_FEEDBACK em server/routes.ts). Os demais canais gerados
// (objection_matrix, qualification_matrix, ice_breaker) não têm hoje um
// endpoint de feedback próprio, então ficam fora da agregação por canal
// para não fingir que há dado onde não há.
export const COPY_FEEDBACK_CHANNELS = ['cold_call', 'cold_email', 'whatsapp', 'linkedin'] as const;
export type CopyFeedbackChannel = typeof COPY_FEEDBACK_CHANNELS[number];

export const VALID_COPY_FEEDBACK_VALUES = ['used_as_is', 'edited', 'not_used'] as const;

// Abaixo de quantas amostras uma estatística agregada é honesta o bastante
// para ser mostrada como "confiável"? Não há resposta matematicamente única
// — este é um limiar operacional conservador (poucas dezenas de leads por
// campanha é normal neste negócio), documentado aqui em vez de escondido:
// abaixo dele, `insufficientData` fica `true`, mas os números brutos ainda
// são devolvidos (nunca escondidos, só marcados como pouco confiáveis).
export const MIN_SAMPLE_SIZE = 5;

export interface CopyFeedbackChannelSummary {
  channel: CopyFeedbackChannel;
  totalWithFeedback: number;
  usedAsIs: number;
  edited: number;
  notUsed: number;
  usedAsIsRate: number | null;
  editedRate: number | null;
  notUsedRate: number | null;
  insufficientData: boolean;
}

export interface ReasonCount {
  reason: string;
  count: number;
  share: number; // 0..1 do total de motivos registrados naquela lista
}

export interface ReasonSummary {
  totalWithReason: number;
  reasons: ReasonCount[];
  insufficientData: boolean;
}

export interface ConversionRateEntry {
  key: string;
  won: number;
  lost: number;
  total: number;
  conversionRate: number | null; // won / (won + lost); null quando total === 0
  insufficientData: boolean;
}

export interface ConversionRateSummary {
  entries: ConversionRateEntry[];
  insufficientData: boolean;
}

export interface FeedbackSummary {
  copyFeedbackByChannel: CopyFeedbackChannelSummary[];
  lossReasons: ReasonSummary;
  winReasons: ReasonSummary;
  conversionBySegment: ConversionRateSummary;
  conversionByCompany: ConversionRateSummary;
  generatedAt: string;
}

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * % de roteiros por canal (cold_call/cold_email/whatsapp/linkedin) que
 * foram 'usado como veio' vs. 'editado' vs. 'não usado', a partir de
 * `messages.feedback`. Mensagens sem feedback registrado (vendedor ainda
 * não respondeu) são excluídas do denominador — contá-las como "não usado"
 * fabricaria um dado que ninguém informou.
 */
export function summarizeCopyFeedbackByChannel(
  messages: FeedbackMessageRecord[]
): CopyFeedbackChannelSummary[] {
  return COPY_FEEDBACK_CHANNELS.map(channel => {
    const withFeedback = messages.filter(
      m => m.channel === channel && m.feedback && (VALID_COPY_FEEDBACK_VALUES as readonly string[]).includes(m.feedback)
    );
    const total = withFeedback.length;
    const usedAsIs = withFeedback.filter(m => m.feedback === 'used_as_is').length;
    const edited = withFeedback.filter(m => m.feedback === 'edited').length;
    const notUsed = withFeedback.filter(m => m.feedback === 'not_used').length;

    return {
      channel,
      totalWithFeedback: total,
      usedAsIs,
      edited,
      notUsed,
      usedAsIsRate: total > 0 ? round(usedAsIs / total) : null,
      editedRate: total > 0 ? round(edited / total) : null,
      notUsedRate: total > 0 ? round(notUsed / total) : null,
      insufficientData: total < MIN_SAMPLE_SIZE
    };
  });
}

function summarizeReasons(reasons: (string | null | undefined)[]): ReasonSummary {
  const clean = reasons.filter((r): r is string => Boolean(r?.trim()));
  const total = clean.length;

  const counts = new Map<string, number>();
  for (const reason of clean) {
    counts.set(reason, (counts.get(reason) || 0) + 1);
  }

  const reasonCounts: ReasonCount[] = Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count, share: total > 0 ? round(count / total) : 0 }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));

  return {
    totalWithReason: total,
    reasons: reasonCounts,
    insufficientData: total < MIN_SAMPLE_SIZE
  };
}

/** Motivos de perda mais comuns, a partir de `leads.loss_reason`. */
export function summarizeLossReasons(leads: FeedbackLeadRecord[]): ReasonSummary {
  return summarizeReasons(leads.filter(l => l.stage === 'perdido').map(l => l.loss_reason));
}

/** Motivos de ganho mais comuns, a partir de `leads.win_reason` (novo nesta onda). */
export function summarizeWinReasons(leads: FeedbackLeadRecord[]): ReasonSummary {
  return summarizeReasons(leads.filter(l => l.stage === 'ganho').map(l => l.win_reason));
}

function summarizeConversionByKey(
  leads: FeedbackLeadRecord[],
  keyOf: (lead: FeedbackLeadRecord) => string | null | undefined
): ConversionRateSummary {
  const decided = leads.filter(l => l.stage === 'ganho' || l.stage === 'perdido');
  const groups = new Map<string, { won: number; lost: number }>();

  for (const lead of decided) {
    const key = keyOf(lead);
    if (!key?.trim()) continue; // sem chave conhecida — não agrupa sob um rótulo inventado
    const bucket = groups.get(key) || { won: 0, lost: 0 };
    if (lead.stage === 'ganho') bucket.won += 1;
    else bucket.lost += 1;
    groups.set(key, bucket);
  }

  const entries: ConversionRateEntry[] = Array.from(groups.entries())
    .map(([key, { won, lost }]) => {
      const total = won + lost;
      return {
        key,
        won,
        lost,
        total,
        conversionRate: total > 0 ? round(won / total) : null,
        insufficientData: total < MIN_SAMPLE_SIZE
      };
    })
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));

  return {
    entries,
    insufficientData: entries.length === 0
  };
}

/** Taxa de conversão (ganho / (ganho + perdido)) por segmento. */
export function summarizeConversionBySegment(leads: FeedbackLeadRecord[]): ConversionRateSummary {
  return summarizeConversionByKey(leads, l => l.segment);
}

/** Taxa de conversão (ganho / (ganho + perdido)) por marca/empresa cliente (`company`). */
export function summarizeConversionByCompany(leads: FeedbackLeadRecord[]): ConversionRateSummary {
  return summarizeConversionByKey(leads, l => l.company);
}

/**
 * Agregado único devolvido por `GET /api/feedback/summary`. Puramente
 * determinístico — mesma entrada sempre produz a mesma saída — e nunca
 * inventa uma estatística: quando não há dado suficiente para uma seção,
 * ela vem com `insufficientData: true` e os arrays/contadores honestamente
 * vazios ou pequenos, em vez de omitidos ou preenchidos com um placeholder.
 */
export function buildFeedbackSummary(
  messages: FeedbackMessageRecord[],
  leads: FeedbackLeadRecord[],
  now: Date = new Date()
): FeedbackSummary {
  return {
    copyFeedbackByChannel: summarizeCopyFeedbackByChannel(messages),
    lossReasons: summarizeLossReasons(leads),
    winReasons: summarizeWinReasons(leads),
    conversionBySegment: summarizeConversionBySegment(leads),
    conversionByCompany: summarizeConversionByCompany(leads),
    generatedAt: now.toISOString()
  };
}
