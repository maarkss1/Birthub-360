// Catálogo estático dos módulos executivos concedidos individualmente pelo painel de acesso
// (ver src/features/module-access/). Substitui o gate único por e-mail
// (`EXECUTIVE_HUB_ALLOWED_EMAIL`, removido de access-policy.ts) por concessão real, por usuário,
// feita por um ADMIN — ver ModuleAccessGrant em prisma/schema.prisma. Este arquivo é a fonte única
// de `moduleKey` válido: consumido pelo backend (validação em módulo-access.service.ts) e pelo
// frontend (matriz de administração + RequireModuleAccess/useModuleAccess). Adicionar um módulo
// novo aqui NÃO cria a tela nem a rota sozinho — só o habilita para ser concedido no painel.
//
// Atualização (09/2026, pedido explícito do usuário: "Atlas GR não é ninguém, não é nem mais pra
// existir"): `treinamento-atlasgr`, `proposta-comercial` e `hub-inteligencia-marketing` foram
// APOSENTADOS — eram conteúdo comercial proprietário da Atlas GR (treinamento interno, pesquisa
// competitiva de GR, proposta nomeada a um cliente terceiro), grantável por qualquer tenant ao
// próprio usuário apesar de não fazer sentido fora daquela operação (achado
// docs/audits/repository-debt-audit, PRODUCT-004/DOCBRAND-002/DOCBRAND-012/FRONTEND-002/003).
// Rotas, gate, componentes e conteúdo estático correspondentes foram removidos junto. `social-selling`
// continua existindo — foi rerotulado para a marca Birth Hub 360 em vez de mantido como exclusivo
// da Atlas GR. Grants antigos gravados no banco com as chaves aposentadas continuam legíveis
// (mesma filosofia de compatibilidade de `playbooks.ts` para `atlasgr`/`totaltrac`), só não são
// mais válidos para concessão nova — `isModuleKey()` abaixo já rejeita essas strings.
export type ModuleKey = 'social-selling';

export interface ModuleCatalogEntry {
  key: ModuleKey;
  label: string;
  description: string;
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    key: 'social-selling',
    label: 'Social Selling',
    description: 'Playbook e acervo de social selling para prospecção em redes sociais.',
  },
];

export const MODULE_KEYS: ModuleKey[] = MODULE_CATALOG.map((m) => m.key);

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as string[]).includes(value);
}

export function moduleLabel(key: string): string {
  return MODULE_CATALOG.find((m) => m.key === key)?.label ?? key;
}

// Atalhos para sistemas EXTERNOS de uso genérico da equipe comercial (Gmail, Google Workspace).
// Não são telas desta plataforma: cada card abre a URL de um sistema de terceiro em nova aba, e
// por isso os rótulos descrevem o sistema de destino, não a marca do produto.
// Deliberadamente FORA do sistema de concessão por usuário acima (ModuleAccessGrant): são
// ferramentas de uso corriqueiro de toda a equipe comercial, não acervo executivo restrito — cada
// card só abre a URL em nova aba (login acontece no próprio site de destino; este catálogo nunca
// guarda credencial). `iconKey` é só um identificador — o mapeamento pro componente de ícone
// (lucide-react) fica no Hub (frontend), nunca aqui, porque este arquivo também é importado pelo
// backend (ver módulo-access.service.ts) e não deve carregar dependência de UI.
//
// Atualização (09/2026, pedido explícito do usuário: "Atlas GR não é ninguém, não é nem mais pra
// existir"): removidas as 5 entradas que apontavam pra sistemas internos da operação Atlas GR
// (portal Connect/New Connect, Perfil Securitário, Bitrix24 e webmail da própria Atlas GR —
// domínios `*.atlasgr.com.br`/`atlasgr.bitrix24.com.br`) — eram atalhos institucionais de uma
// empresa terceira específica, sem sentido pra qualquer outro tenant da Birth Hub 360. Restam só
// as duas entradas genéricas (Gmail, Google Workspace), que servem qualquer operação comercial.
export interface ExternalLinkEntry {
  key: string;
  label: string;
  description: string;
  url: string;
  iconKey: 'gmail' | 'workspace';
}

export const EXTERNAL_LINKS: ExternalLinkEntry[] = [
  {
    key: 'gmail',
    label: 'Gmail',
    description: 'Caixa de entrada do Gmail',
    url: 'https://mail.google.com/mail/u/0/#inbox',
    iconKey: 'gmail',
  },
  {
    key: 'workspace',
    label: 'Google Workspace',
    description: 'Drive, Docs, Planilhas e Agenda',
    url: 'https://drive.google.com/drive/',
    iconKey: 'workspace',
  },
];
