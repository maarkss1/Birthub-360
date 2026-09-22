- De: 11
- Para: 01
- Onda: c0
- Status: resolvido
- Prioridade: normal

## Resolução
Resolvido em 09/2026: o módulo `treinamento-atlasgr` (junto com `proposta-comercial` e `hub-inteligencia-marketing`) continha dados e URLs proprietárias da operação legada Atlas GR e foi totalmente aposentado e removido do catálogo de módulos (`src/config/module-catalog.ts`), das rotas (`src/App.tsx`), e dos portais estáticos (`public/tools/`). `grantModuleAccess` agora rejeita essas chaves e não há qualquer URL hardcoded de terceiro exposta a novos tenants.


## Problema
`src/config/module-catalog.ts` (módulo `'treinamento-atlasgr'`, ativo/roteado em `App.tsx`) tem
URLs hardcoded para sistemas internos da operação AtlasGR original: `connect.atlasgr.com.br`,
`newconnect.atlasgr.com.br`, `perfil-securitario.atlasgr.com.br`, `atlasgr.bitrix24.com.br`,
`webmail.atlasgr.com.br`. Como o ICP declarado hoje (`src/config/brand.ts`) é "qualquer empresa com
área comercial", qualquer tenant novo da Birth Hub 360 vê atalhos para sistemas internos de uma
empresa terceira.

## Arquivo(s) envolvido(s)
`src/config/module-catalog.ts`.

## Alteração necessária
Mover essas URLs para configuração por organização (tenant), não código-fonte compartilhado.
Requer decisão de modelagem (schema/tabela de config por tenant vs. env var) — dono técnico é o
Agente 01.

## Teste esperado
Um novo tenant criado depois da correção não deve ver nenhum atalho/link apontando para sistemas de
outra empresa por padrão.

## Contexto adicional
Detalhado em `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` §2.3. Classe D (mover para
tenant/config), não bloqueador.

Nota (09/2026): este handoff bundlava originalmente um segundo achado sobre `getTenantFromEmail()`
em `src/config/access-policy.ts`. Essa função não existe mais — o arquivo hoje só contém
`normalizeLoginEmail()`/`isAuthorizedLoginEmail()` (validação de formato de e-mail, sem inferência
de tenant por domínio), depois que a allowlist de domínios corporativos foi removida por pedido
explícito do usuário (ver `src/config/access-policy.ts` e `.claude/CLAUDE.md` §13). O parágrafo foi
removido daqui para não mandar quem ler este handoff investigar um símbolo inexistente; o achado
ainda real é só o de `module-catalog.ts` acima.
