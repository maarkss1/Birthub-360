/**
 * Playbooks comerciais — o eixo que particiona o CONTEÚDO comercial da
 * plataforma: playbook, matriz de objeções, matriz de qualificação, personas de
 * roleplay e histórico do copiloto.
 *
 * Até 09/2026 este eixo tinha duas chaves fixas, nomeadas por empresas
 * específicas (`atlasgr`, `totaltrac`) — fazia sentido quando a plataforma
 * servia só essas duas operações. Com o ICP virando "qualquer empresa com área
 * comercial que queira automatizar ponta a ponta" (ver docs/BrandConstitution.md
 * e src/config/brand.ts), amarrar o playbook a nomes de empresa deixou de fazer
 * sentido — removidas por pedido explícito do usuário. Hoje existe uma única
 * chave genérica; o desenho de um playbook de fato configurável por organização
 * (múltiplos playbooks, criados/nomeados pela própria organização) fica para uma
 * rodada futura — o que existe agora é o suficiente para não deixar nenhuma
 * empresa nomeada amarrada ao código.
 *
 * A CHAVE (`geral`) é um valor gravado em banco e validado na API
 * (`PlaybookObjectionItem.brand`, `PlaybookQualificationItem.brand`,
 * `AssistantMessage.brand`, `RoleplaySession.brand`, além do parâmetro `brand`
 * em `src/features/intelligence/routes/intelligence.routes.ts`). Linhas antigas
 * gravadas com `atlasgr`/`totaltrac` continuam legíveis: `playbookInfo()` cai no
 * padrão para qualquer chave desconhecida, então não precisam de migração de
 * dado para serem exibidas — só não são mais graváveis por escrita nova.
 *
 * Para acrescentar um playbook novo: adicione aqui, permita a chave na validação
 * da rota e crie a migração que amplia o domínio da coluna.
 */
export type PlaybookKey = 'geral';

export interface PlaybookInfo {
  key: PlaybookKey;
  /** Rótulo exibido ao usuário. */
  label: string;
  /** O que este playbook cobre — usado em subtítulos e no contexto da IA. */
  description: string;
}

export const PLAYBOOKS: readonly PlaybookInfo[] = [
  {
    key: 'geral',
    label: 'Playbook Comercial',
    description:
      'Prospecção, qualificação, matriz de objeções e roleplay de vendas — cobre qualquer segmento comercial, sem amarrar a uma empresa ou vertical específica.',
  },
] as const;

export const DEFAULT_PLAYBOOK: PlaybookKey = 'geral';

const BY_KEY = new Map(PLAYBOOKS.map((s) => [s.key, s]));

// PLAYBOOKS[0] em vez de BY_KEY.get(DEFAULT_PLAYBOOK)! — mesmo fallback, sem non-null assertion:
// PLAYBOOKS é um array literal não-vazio, então o find() só cai no ?? em teoria (DEFAULT_PLAYBOOK
// sempre está na lista), mas o tipo fica provado sem precisar "confiar" numa asserção.
const DEFAULT_PLAYBOOK_INFO: PlaybookInfo =
  PLAYBOOKS.find((p) => p.key === DEFAULT_PLAYBOOK) ?? PLAYBOOKS[0];

export function isPlaybookKey(value: unknown): value is PlaybookKey {
  return typeof value === 'string' && BY_KEY.has(value as PlaybookKey);
}

/** Nunca lança: chave desconhecida (dado antigo, query manipulada) cai no padrão. */
export function playbookInfo(key: string | null | undefined): PlaybookInfo {
  return BY_KEY.get(key as PlaybookKey) ?? DEFAULT_PLAYBOOK_INFO;
}
