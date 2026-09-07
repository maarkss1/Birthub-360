// Catálogo estático dos módulos executivos concedidos individualmente pelo painel de acesso
// (ver src/features/module-access/). Substitui o gate único por e-mail
// (`EXECUTIVE_HUB_ALLOWED_EMAIL`, removido de access-policy.ts) por concessão real, por usuário,
// feita por um ADMIN — ver ModuleAccessGrant em prisma/schema.prisma. Este arquivo é a fonte única
// de `moduleKey` válido: consumido pelo backend (validação em módulo-access.service.ts) e pelo
// frontend (matriz de administração + RequireModuleAccess/useModuleAccess). Adicionar um módulo
// novo aqui NÃO cria a tela nem a rota sozinho — só o habilita para ser concedido no painel.
export type ModuleKey =
  | 'social-selling'
  | 'treinamento-atlasgr'
  | 'proposta-comercial'
  | 'hub-inteligencia-marketing';

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
  {
    key: 'treinamento-atlasgr',
    label: 'Treinamento AtlasGR',
    description: 'Trilha de treinamento institucional AtlasGR.',
  },
  {
    key: 'proposta-comercial',
    label: 'Proposta Comercial',
    description: 'Modelos e acervo de propostas comerciais executivas.',
  },
  {
    key: 'hub-inteligencia-marketing',
    label: 'Hub Inteligência & Mkt',
    description: 'Painel de inteligência de mercado e marketing.',
  },
];

export const MODULE_KEYS: ModuleKey[] = MODULE_CATALOG.map((m) => m.key);

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as string[]).includes(value);
}

export function moduleLabel(key: string): string {
  return MODULE_CATALOG.find((m) => m.key === key)?.label ?? key;
}

// Atalhos para ferramentas externas reais da AtlasGR (portal legado, Bitrix24, webmail...).
// Deliberadamente FORA do sistema de concessão por usuário acima (ModuleAccessGrant): são
// ferramentas de uso corriqueiro de toda a equipe comercial, não acervo executivo restrito — cada
// card só abre a URL em nova aba (login acontece no próprio site de destino; este catálogo nunca
// guarda credencial). `iconKey` é só um identificador — o mapeamento pro componente de ícone
// (lucide-react) fica no Hub (frontend), nunca aqui, porque este arquivo também é importado pelo
// backend (ver módulo-access.service.ts) e não deve carregar dependência de UI.
export interface ExternalLinkEntry {
  key: string;
  label: string;
  description: string;
  url: string;
  iconKey:
    | 'connect'
    | 'newConnect'
    | 'securitario'
    | 'bitrix24'
    | 'webmail'
    | 'gmail'
    | 'workspace';
}

export const EXTERNAL_LINKS: ExternalLinkEntry[] = [
  {
    key: 'connect',
    label: 'Connect Atlas',
    description: 'Portal Atlas — página principal',
    url: 'https://connect.atlasgr.com.br/portalatlas/Atlas_Principal.php',
    iconKey: 'connect',
  },
  {
    key: 'new-connect',
    label: 'New Connect',
    description: 'Novo portal Atlas — dashboard',
    url: 'https://newconnect.atlasgr.com.br/dashboard',
    iconKey: 'newConnect',
  },
  {
    key: 'perfil-securitario',
    label: 'Perfil Securitário',
    description: 'Registros recentes de perfil securitário',
    url: 'https://perfil-securitario.atlasgr.com.br/report/recentRecords',
    iconKey: 'securitario',
  },
  {
    key: 'bitrix24',
    label: 'Bitrix24',
    description: 'CRM Bitrix24 da AtlasGR',
    url: 'https://atlasgr.bitrix24.com.br/',
    iconKey: 'bitrix24',
  },
  {
    key: 'webmail',
    label: 'Webmail',
    description: 'E-mail corporativo (@atlasgr.com.br)',
    url: 'https://webmail.atlasgr.com.br/?_task=mail&_mbox=INBOX',
    iconKey: 'webmail',
  },
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
