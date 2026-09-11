# RISK-001: Critical Vulnerabilities in better-auth

## Status: MITIGADO / FECHADO (11/09/2026)

`better-auth` foi atualizado de `^1.6.23` para `^1.7.4` (estável, publicado em 2026-09-10) em
`package.json`/`package-lock.json`. Ver seção "Resolução" abaixo para versões, evidência de
testes e achados da investigação de breaking changes.

## Description
The `better-auth` library (up to `1.6.23`) contains known critical vulnerabilities (e.g., OAuth refresh-token replay, XSS in auth-server origin via javascript redirect).
The available fix requires upgrading to a Release Candidate (`1.7.0-rc.x`), which introduces peer dependency conflicts (`@types/react`).

## Impact
Critical. If exploited, could lead to account takeover, token replay, or XSS depending on the enabled plugins (OAuth, SCIM).

## Likelihood
Medium to High (depending on specific plugins actively used).

## Mitigation / Strategy (histórico)
**Accept Risk (Temporarily)**
As per ADR-001, we accept this risk to maintain production stability. We will not use `--legacy-peer-deps` or RC versions.

## Action Plan (histórico)
- Monitor for the official, stable `1.7.0` release of `better-auth`.
- Update immediately upon stable release.
- Ensure strict usage of `requireTenant` and `requirePermission` to minimize horizontal escalation in the meantime.

## Resolução (11/09/2026)

### O que foi feito
- `better-auth` `^1.6.23` → `^1.7.4` em `package.json` (e lockfile atualizado via `npm install`).
  `1.7.4` é a versão estável mais recente no npm nesta data (linha `1.7.x`: 1.7.0 → 1.7.4,
  publicada em 2026-08-18 → 2026-09-10 — sem RC/beta envolvida, o problema original de conflito
  de peer-dependency com `@types/react` da RC não se aplica mais).
- Nenhuma mudança de código foi necessária em `src/lib/auth.ts` além do bump de versão (ver
  "Breaking changes investigados" abaixo — o único breaking change realmente relevante para esta
  configuração foi revertido antes da versão que instalamos).

