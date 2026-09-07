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
