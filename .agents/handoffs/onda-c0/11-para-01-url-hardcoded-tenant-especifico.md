- De: 11
- Para: 01
- Onda: c0
- Status: aberto
- Prioridade: normal

## Problema
`src/config/module-catalog.ts` (módulo `'treinamento-atlasgr'`, ativo/roteado em `App.tsx`) tem
URLs hardcoded para sistemas internos da operação AtlasGR original: `connect.atlasgr.com.br`,
`newconnect.atlasgr.com.br`, `perfil-securitario.atlasgr.com.br`, `atlasgr.bitrix24.com.br`,
`webmail.atlasgr.com.br`. Como o ICP declarado hoje (`src/config/brand.ts`) é "qualquer empresa com
área comercial", qualquer tenant novo da Birth Hub 360 vê atalhos para sistemas internos de uma
empresa terceira.

Correlato: `getTenantFromEmail()` em `src/config/access-policy.ts` infere um rótulo
`'atlasgr'|'totaltrac'` por substring de domínio de e-mail para exibição de segmento — mesma classe
de problema (heurística hardcoded em vez de configuração por organização).

## Arquivo(s) envolvido(s)
`src/config/module-catalog.ts`, `src/config/access-policy.ts`.

## Alteração necessária
Mover essas URLs/heurística para configuração por organização (tenant), não código-fonte
compartilhado. Requer decisão de modelagem (schema/tabela de config por tenant vs. env var) — dono
técnico é o Agente 01.

## Teste esperado
Um novo tenant criado depois da correção não deve ver nenhum atalho/link apontando para sistemas de
outra empresa por padrão.

## Contexto adicional
Detalhado em `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` §2.3. Classe D (mover para
tenant/config), não bloqueador.
