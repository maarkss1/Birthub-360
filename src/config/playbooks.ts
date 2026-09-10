/**
 * Playbooks comerciais — o eixo que particiona o CONTEÚDO comercial da
 * plataforma: playbook, matriz de objeções, matriz de qualificação, personas de
 * roleplay e histórico do copiloto.
 *
 * Antes este eixo se chamava "marca ativa" e vinha de `BRAND_CONFIGS`
 * (`src/contexts/BrandContext.tsx`), misturando duas coisas diferentes: a
 * identidade visual do produto e a carteira comercial de quem o usa. Ao trocar
 * a plataforma inteira para a marca Birth Hub 360, as duas se separaram — a
 * identidade é única (`src/config/brand.ts`) e o playbook continua sendo um dado
 * comercial, de qualquer empresa que use a plataforma.
 *
 * As CHAVES (`atlasgr`, `totaltrac`) são valores gravados em banco e validados
 * na API (`PlaybookObjectionItem.brand`, `PlaybookQualificationItem.brand`,
 * `AssistantMessage.brand`, `RoleplaySession.brand`, além do parâmetro `brand`
 * em `src/features/intelligence/routes/intelligence.routes.ts`). Renomeá-las
 * exigiria migração de dados e quebraria o histórico já gravado, então elas
 * ficam como identificadores opacos — o que muda é o RÓTULO exibido, que agora
 * descreve o segmento de mercado, não a empresa.
 *
 * O rótulo NÃO é "segmento" na interface: as matrizes já têm um filtro de
 * segmento de mercado ("Logística & Transportes" etc.) DENTRO de cada playbook.
 * Este eixo é o playbook inteiro.
 *
 * Para acrescentar um playbook novo: adicione aqui, permita a chave na validação
 * da rota e crie a migração que amplia o domínio da coluna.
 */
export type PlaybookKey = 'atlasgr' | 'totaltrac';

export interface PlaybookInfo {
  key: PlaybookKey;
  /** Rótulo exibido ao usuário. */
  label: string;
  /** O que este playbook cobre — usado em subtítulos e no contexto da IA. */
  description: string;
}

export const PLAYBOOKS: readonly PlaybookInfo[] = [
  {
    key: 'atlasgr',
    label: 'Logística & Risco',
    description:
      'Gestão de risco de carga, scoring de transportadoras e prospecção preditiva em logística.',
  },
  {
    key: 'totaltrac',
    label: 'Telemetria de Frota',
    description:
      'Telemetria CAN, videotelemetria com IA, controle de jornada e rastreamento de frota.',
  },
] as const;

export const DEFAULT_PLAYBOOK: PlaybookKey = 'atlasgr';

const BY_KEY = new Map(PLAYBOOKS.map((s) => [s.key, s]));

export function isPlaybookKey(value: unknown): value is PlaybookKey {
  return typeof value === 'string' && BY_KEY.has(value as PlaybookKey);
}

/** Nunca lança: chave desconhecida (dado antigo, query manipulada) cai no padrão. */
export function playbookInfo(key: string | null | undefined): PlaybookInfo {
  return BY_KEY.get(key as PlaybookKey) ?? BY_KEY.get(DEFAULT_PLAYBOOK)!;
}
