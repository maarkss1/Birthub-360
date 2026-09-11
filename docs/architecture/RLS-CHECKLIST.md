# Checklist de RLS para módulo novo

> Dono: Agente 01 (schema/migrations). Este documento é processo, não código — não substitui a
> revisão de quem tem propriedade de `prisma/schema.prisma`/`prisma/migrations/**`.

## Por que este documento existe

Row-Level Security neste projeto foi adicionado de forma incremental: a base
(`Company`/`Contact`/`Lead`/`Activity`/`user`/`Note`/`TimelineEvent`/`Organization`) ganhou RLS na
migration `20260722020322_enable_rls`, e desde então pelo menos **7 migrations dedicadas** só para
fechar RLS em tabelas que nasceram sem ela junto do `CREATE TABLE`:
`20260807100000_enable_rls_remaining_tables`,
`20260810000100_bitrix_sync_log_rls`,
`20260828030000_saved_search_threecx_call_event_rls`,
`20260902130000_copiloto_ia_rls`,
`20260902161000_copiloto_ia_bitrix_field_mapping_rls`,
`20260902171000_copiloto_ia_coaching_rls`,
`20260908090000_public_booking_link_create_and_rls`.

Isso é retrofit, não desenho — a tabela existiu sem proteção entre a migration que a criou e a
migration que fechou o RLS. A auditoria de 2026-09-11 (ver seção final) não encontrou nenhuma tabela
multi-tenant hoje sem RLS, mas o padrão de "criar tabela primeiro, lembrar do RLS depois" é o
problema real a evitar — não repita esse intervalo numa tabela nova.

**Regra de ouro: se um model novo em `prisma/schema.prisma` guarda dado de uma organização
específica, a `CREATE TABLE` e o `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` correspondentes
nascem na MESMA migration, nunca em duas.**

## Passo 1 — Decida a categoria de tenancy antes de escrever o model

Toda tabela nova cai em um destes quatro casos. Decida qual, por escrito (comentário no schema),
antes de gerar a migration:

1. **Dado direto de organização** — a tabela tem `organizationId String` obrigatório apontando para
   `Organization`. Caso mais comum (86 dos 107 models atuais). Policy compara
   `organizationId` diretamente.
2. **Dado filho, sem `organizationId` próprio** — a tabela pertence a uma linha que já tem
   `organizationId` (ex.: `Note`/`TimelineEvent` via `leadId` → `Lead`). Policy filtra por subquery
   no pai, nunca duplica `organizationId` só para simplificar a policy (evita a tabela ficar
   dessincronizada do dono real se a FK mudar).
3. **Catálogo de produto, global, sem `organizationId`** — dado igual para todas as organizações
   (ex.: `JobRole`, `AgentDefinition`, `AgentVersion`, `RoleAgentGrant`, `CapabilityDefinition`,
   `AgentCapabilityGrant`, `RoleCapabilityGrant`). Exige um comentário explícito no `model` do
   schema explicando a decisão (ver esses 7 models como exemplo de como documentar) — **"esqueci de
   organizationId" não é a mesma coisa que "decidi que é catálogo global"**, e só a segunda é
   aceitável sem RLS.
4. **Catálogo global que ainda assim precisa de uma trava no banco** — dado igual para todas as
   organizações, mas a tabela não deve ser legível por conexões que não sejam da própria aplicação
   (ex.: bloquear `anon`/`authenticated` do PostgREST do Supabase). Ver `FeatureFlag`/
   `AiEngineSetting`: RLS habilitado, mas a policy não filtra por tenant, só exige uma conexão já
   autenticada pela app (ver texto exato abaixo).

Se a resposta não for claramente 1, 2, 3 ou 4 — pare e pergunte antes de escrever a migration.

## Passo 2 — SQL exato a usar (extraído do padrão real já em produção)

### Caso 1 — tabela com `organizationId` próprio