### Achado importante: a vulnerabilidade original já não batia com `1.6.23`
Investigando os GitHub Security Advisories reais do repositório `better-auth/better-auth`, as duas
CVEs que mais batem com a descrição textual deste risco ("OAuth refresh-token replay" e "XSS in
auth-server origin via javascript redirect") são:
- `GHSA-pw9m-5jxm-xr6h` (OAuth refresh-token replay) — afeta apenas quem usa o plugin
  `oidcProvider()` ou `mcp()`, corrigida em `better-auth@1.6.11`.
- `GHSA-86j7-9j95-vpqj` (stored XSS via `javascript:` redirect_uri) — mesma condição (só
  `oidc-provider`/`mcp`), corrigida em `better-auth@1.6.13`.

Ambas já estavam corrigidas na versão que já estava pinada (`^1.6.23`, publicada 2026-06-29) —
muito antes da fila 1.7. Além disso, `src/lib/auth.ts` usa `plugins: []`: nenhum desses plugins
(`oidc-provider`, `mcp`, `sso`, `scim`) jamais esteve habilitado nesta aplicação, então nem a
versão antiga estava de fato exposta a essas duas CVEs específicas. Isso sugere que o texto
original deste RiskRegister foi escrito com base numa leitura genérica/desatualizada do
changelog, não numa reavaliação contra a configuração real do projeto. Mesmo assim, a atualização
para `1.7.4` era a ação certa: mantém o pacote na versão estável mais recente, sem custo (nenhuma
mudança de código exigida) e sem esperar por uma condição que já não existia.

### Breaking changes investigados (1.6.23 → 1.7.4)
Release notes oficiais (`better-auth/better-auth` v1.7.0 até v1.7.4) revisadas linha a linha
contra o uso real deste projeto (`emailAndPassword` + social login Google/Microsoft via
`socialProviders`, adapter Prisma/PostgreSQL, `plugins: []`, sem `experimental.joins`, sem
captcha):

- **`Account.issuer` (escopo de conta por `(issuer, accountId)`)** — o breaking change mais sério
  do 1.7.0 exigia uma coluna nova `issuer` na tabela `account` e um backfill manual dos dados
  existentes antes do deploy (a doc oficial diz explicitamente que "the generated schema migration
  cannot assign trusted issuers or resolve existing identity collisions automatically"). **Esse
  requisito foi revertido em `1.7.3`** — confirmado lendo o código-fonte instalado
  (`node_modules/better-auth/dist/oauth2/account-key.mjs` resolve a chave da conta hoje só como
  `{ providerId, accountId }`, sem `issuer`; `node_modules/@better-auth/core/dist/db/schema-diff.mjs`
  só menciona `issuer` no caminho de aviso para quem *já* tinha adicionado essa coluna manualmente
  durante a janela 1.7.0–1.7.2). Como fomos direto de `1.6.23` para `1.7.4` (nunca passamos pelas
  versões 1.7.0–1.7.2), esse requisito nunca chegou a se aplicar ao nosso schema — nenhuma
  migration de Prisma foi necessária.
- **Google (`profile.sub` como `accountId`)** — inalterado em `1.7.4`
  (`node_modules/@better-auth/core/dist/social-providers/google.mjs`:
  `accountSubject: ({ profile }) => profile.sub`). Contas Google já vinculadas em produção
  continuam resolvendo pelo mesmo `accountId` de antes — sem quebra.
- **Microsoft Entra (`profile.oid` em vez de `profile.sub` como `accountId`)** — mudou de fato em
  `1.7.0`+ (`accountSubject: ({ profile }) => profile.oid`), e a doc oficial trata isso como
  migração obrigatória para quem já tem contas Microsoft ligadas. **Não afeta produção hoje**:
  `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET` não estão configuradas em `render.yaml` (só
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` estão), e `src/lib/auth.ts` só registra o provider
  `microsoft` quando essas duas variáveis existem — ou seja, nunca existiu conta Microsoft real em
  produção para migrar. **Nota para o futuro:** se "Entrar com Microsoft" for habilitado depois,
  ele nascerá direto no formato novo (`oid`) — não há dado legado para migrar, mas vale registrar
  aqui para quem for habilitar não se surpreender com o campo usado.
- **`experimental.joins` → `advanced.database.joins`** — não usado neste projeto (grep confirmado
  em `prisma/` e `src/`). N/A.
- **Captcha endpoints com wildcard obrigatório** — plugin de captcha não está em uso
  (`plugins: []`). N/A.
- **Origem resolvida via `Host` quando `baseURL` é dinâmica** — `BETTER_AUTH_URL` é sempre setado
  explicitamente (`.env.example`, `render.yaml`, docs de deploy), então `baseURL` nunca fica
  `undefined`/dinâmica em produção. Risco não se aplica.
- **`oidcProvider` removido, MCP virou pacote separado, mudanças em `@better-auth/sso`/`@better-auth/scim`** —
  nenhum desses pacotes/plugins está instalado ou usado neste projeto. N/A.

### Evidência de testes
- `npx tsc --noEmit` → limpo, sem erros, com `better-auth@1.7.4` instalado.
- `npx vitest run -c vitest.unit.config.ts src/lib/auth/__tests__/authorization.unit.test.ts src/shared/middlewares/__tests__/authorization.unit.test.ts`
  → **13/13 testes passaram** (únicos testes unitários diretamente relacionados a autenticação/
  autorização no repositório).
- **Limitação real de ambiente**: os testes de integração que exercitam o `auth` real end-to-end
  (`tests/integration/account-lockout.test.ts`, `tests/integration/sec006-session-revocation.test.ts`,
  `tests/integration/rbac-e2e.test.ts`) e `tests/e2e/auth.spec.ts` (Playwright) não puderam ser
  executados nesta sessão: exigem PostgreSQL real (via `docker compose ... up`), o daemon do
  Docker Desktop não estava acessível neste ambiente (`failed to connect to the docker API at
  npipe:////./pipe/dockerDesktopLinuxEngine`), não havia um Postgres alcançável em `localhost:5432`,
  e não existe `.env.test` no worktree. Isso não foi contornado nem declarado como "passou" —
  fica registrado como pendência: **antes de mergear/dar deploy desta mudança, rodar
  `npm run test:integration` e `npm run test:e2e` (suite de auth) num ambiente com Docker/Postgres
  disponível** para confirmar o comportamento real de sign-up/sign-in/lockout/revogação de sessão
  contra `better-auth@1.7.4`. A investigação de código-fonte acima (accountSubject inalterado para
  Google, `issuer` não exigido em 1.7.4) dá confiança alta de que esses testes devem passar sem
  ajuste, mas não substitui a execução real.

### Se algo quebrar depois do merge
Reverter é um bump de versão só em `package.json`/`package-lock.json`
(`better-auth: "^1.6.23"`) seguido de `npm install` — nenhuma migration de banco foi aplicada por
esta mudança, então o rollback é seguro e imediato.
