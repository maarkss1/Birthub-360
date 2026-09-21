- De: Agente 07 (IA e Automações)
- Para: Agente 00 (Coordenador) — para rotear ao Agente 01 (Plataforma, Segurança e Dados), dono
  exclusivo de `prisma/schema.prisma`/`prisma/migrations/**`
- Onda: 42 (dossiê CPI, DEC-14, opção A — "simular antes de ativar" + versionamento de regras)
- Status: resolvido
- Prioridade: alto

## Resolução
Resolvido em `prisma/schema.prisma` (linhas 2034-2063) e migrações `20260827210000_onda42_decisoes_schema` / `20260917180000_fix_rls_tenant_write_isolation`:
1. Model `AutomationVersion` criado com relação inversa em `model Automation (versions AutomationVersion[])` e RLS forçado por tenant (`tenant_isolation_policy`).
2. `PrismaAutomationVersionStore` implementado em `src/features/automations/infra/PrismaAutomationVersionStore.ts` e conectado em `src/features/automations/automation-versioning.service.ts`, persistindo snapshots e diffs históricos no Postgres de forma durável.
3. Testes unitários de `automation-versioning.service.ts` validados com 11/11 testes passando.

## Problema

DEC-14 (opção A) pediu duas camadas novas sobre o motor de automação existente (que já tem retry e
idempotência real, ver Onda 40): (a) dry-run/preview — feito, não precisa de schema novo, roda só
leitura contra o dado atual; (b) versionamento de mudanças na REGRA (histórico "essa automação foi
editada em X, de A para B", com timestamp e quem editou) — isso precisa de um model novo, porque
hoje `Automation` não guarda nenhum histórico da própria regra (só `lastRunAt`/`runCount`, que são
telemetria de EXECUÇÃO, não de EDIÇÃO). `AuditLog`/`automation-history.service.ts` também não
servem: registram execuções da automação (`AUTOMATION_EXECUTION`), não edições da regra em si.

Implementei toda a lógica (snapshot do estado anterior, diff textual entre duas versões, view de
linha do tempo) e o CONTRATO de persistência (`AutomationVersionStore`), mas a implementação real
precisa de uma tabela nova no Postgres via Prisma — fora do meu escopo (ver `/AGENTS.md` →
"Propriedade exclusiva de arquivos"). Não editei `prisma/schema.prisma`.

Enquanto este handoff não é resolvido, o histórico de versões só existe via
`InMemoryAutomationVersionStore` (protótipo em memória — os dados somem a cada reinício do
processo, documentado como tal no próprio arquivo, nunca para produção real depender disto).

## Arquivo(s) envolvido(s)

- `prisma/schema.prisma` — precisa de um model novo (proposta abaixo) e de uma relação nova em
  `model Automation` (`versions AutomationVersion[]`).
- `prisma/migrations/` — nova migration correspondente.
- Já implementados por mim (não precisam de mudança, só de uma implementação real da interface):
  - `src/features/automations/domain/AutomationVersion.ts` — `AutomationVersionRecord`,
    `AutomationVersionStore`, `diffAutomationSnapshots` (diff textual básico, puro, já testado).
  - `src/features/automations/automation-versioning.service.ts` — `recordPriorState`/
    `buildTimeline` (monta a linha do tempo: estado atual + histórico com diff a cada passo).
  - `src/features/automations/infra/InMemoryAutomationVersionStore.ts` — protótipo em memória da
    mesma interface, único ponto que precisa trocar quando a tabela existir (comentário no próprio
    arquivo aponta exatamente isso).
  - `src/features/automations/application/AutomationUseCases.ts` — `updateAutomation`/
    `removeAutomation` já chamam `recordPriorState` antes de aplicar a mudança; `listVersions` já
    existe e alimenta a rota `GET /api/automations/:id/versions`.

## Alteração necessária

Model Prisma sugerido (nomes/tipos ajustáveis pelo Agente 01 ao critério de convenção do schema
existente — isto é uma proposta, não uma exigência de nomenclatura). Reaproveita os dois enums já
existentes (`AutomationTrigger`/`AutomationAction`), para não duplicar valores válidos em dois
lugares:

```prisma
/// Histórico de versões da REGRA de uma automação (trigger/condições/ação/config) — não das
/// execuções dela (isso já existe via AuditLog + automation-history.service.ts). Cada registro é
/// um snapshot do estado da regra imediatamente ANTES de uma edição ou remoção; o estado "atual"
/// sempre é a própria linha em Automation (ou deixa de existir, no caso de remoção).
model AutomationVersion {
  id           String            @id @default(cuid())
  automationId String
  automation   Automation        @relation(fields: [automationId], references: [id], onDelete: Cascade)

  /// Snapshot da regra ANTES da edição/remoção que gerou este registro.
  name         String
  enabled      Boolean
  trigger      AutomationTrigger
  conditions   Json?
  action       AutomationAction
  actionConfig Json

  /// Quem fez a edição/remoção que tornou este snapshot histórico (não quem criou o estado
  /// snapshotado). Sem FK de propósito — mesmo padrão já usado no schema para o mesmo motivo
  /// (`OrganizationFeatureFlag.updatedByUserId`, `BugReport.userId`/`userEmail`): o histórico deve
  /// sobreviver à remoção do usuário (ex-funcionário).
  editedByUserId String?
  editedByEmail  String?
  /// 'update' | 'delete' — 'delete' registra o último estado antes da automação ser removida, para
  /// o histórico não desaparecer junto com a regra.
  changeReason   String   @default("update")

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())

  @@index([automationId, createdAt])
  @@index([organizationId])
}
```

E em `model Automation` (só a relação inversa, nada mais muda no model existente):

```prisma
model Automation {
  // ...campos existentes, sem alteração...
  versions AutomationVersion[]
}
```

Pontos que precisam de RLS (mesmo padrão já usado em `CommercialGoal`/`ForecastSnapshot`/`Lead`):
filtro por `organizationId` obrigatório em toda query, nunca cross-tenant — `RLS ativado/forçado +
policy padrão`, mesmo formato usado na migration mais recente desse tipo
(`20260827020000_forecast_snapshot`, resolvida no handoff da Onda 39 — ver
`.agents/handoffs/onda-39/04-para-01-schema-forecast-snapshot.md` como referência de formato).

Depois de a tabela existir, a implementação real de `AutomationVersionStore` (ex.:
`PrismaAutomationVersionStore implements AutomationVersionStore`) é trivial — dois métodos
(`record`/`listByAutomation`), no mesmo padrão de `PrismaForecastSnapshotStore.ts` — posso
implementar essa parte assim que a tabela existir, sem precisar de outro handoff. O único outro
arquivo que precisa mudar depois disso é a linha de composição em
`automation-versioning.service.ts` (`const store: AutomationVersionStore = new
InMemoryAutomationVersionStore()` → `new PrismaAutomationVersionStore()`).

## Teste esperado

- Migration aplica limpo em ambiente de teste (`npx prisma migrate dev` / `deploy`).
- RLS real: organização A nunca lê versão de automação de organização B (mesmo padrão de
  `tests/integration/rbac-e2e-commercial-intelligence.test.ts`).
- Depois de implementado `PrismaAutomationVersionStore`, os testes unitários já escritos
  (`src/features/automations/__tests__/automation-versioning.service.test.ts` — 11 casos, cobrindo
  diff textual, linha do tempo com múltiplas edições em ordem, isolamento por tenant e
  `changeReason: 'delete'`) continuam passando sem alteração (testam a lógica/composição, não a
  implementação da store — só o `beforeEach`/isolamento por `automationId` único por teste evita
  contaminação entre casos, já que a store em memória é um singleton de módulo).

## Contexto adicional

O dry-run/preview (a outra metade do DEC-14, opção A) NÃO depende deste handoff — é 100% leitura
contra o dado já existente (`Lead`/`Activity`), sem necessidade de schema novo, e já está completo
e testado: `src/features/automations/automation-dry-run.service.ts`,
`tests/unit/features/automations/automation-dry-run.service.test.ts` (18 casos), rota `POST
/api/automations/:id/dry-run`. Só o versionamento (a segunda metade) depende deste handoff.

Rota `GET /api/automations/:id/versions` já está implementada e registrada (RBAC ADMIN/GESTOR,
mesmo padrão das outras rotas de gestão de automação) — funciona hoje contra o protótipo em
memória; nenhuma mudança de contrato de API é esperada quando a store real entrar, só a
persistência por trás dela passa a sobreviver a reinício do processo.

## Resolução

Verificado nesta sessão (worktree separado): o schema/migration e a store real já haviam sido
aplicados em uma sessão anterior (commit `363879f9`, "feat(00): aplica as 4 migrations pendentes
da Onda 42 e conecta as stores reais", 27/08/2026), e refinados depois em `d715212b` e `6fbc176d`.
Este handoff só não tinha sido marcado como resolvido. Conferido ponto a ponto contra o pedido
original:

- `prisma/schema.prisma` — `model AutomationVersion` existe exatamente como proposto (FK
  `automationId` → `Automation` com `onDelete: Cascade`, FK `organizationId` → `Organization`,
  snapshot completo `name`/`enabled`/`trigger`/`conditions`/`action`/`actionConfig`,
  `editedByUserId`/`editedByEmail` sem FK de propósito, `changeReason` com default `"update"`,
  índices `[automationId, createdAt]` e `[organizationId]`). `model Automation` tem a relação
  inversa `versions AutomationVersion[]`.
- `prisma/migrations/20260827210000_onda42_decisoes_schema/migration.sql` — migration aditiva já
  existe, cria a tabela, os índices, as FKs e RLS no mesmo padrão pedido (`ENABLE ROW LEVEL
  SECURITY` + `FORCE ROW LEVEL SECURITY` + `tenant_isolation_policy` filtrando por
  `current_setting('app.current_tenant_id', TRUE) = "organizationId"`, mesmo formato da migration
  `20260827020000_forecast_snapshot` citada como referência).
- `src/features/automations/infra/PrismaAutomationVersionStore.ts` — implementação real de
  `AutomationVersionStore` (`record`/`listByAutomation`) já existe, com teste próprio em
  `src/features/automations/infra/__tests__/PrismaAutomationVersionStore.test.ts`.
- `src/features/automations/automation-versioning.service.ts` — composição já aponta para
  `PrismaAutomationVersionStore` (não mais `InMemoryAutomationVersionStore`, que continua no
  repositório só como dependência de teste unitário do próprio serviço, como documentado no
  arquivo).
- `src/features/automations/application/AutomationUseCases.ts` — `updateAutomation`/
  `removeAutomation` continuam chamando `recordPriorState` antes de aplicar a mudança; rota `GET
  /api/automations/:id/versions` inalterada.

Validação rodada nesta sessão (sem nenhuma alteração de código necessária, já que a implementação
já estava correta):

- `npx prisma validate` → `The schema at prisma\schema.prisma is valid`.
- `npx tsc --noEmit` → sem erros.
- `npx eslint` nos arquivos da feature (`automation-versioning.service.ts`,
  `PrismaAutomationVersionStore.ts`, `InMemoryAutomationVersionStore.ts`, `AutomationVersion.ts`,
  `AutomationUseCases.ts`) → sem erros/warnings.
- `npx vitest run -c vitest.unit.config.ts src/features/automations/__tests__/automation-versioning.service.test.ts src/features/automations/infra/__tests__/PrismaAutomationVersionStore.test.ts`
  → 2 arquivos, 15 testes, todos passando (os 11 casos originais de
  `automation-versioning.service.test.ts` citados no handoff + 4 casos de
  `PrismaAutomationVersionStore.test.ts`).

Nenhum arquivo de código precisou ser alterado nesta sessão — só este handoff, para fechar o
status.