Padrão usado, sem alteração, desde `20260722020322_enable_rls` até a migration mais recente que
mexe em RLS (`20260909131444_saved_view`):

```sql
ALTER TABLE "NomeDaTabela" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NomeDaTabela" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "NomeDaTabela";
CREATE POLICY tenant_isolation_policy ON "NomeDaTabela" FOR ALL
USING (
    current_setting('app.current_tenant_id', TRUE) = "organizationId"
    OR current_setting('app.bypass_rls', TRUE) = 'on'
)
WITH CHECK (true);
```

Pontos que não são estéticos:

- **`FORCE ROW LEVEL SECURITY`, sempre junto do `ENABLE`** — sem isso, o *owner* da tabela (a role
  usada pela própria aplicação) ignora a policy. `ENABLE` sozinho não protege nada em produção.
- **`DROP POLICY IF EXISTS` antes do `CREATE POLICY`** — torna a migration idempotente/reexecutável
  e é o padrão real usado sempre que uma policy existente precisa ser recriada (ver
  `20260825120000_scope_rls_bypass_to_bootstrap_allowlist`).
- **Nome da policy é sempre `tenant_isolation_policy`** — não invente um nome novo por tabela; isso
  é o que permite auditar RLS com uma única varredura de `CREATE POLICY.*ON` em vez de precisar
  saber o nome de antemão.
- **`app.bypass_rls = 'on'`** é a única via de escape, restrita a rotina de bootstrap/worker
  explicitamente marcada — nunca adicione uma segunda variável de bypass.
- **`WITH CHECK (true)`** existe porque a extensão do Prisma Client (`tenant-prisma.ts`) intercepta
  chamadas de model e injeta `organizationId` automaticamente, mas não cobre `$queryRaw`/
  `$executeRaw` eventual — a policy não pode confiar só na camada de aplicação para escrita.

### Caso 2 — tabela filha sem `organizationId` próprio

Padrão usado em `Note`/`TimelineEvent` (`20260722020322_enable_rls`) e em `session`/`account`
(`20260807100000_enable_rls_remaining_tables`, via `userId` → `user.organizationId`):

```sql
ALTER TABLE "NomeDaTabela" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NomeDaTabela" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "NomeDaTabela";
CREATE POLICY tenant_isolation_policy ON "NomeDaTabela" FOR ALL
USING (
    "leadId" IN (
        SELECT id FROM "Lead"
        WHERE "organizationId" = current_setting('app.current_tenant_id', TRUE)
    )
    OR current_setting('app.bypass_rls', TRUE) = 'on'
);
```

Troque `"leadId"`/`"Lead"` pela FK e tabela-pai reais. Verifique que a FK pai **já tem** RLS antes de
assumir que a subquery é segura.

### Caso 3 — catálogo de produto, global, sem RLS

Não escreva `ENABLE ROW LEVEL SECURITY` nenhum. Em vez disso, documente a decisão diretamente no
`model` do `schema.prisma`, no mesmo estilo do comentário real acima de `JobRole`/`AgentDefinition`:

```
/// Catálogo de PRODUTO global, sem `organizationId`, sem RLS — <razão específica desta tabela>.
/// Nenhuma linha aqui carrega dado de uma organização específica.
```

Isso é o que separa "decisão" de "esquecimento" numa auditoria futura.

### Caso 4 — catálogo global com trava de conexão (sem isolar por tenant)

Padrão usado em `FeatureFlag`/`AiEngineSetting` (ver
`docs/architecture/12-REQUISITOS-ARQUITETURA.md`, seção 4):

```sql
ALTER TABLE "NomeDaTabela" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NomeDaTabela" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bypass_only_policy ON "NomeDaTabela";
CREATE POLICY bypass_only_policy ON "NomeDaTabela" FOR ALL
USING (current_setting('app.bypass_rls', TRUE) = 'on')
WITH CHECK (current_setting('app.bypass_rls', TRUE) = 'on');
```

