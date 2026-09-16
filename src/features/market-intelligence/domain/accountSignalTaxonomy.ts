/**
 * Itens 9 e 12 (Inteligência de Dados & Enriquecimento) — antes desta mudança,
 * `newsMonitor.worker.ts` gravava TODO `AccountSignal` com `type: 'news_mention'` fixo (nenhuma
 * classificação real, ver o comentário desse arquivo antes desta mudança). Isso deixava
 * `computeIntent` (`accountInsights.ts`) sem nenhum jeito real de diferenciar "empresa mencionada
 * na imprensa por qualquer motivo" de "empresa levantando rodada" ou "empresa trocando de CEO" —
 * o único sinal disponível era contagem de menções, não o que elas significam.
 *
 * Esta taxonomia classifica o TÍTULO de uma notícia real (já buscada via GDELT/SearXNG, nunca
 * fabricada) por casamento de palavra-chave em português — mesmo rigor do resto do enriquecimento
 * heurístico deste projeto (`accountInsights.ts`: "nenhuma chamada a IA, nenhum valor fabricado").
 * Não é NLP nem classificação por IA: é substring match determinístico e auditável — o
 * `dedupeKey`/`source`/`sourceUrl` gravados no `AccountSignal` sempre permitem conferir a notícia
 * original que gerou a classificação.
 *
 * Limitação conhecida e deliberada: GDELT/SearXNG são índices de NOTÍCIA PUBLICADA, não bancos de
 * vaga de emprego nem de rodada de investimento estruturados. "Contratação em massa"/"vaga de
 * gerente comercial aberta" (item 9 do pedido original) só é detectável aqui quando vira notícia
 * de imprensa ("Empresa X abre 200 vagas") — uma vaga individual publicada só num board de emprego
 * (Gupy, LinkedIn Jobs, Indeed) nunca vai aparecer, porque este projeto não tem nenhuma integração
 * com essas fontes hoje (nenhuma credencial, nenhum provider). Cobrir isso de verdade exigiria uma
 * integração nova dedicada — fora do escopo desta rodada.
 */
export const ACCOUNT_SIGNAL_TAXONOMY_VERSION = 'v2';

export type AccountSignalType =
  | 'funding_round'
  | 'executive_change'
  | 'mass_hiring'
  | 'geographic_expansion'
  | 'mna'
  | 'news_mention';

interface SignalTypeDefinition {
  label: string;
  /** Substrings em português minúsculo — casamento simples contra o título normalizado. */
  keywords: string[];
}

// Ordem importa: a primeira definição (exceto o fallback `news_mention`) cujo título bater vence.
// `mna` antes de `funding_round` de propósito — "aquisição" às vezes aparece em notícia que também
// menciona "investimento", e fusão/aquisição é o evento mais específico dos dois.
export const ACCOUNT_SIGNAL_TYPES: Record<AccountSignalType, SignalTypeDefinition> = {
  mna: {
    label: 'Fusão/Aquisição',
    keywords: ['aquisição', 'adquire', 'fusão com', 'compra a', 'compra o', 'anuncia fusão'],
  },
  funding_round: {
    label: 'Rodada de investimento',
    keywords: [
      'rodada de investimento',
      'capta recursos',
      'capta r$',
      'aporte de r$',
      'série a',
      'série b',
      'série c',
      'venture capital',
      'recebe investimento',
    ],
  },
  executive_change: {
    label: 'Troca de executivo',
    keywords: [
      'novo ceo',
      'nova ceo',
      'novo diretor',
      'nova diretora',
      'assume a presidência',
      'assume o comando',
      'deixa o cargo de',
      'nomeado ceo',
      'nomeada ceo',
      'nomeado presidente',
    ],
  },
  mass_hiring: {
    label: 'Contratação em massa',
    keywords: [
      'abre vagas',
      'contratação em massa',
      'processo seletivo',
      'vagas de emprego',
      'planeja contratar',
      'vai contratar',
    ],
  },
  geographic_expansion: {
    label: 'Expansão geográfica',
    keywords: [
      'nova unidade',
      'expande operação',
      'expande atuação',
      'abre filial',
      'inaugura unidade',
      'chega a',
    ],
  },
  // Fallback — sempre por último, sem keywords (nunca é escolhido por match, só por exclusão em
  // classifySignalType).
  news_mention: { label: 'Menção em notícia', keywords: [] },
};

export function classifySignalType(title: string): AccountSignalType {
  const normalized = title.toLowerCase();
  for (const [type, definition] of Object.entries(ACCOUNT_SIGNAL_TYPES)) {
    if (type === 'news_mention') continue;
    if (definition.keywords.some((keyword) => normalized.includes(keyword))) {
      return type as AccountSignalType;
    }
  }
  return 'news_mention';
}

export function accountSignalTypeLabel(type: string): string {
  return ACCOUNT_SIGNAL_TYPES[type as AccountSignalType]?.label ?? type;
}
