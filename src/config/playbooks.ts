/**
 * Playbooks comerciais — o eixo que particiona o CONTEÚDO comercial da
 * plataforma: playbook, matriz de objeções, matriz de qualificação, personas de
 * roleplay e histórico do copiloto.
 *
 * Após a migração para a marca única Birth Hub 360, removemos a distinção
 * forçada de playbook por "marca" (antigos atlasgr e totaltrac) e unificamos
 * em um único tenant de playbook padrão. A segmentação (Logística, Telemetria)
 * ocorre naturalmente dentro do filtro de segmento de cada playbook.
 */
export type PlaybookKey = 'birthub360';

export interface PlaybookInfo {
  key: PlaybookKey;
  /** Rótulo exibido ao usuário. */
  label: string;
  /** O que este playbook cobre — usado em subtítulos e no contexto da IA. */
  description: string;
}

export const PLAYBOOKS: readonly PlaybookInfo[] = [
  {
    key: 'birthub360',
    label: 'Birth Hub 360',
    description: 'Playbook unificado Birth Hub 360.',
  },
] as const;

export const DEFAULT_PLAYBOOK: PlaybookKey = 'birthub360';

const BY_KEY = new Map(PLAYBOOKS.map((s) => [s.key, s]));

const DEFAULT_PLAYBOOK_INFO: PlaybookInfo =
  PLAYBOOKS.find((p) => p.key === DEFAULT_PLAYBOOK) ?? PLAYBOOKS[0];

export function isPlaybookKey(value: unknown): value is PlaybookKey {
  return typeof value === 'string' && BY_KEY.has(value as PlaybookKey);
}

/** Nunca lança: chave desconhecida (dado antigo, query manipulada) cai no padrão. */
export function playbookInfo(key: string | null | undefined): PlaybookInfo {
  return BY_KEY.get(key as PlaybookKey) ?? DEFAULT_PLAYBOOK_INFO;
}