Use este padrão (nome `bypass_only_policy`, não `tenant_isolation_policy` — a policy não isola
tenant, e chamar do mesmo nome confundiria uma auditoria futura) quando a tabela precisa bloquear
acesso direto de `anon`/`authenticated` via PostgREST/Supabase, mas não tem uma coluna de tenant
para filtrar (ex.: `verification` do Better Auth, tokens pré-autenticação).

### Padrão alternativo aceito: loop dinâmico para várias tabelas relacionadas na mesma migration

Quando uma migration cria várias tabelas do mesmo módulo de uma vez (ex.:
`20260818100000_ldr_account_intelligence_foundation`, 7 tabelas), é aceitável aplicar RLS num loop
`DO $rls$ ... FOREACH table_name IN ARRAY [...] LOOP ... END LOOP; END $rls$;` em vez de repetir o
bloco 7 vezes. **Se usar esse padrão, mantenha a lista de nomes de tabela no `ARRAY` sincronizada
manualmente com o restante da migration** — esse formato não aparece em uma busca textual simples
por `ALTER TABLE .* ENABLE ROW LEVEL SECURITY` (é gerado em runtime via `format()`), então um
auditor humano ou uma varredura automatizada precisa abrir o corpo do `DO` para confirmar cobertura.
Prefira o padrão explícito (repetir o bloco) quando a migration tiver poucas tabelas — o loop só
compensa a partir de 4-5 tabelas idênticas.

## Passo 3 — teste de integração antes de considerar pronto

RLS declarado por leitura de SQL não é RLS provado. Este repositório já teve o mesmo handoff de RLS
marcado como "resolvido" duas vezes por leitura de código antes de falhar de verdade num gate de
integração (ver `.agents/handoffs/onda-2/00-para-01-ailog-rls-violation.md`). Para uma tabela nova:

1. Escreva (ou peça ao dono de `tests/**` para escrever) um teste de integração contra Postgres real
   que: cria uma linha na organização A, tenta lê-la/escrevê-la com o contexto de tenant setado para
   a organização B, e confirma que a policy bloqueia — seguindo o formato de
   `tests/integration/tenant-isolation-db001.test.ts`,
   `tests/integration/organization-rls-bypass.test.ts` ou `tests/integration/ailog-rls.test.ts`.
   - Cuidado com `PrismaPromise` lazy: `requestContext.run(ctx, () => prisma.model.create(...))`
     **sem `await` dentro do callback** deixa a query executar fora do contexto de tenant — isso já
     causou uma falha real que foi confundida com bug de policy (ver handoff citado acima). Use
     `await fn()` dentro do `requestContext.run`.
2. Rode o teste e cole a saída real (`X/X passed`) na entrega — não declare RLS correto sem essa
   saída.
3. Rode `npx prisma migrate diff` contra o schema depois de aplicar a migration, para confirmar que
   não há deriva entre `schema.prisma` e o histórico de migrations.

## Passo 4 — checklist final antes do PR

- [ ] A tabela nova está classificada em um dos 4 casos do Passo 1, e a classificação está
      documentada em comentário no `model`.
- [ ] `ENABLE ROW LEVEL SECURITY` **e** `FORCE ROW LEVEL SECURITY` estão na mesma migration que o
      `CREATE TABLE` (não numa migration futura).
- [ ] A policy usa `current_setting('app.current_tenant_id', TRUE)` (caso 1/2) ou
      `current_setting('app.bypass_rls', TRUE) = 'on'` isolado (caso 4) — nunca uma variável nova.
- [ ] `DROP POLICY IF EXISTS` antes de `CREATE POLICY`.
- [ ] Todo `$queryRaw`/`$executeRaw`/`$queryRawUnsafe` que toca a tabela nova roda dentro de
      `withRlsContext`/`requestContext` ou filtra `organizationId` explicitamente como defesa em
      profundidade.
- [ ] Existe teste de integração contra Postgres real provando isolamento cross-tenant, com saída
      real anexada à entrega (Passo 3).
