# Production Readiness — Birth Hub 360º

- **Documento canônico** referenciado por `/AGENTS.md` e `.agents/prompts/08-qa-release.md`
  ("Resultado final: produzir `docs/release/PRODUCTION-READINESS.md` contendo versão/data, matriz
  de gates, evidências, riscos, migrações, rollback, status por área, decisão RELEASE
  APPROVED/RELEASE BLOCKED"). Esta é a única versão viva deste documento — as duas anteriores
  ficaram fragmentadas e desatualizadas (ver "Histórico e consolidação" abaixo) e não devem ser
  editadas como se fossem a fonte de verdade.
- **Não é** o roadmap de execução da plataforma (`ROADMAP_FINALIZACAO_PLATAFORMA.html`, na raiz do
  repo) — são artefatos diferentes: este documento é o gate de release (gates técnicos + decisão
  APPROVED/BLOCKED), o roadmap é planejamento de trabalho futuro. Não misture os dois.

## Changelog

| Data | O que mudou | Autor/origem |
|---|---|---|
| **2026-09-11** | **Consolidação (ACH-08-06).** Os 3 documentos de prontidão de release que existiam fragmentados e nenhum refletindo o estado atual (`docs/release/PRODUCTION-READINESS.md` de 2026-08-15 só sobre o caminho LGPD, `docs/release/FINALIZATION_REPORT_2026-09-04.md` de 2026-09-04, e o placeholder de 2 linhas `docs/reports/RELATORIO_PRODUCTION_READINESS.md`, de uma onda ainda mais antiga) foram unificados neste único arquivo, com matriz de gates rodada de novo contra o HEAD atual. Os dois documentos anteriores **não foram apagados** — outros arquivos do repositório os referenciam por caminho direto (`docs/deploy/oracle-cloud.md`, `docs/ADR/ADR-004-Producao-Oracle-Cloud.md`, `docs/security/GITLEAKS_HISTORICAL_FINDINGS_2026-09-05.md`) — mas agora estão marcados explicitamente como histórico, não como fonte de verdade corrente. Ver seção "Histórico e consolidação". | Sessão Claude Code (item ACH-08-06 do relatório de auditoria multiagente) |
| 2026-09-04 | Relatório de finalização completo (triagem de PRs #339-342, 16 bugs corrigidos, gates completos rodados contra Docker real, veredito **RELEASE APPROVED** no commit `2d0a25a`/`ef5f1f0`, PR #344). Ficou congelado como registro de sessão, nunca atualizado depois. | `docs/release/FINALIZATION_REPORT_2026-09-04.md` (preservado como histórico) |
| 2026-08-15 | Primeira versão deste arquivo — escopo único: caminho operacional de solicitação de titular (LGPD), não a checklist de release completa. | Agente 08 (Onda 8) |

## 1. Estado atual deste documento

- **Data desta rodada:** 2026-09-11
- **SHA verificado:** `b18f0fd4d80fc5a8338b03588d00cad44d0ddc5f` (`origin/main`, branch de trabalho
  `fix/ach-08-06` criada a partir deste SHA)
- **Distância da última decisão formal de release conhecida:** 265 commits desde 2026-09-04 (data
  do `FINALIZATION_REPORT`) — inclui features grandes (motores de IA, job-roles/supervisores,
  rebranding completo para Birth Hub 360º, integração Birth Voices) e não apenas correções pontuais.
  **A decisão RELEASE APPROVED de 2026-09-04 não pode ser considerada válida para o SHA atual.**

## 2. Escopo desta rodada (importante)

Esta rodada é uma **consolidação documental** (item ACH-08-06 de auditoria — unificar 3 arquivos
fragmentados em 1), não uma nova auditoria de release completa como a de 2026-09-04. Os gates
abaixo foram executados de fato contra o HEAD atual sempre que o ambiente permitiu; onde não
permitiu (Docker Desktop indisponível nesta sessão — daemon inacessível, não apenas conflito de
nome/porta), isso está declarado explicitamente, não omitido nem inventado. Uma nova rodada de
gates completa (com Postgres/Redis/Meilisearch reais) é necessária antes de qualquer nova decisão
formal de RELEASE APPROVED/BLOCKED para o SHA atual — ver seção 6.

## 3. Matriz de gates — executados nesta rodada (HEAD `b18f0fd4`)

| Gate | Comando | Status | Nota |
|---|---|---|---|
| Prisma Client | `npx prisma generate` | ✅ PASS | Necessário no worktree novo (client não gerado por padrão) |
| TypeScript | `npx tsc --noEmit` | ❌ **FAIL** (1 erro pré-existente) | `src/shared/security/urlGuard.ts(177,54)`: TS2345, `RequestInit` do DOM incompatível com o `RequestInit` do `undici`. **Não introduzido nesta rodada** — já existe em `origin/main`. Já corrigido numa branch ainda não mergeada (`feat/birth-voices-hub-crm-integration`, commit `c4a210c1` "fix(ci): corrige erro real de tipo (TS2345) em urlGuard.ts"); fora do escopo desta tarefa de consolidação de docs mexer em `urlGuard.ts` |
| Format | `npm run format:check` | ❌ **FAIL** (1 arquivo) | Mesmo arquivo/causa acima (`urlGuard.ts`) — formatação do trecho que o fix de tipo ainda não mergeado também normaliza. Mesma observação: não é regressão desta rodada, correção já existe em branch separada |
| Lint | `npm run lint` (biome) | ✅ PASS | "Checked 1087 files... No fixes applied" — 0 erros |
| Build (frontend + server) | `npm run build` | ✅ PASS | Warning pré-existente e não-fatal do Workbox (`brace-expansion` globbing) durante geração do service worker — mesmo warning já registrado no `FINALIZATION_REPORT_2026-09-04.md`, não é novo. Chunks >500kB pré-existentes (`vendor-echarts`, `Float`, `exceljs.min`) |
| Testes unitários | `npm run test:unit` | ✅ **PASS** | 364 arquivos / 2945 testes, todos passando. Duração real: 564.71s (~9min24s) — suíte cresceu de 341→364 arquivos e 2695→2945 testes desde 09-04. Um `ERROR` e um `WARN` aparecem no output (log intencional de um teste que simula orçamento de IA excedido, e um teste de acesso negado por tenant ausente) — são asserções de caminho de erro sendo exercitadas, não falhas |
| Testes de integração | `npm run test:integration` | 🚫 **Não executado** | Requer Postgres/Redis reais via Docker Compose |
| Testes E2E | `npm run test:e2e` | 🚫 **Não executado** | Requer Docker (Postgres/Redis) + servidor real |
| `verify:integrations` / `verify:ai` | — | 🚫 **Não executado** | Dependem de credenciais/serviços externos reais, fora do escopo desta tarefa de documentação |
| Arquitetura | `npm run test:architecture` | 🚫 Não executado nesta rodada | Não é o foco desta tarefa (consolidação de docs); último resultado conhecido (09-04): PASS |
| Segurança (Trivy/ZAP/k6) | `npm run security:*` / `npm run load:k6*` | 🚫 **Não executado** | Todos dependem de Docker Compose (`--profile tools`) |

### 3.1 Docker Desktop — motivo real da lacuna acima

Confirmado nesta sessão com `docker ps`:

```
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; check if the
path is correct and if the daemon is running
```

Isto é o **daemon inteiro fora do ar** neste ambiente, não um conflito pontual de nome de
container ou porta — condição de ambiente já conhecida e confirmada em rodadas anteriores desta
mesma sessão de auditoria, registrada aqui em vez de contornada. Os containers Docker deste
projeto (`atlas_postgres`, `atlas_redis`, `atlas_meilisearch`) são **compartilhados entre
worktrees** — mesmo quando o Docker está acessível, não se deve rodar `down`/`up
--force-recreate`/`restart` neles a partir de uma sessão isolada sem coordenação.

### 3.2 Testes unitários — resultado real

Executado (`npm run test:unit`, `vitest run -c vitest.unit.config.ts`) em background por levar
mais de 5 minutos nesta máquina; aguardado de forma síncrona até concluir (564.71s reais).
Resultado: **364/364 arquivos, 2945/2945 testes passando, exit code 0.** Nenhuma falha.

## 4. LGPD — caminho operacional de solicitação de titular (Art. 18)

Conteúdo herdado da versão de 2026-08-15 deste documento (Onda 8, Agente 08) — **não
reverificado ponta a ponta nesta rodada**. Desde então, commits tocaram código adjacente a LGPD
(ex.: `f6545bd2` "fix(ai): corrige 4 falhas P0 nos motores de IA (LGPD, triagem de sinistro,
vazamento de PII)"), então o conteúdo abaixo deve ser tratado como **última verificação conhecida**,
não como estado garantido do HEAD atual. Uma nova rodada completa (equivalente à seção 3.1 da
versão anterior) fica registrada como pendência na seção 6.

### 4.1 Mecanismos técnicos mapeados (última leitura de código: 2026-08-15)

| Direito (Art. 18 LGPD) | Mecanismo | Arquivo | Como se aciona |
|---|---|---|---|
| **Acesso / Portabilidade** (Art. 18 II/V) | `GET /api/lgpd/titular/:contactId/export` | `src/features/lgpd/lgpd.routes.ts`, `lgpd.service.ts` (`exportContactData`) | Qualquer usuário autenticado do tenant (sem `requireRole` adicional) |
| **Correção** (Art. 18 III) | `PUT /api/contacts/:id` | `src/features/contacts/routes/contact.routes.ts` (`requireRole(['ADMIN','GESTOR','VENDEDOR'])`) | Self-service — mesma tela de edição de contato do CRM (`ContactForm.tsx`) |
| **Exclusão / Anonimização** (Art. 18 IV/VI) | `DELETE /api/lgpd/titular/:contactId` → `eraseDataSubject()` | `lgpd.routes.ts` (`requireRole(['ADMIN','GESTOR'])`), `src/shared/services/dataSubjectErasure.service.ts` | API autenticada como ADMIN/GESTOR, ou `npx tsx scripts/lgpd-erase-data-subject.ts <organizationId> <contactId>` |
| **Exclusão automática por retenção** (complementar) | Worker BullMQ diário (`0 3 * * *`) | `src/features/crm/jobs/autoAnonymizeDisqualified.worker.ts` | Automático, reaproveita `eraseDataSubject()` |

`eraseDataSubject()` faz anonimização irreversível (não `DELETE` de linha), idempotente, e **não**
apaga `Lead`/negócio comercial em si. Gap conhecido: `AgentMemory` não é alcançável por este
mecanismo (sem `contactId` estruturado) — registrado em
`.agents/handoffs/onda-6/01A-para-07-agentmemory-sem-vinculo-titular.md`.

### 4.2 O que foi testado ponta a ponta em 2026-08-15 (não repetido nesta rodada)

Testes automatizados (`lgpd.routes.test.ts`, `dataSubjectErasure.unit.test.ts`,
`lgpd-erasure-cross-tenant.test.ts` sob RLS real) e um ciclo HTTP manual completo contra servidor e
Postgres reais (sign-up → seed de contato → export → erase → export de novo confirmando
anonimização → downgrade de papel confirmando RBAC 403 → chamadas sem cookie confirmando 401).
Detalhe completo no histórico (seção "Histórico e consolidação" abaixo).

## 5. Riscos conhecidos (consolidado)

| # | Risco | Severidade | Situação | Fonte |
|---|---|---|---|---|
| R1 | Exclusão/anonimização LGPD sem self-service via UI — só API direta ou script de terminal | Alto | Aberto | Onda 8 (08-15) |
| R2 | Sem canal de intake documentado para pedido de titular (e-mail de DPO, formulário, prazo) | Alto | Aberto — decisão de negócio, não de código | Onda 8 (08-15) |
| R3 | `GET .../export` sem `requireRole` adicional (qualquer papel do tenant exporta PII completa) | Médio | Aberto — revisão de negócio pendente | Onda 8 (08-15) |
| R4 | `AgentMemory` não alcançado pelo mecanismo de exclusão LGPD | Médio | Gap conhecido, não resolvido | Onda 6 → Onda 8 |
| R5 | Ações de acesso/exclusão de titular não persistidas em `AuditLog` (só log estruturado) | Médio | Débito mapeado em `docs/compliance/COMPLIANCE_MATRIX.md` ("Auditoria e LGPD ❌ Ausente") | Onda 8 (08-15) |
| R6 | `npx tsc --noEmit` falha no HEAD atual de `main` (`urlGuard.ts`, TS2345) | Baixo | Fix já existe em branch não mergeada (`feat/birth-voices-hub-crm-integration`, `c4a210c1`) — aguardando merge | Esta rodada (09-11) |
| R7 | 265 commits desde a última decisão formal de release (09-04) sem nova rodada completa de gates (integração/E2E/segurança) contra o HEAD atual | Alto | Aberto — ver seção 6 | Esta rodada (09-11) |
| R8 | Worker automático de retenção de 90 dias não exercitado em execução real | Baixo | Ver seção 4.2 | Onda 8 (08-15) |

Nenhum risco listado aqui foi "descoberto" nesta rodada como se fosse inédito — R1-R5 e R8 são
carregados do documento anterior (2026-08-15); R6-R7 são específicos desta rodada de consolidação.

## 6. Pendências para a próxima rodada formal de release

Fora do escopo desta tarefa de consolidação de documentação (só editou `docs/release/**`), fica
registrado como handoff:

1. **Nova rodada completa de gates** contra o SHA atual (`b18f0fd4` ou o que for `main` no
   momento), com Docker disponível: `test:integration`, `test:e2e`, `test:architecture`,
   `security:trivy`, `verify:integrations`, `verify:ai` — nenhum destes foi executado nesta rodada.
2. **Mergear `feat/birth-voices-hub-crm-integration`** (ou extrair só o commit `c4a210c1`) para
   destravar `tsc --noEmit`/`format:check` em `main` (R6).
3. Reverificar o caminho LGPD (seção 4) ponta a ponta, já que código adjacente mudou desde 08-15.
4. Depois de 1-3, emitir uma nova decisão formal **RELEASE APPROVED** ou **RELEASE BLOCKED** neste
   mesmo arquivo (seção a ser adicionada), seguindo o formato de
   `.agents/prompts/08-qa-release.md`.

## 7. Migrações e rollback

Não re-derivado nesta rodada — pontos de verdade já existentes e válidos:

- **Rollback de migração Prisma/Postgres:** `docs/security/runbooks/MIGRATION_ROLLBACK.md`
  (runbook real, referenciado por `prisma/AGENTS.md`).
- **Deploy/infra de produção (Oracle Cloud):** `docs/deploy/oracle-cloud.md`,
  `docs/ADR/ADR-004-Producao-Oracle-Cloud.md`.
- **Deploy Render (histórico, migração Neon):** `docs/deploy/render.md`.

## 8. Decisão de release

**Não emitida nesta rodada.** Esta tarefa é consolidação documental (ACH-08-06), não uma auditoria
de release completa — emitir RELEASE APPROVED/BLOCKED sem ter rodado integração/E2E/segurança
contra o HEAD atual seria inventar um veredito não sustentado por evidência. A última decisão
formal real e sustentada por evidência foi **RELEASE APPROVED em 2026-09-04** (commit `2d0a25a`/
`ef5f1f0`, PR #344) — **desatualizada** para o HEAD atual (265 commits de distância, ver seção 6).

## Histórico e consolidação

Os dois documentos abaixo **continuam no repositório** (outros arquivos os referenciam por caminho
direto) mas são histórico de sessões passadas, não fonte de verdade corrente. Não editar como se
fossem este documento:

- **`docs/release/FINALIZATION_REPORT_2026-09-04.md`** — relatório completo de finalização de
  release de 2026-09-04 (triagem de PRs, 16 bugs corrigidos com causa raiz, gates completos contra
  Docker real, veredito RELEASE APPROVED). Referenciado por `docs/deploy/oracle-cloud.md`,
  `docs/ADR/ADR-004-Producao-Oracle-Cloud.md` e `docs/security/GITLEAKS_HISTORICAL_FINDINGS_2026-09-05.md`.
- **`docs/reports/RELATORIO_PRODUCTION_READINESS.md`** — placeholder de 2 linhas de uma onda
  anterior a 08-15, já documentado como desatualizado pelo índice `docs/reports/README.md` (nota
  DOC-003: "vários já estão desatualizados... não devem ser tratados como fonte de verdade").