- [ ] `npx prisma validate` e `npx prisma migrate diff` não acusam deriva.

## Anexo — auditoria de cobertura executada em 2026-09-11

Varredura de todos os 107 models de `prisma/schema.prisma` contra o SQL real de
`prisma/migrations/**` (não por inspeção de schema isolada — cruzando `CREATE TABLE`/`organizationId`
com `ENABLE ROW LEVEL SECURITY`/`CREATE POLICY` de cada migration):

- **86 models** com `organizationId`/`orgId`/`tenantId` direto — todos com
  `ENABLE`+`FORCE ROW LEVEL SECURITY` e `tenant_isolation_policy` confirmados no SQL.
- **6 models** filhos sem `organizationId` próprio, isolados via subquery no pai (`Note`,
  `TimelineEvent`, `DocumentChunk`, `EnrichmentLog`, `CrmPipelineStage`, e `session`/`account` do
  Better Auth via `userId`) — todos com policy confirmada.
- **`verification`** (Better Auth) — `bypass_only_policy`, sem isolamento por tenant por desenho
  (tokens pré-autenticação, sem usuário conhecido ainda).
- **`Organization`** — policy própria comparando `current_setting('app.current_tenant_id')` a `id`.
- **`FeatureFlag`/`AiEngineSetting`** — catálogo global, RLS habilitado como trava de conexão
  (Caso 4), não como isolamento de tenant. Documentado em
  `docs/architecture/12-REQUISITOS-ARQUITETURA.md` seção 4.
- **`MarketIntelligenceDataset`/`MarketIntelligenceCompany`/`MarketIntelligenceMunicipalityMapping`**
  — dataset de referência pública (CNPJ), RLS habilitado, mesmo padrão de trava de conexão.
- **7 models sem RLS por desenho documentado** (Caso 3): `JobRole`, `AgentDefinition`,
  `AgentVersion`, `RoleAgentGrant`, `CapabilityDefinition`, `AgentCapabilityGrant`,
  `RoleCapabilityGrant` — catálogo de produto, comentário explícito no schema explicando a decisão.
  Não é um achado de risco: é a única categoria do Passo 1 que esta auditoria encontrou aplicada
  corretamente com justificativa por escrito.

**Resultado: nenhuma tabela multi-tenant sem RLS foi encontrada nesta auditoria.** Isso não valida o
padrão retroativamente — os 6 models via subquery no pai e os 7 via loop dinâmico
(`20260818100000_ldr_account_intelligence_foundation`: `AccountIntelligenceSnapshot`,
`AccountSignal`, `DecisionMaker`, `IntelligenceEvidence`, `AccountScore`, `AccountRecommendation`,
`EconomicRelationship`) só foram confirmados porque este documento leu o corpo do `DO $rls$` — uma
varredura textual simples por `ALTER TABLE .* ENABLE ROW LEVEL SECURITY` teria reportado essas 7
tabelas como sem RLS por falso negativo. Esse é exatamente o tipo de gap de processo que este
checklist existe para fechar: cobertura real precisa ser lida no SQL executado, não presumida pelo
nome da migration.

**Observação lateral (fora do escopo de RLS, para o dono de schema avaliar):** a tabela
`MarketIntelligenceEconomicScenario` foi criada com RLS completo em
`20260821013000_market_intelligence_economic_scenario_audit` e teve sua policy recriada em
`20260825120000_scope_rls_bypass_to_bootstrap_allowlist`, mas não existe hoje nenhum `model`
correspondente em `prisma/schema.prisma`, nem uma migration `DROP TABLE` visível no histórico. Não é
um problema de RLS (a tabela, se ainda existir no banco, continua protegida) — é uma possível deriva
de schema/migration que só o Agente 01 pode confirmar e decidir (tabela órfã no banco real, ou
model removido sem migration correspondente). Registrado aqui só para não se perder; não gerou
handoff formal porque não é um achado de RLS.
