- De: Agente 13 (Enxame Autônomo e Governança de Agentes)
- Para: Agente 01/01A (Plataforma, Segurança e Dados)
- Onda: 44
- Status: aberto
- Prioridade: média (ACH-13-03, sev P2, auditoria report-atualizado.html)

## Problema

`getSwarmSloSnapshot` (`src/features/intelligence/services/swarmScheduler.service.ts`) é o painel
de SLO por agente pedido por `AUTONOMIA_COMERCIAL_24X7.md`: cobertura, conversão, custo, latência,
erro e override humano, por papel do enxame (SDR/BDR/CLOSER/CRM/OPS). Hoje 4 das 6 dimensões
(cobertura, conversão, override humano, taxa de erro) já são fatiadas por `agentRole` porque vêm de
`AIPendingAction.agentRole`. As outras duas — **custo** e **latência de modelo** — vêm de `AILog`
(`prisma.aILog.aggregate(...)`, linha ~528 do arquivo acima), que não tem nenhuma coluna que amarre
um registro a um papel do enxame. Resultado: custo/latência aparecem só agregados por organização,
nunca por agente. Isso já está documentado honestamente no próprio código-fonte (comentário acima de
`getSwarmSloSnapshot`, linhas 424-448) — `SwarmCostSnapshot.note` também expõe essa limitação no
payload da API, nunca fabrica um número por agente. Confirmado ainda presente no HEAD atual de
`origin/main` (não foi resolvido por nenhuma branch de onda anterior já mergeada).

## Alteração necessária (fora do meu escopo — `prisma/schema.prisma` é arquivo de propriedade
exclusiva do Agente 01/01A, `prisma/AGENTS.md`: "Nenhum outro agente cria ou edita migração")

Proposta de coluna nova em `model AILog` (`prisma/schema.prisma`, ~linha 1631):

```prisma
model AILog {
  id             String        @id @default(cuid())
  tokens         Int
  cost           Float
  latencyMs      Int
  model          String
  promptId       String?
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  /// Onda 44 (ACH-13-03): papel do enxame (SDR/BDR/CLOSER/CRM/OPS) que originou esta chamada de
  /// IA, quando conhecido. Opcional/nullable pelo mesmo motivo de `organizationId`: registros
  /// anteriores a esta coluna e chamadas de infraestrutura sem agente identificável (ex.:
  /// telemetria interna sem tenant, ver usage-log.ts) não têm como ser atribuídos
  /// retroativamente. Mesmo conjunto de valores de `AIPendingAction.agentRole` — não criar um
  /// enum aqui: motivo documentado em AIPendingAction.agentRole é o mesmo (novo papel de agente
  /// não deveria exigir migration de enum do Postgres).
  agentRole      String?
  createdAt      DateTime      @default(now())

  @@index([organizationId, createdAt])
  @@index([organizationId, agentRole, createdAt])
}
```

Notas:
- Nome sugerido `agentRole` (não `agentType`) para casar com o campo já existente e homônimo em
  `AIPendingAction.agentRole` — evita dois nomes para o mesmo conceito no mesmo schema. Se o
  Agente 01/01A preferir `agentType`, sinalizar de volta para eu (Agente 13) ajustar
  `getSwarmSloSnapshot` e o consumo em `SwarmDashboard.tsx` de acordo.
- Índice composto `[organizationId, agentRole, createdAt]` proposto porque a query alvo
  (`getSwarmSloSnapshot`) sempre filtra por `organizationId` + janela de `createdAt`, e a próxima
  mudança que farei nela é agrupar por `agentRole` dentro dessa mesma janela — igual ao padrão já
  usado no índice existente da tabela.
- Coluna **nullable de propósito**, mesmo padrão já usado em `organizationId` nesta mesma tabela
  (comentário nas linhas 1638-1639) — não é lacuna a "corrigir" depois, é o mesmo motivo formal:
  nem toda chamada de IA tem um agente do enxame identificável (ex.: chat de suporte direto,
  ferramentas fora do fluxo autônomo).

## Handoff irmão

Ver `.agents/handoffs/onda-44/13-para-07-propagar-agentrole-ailog.md` — propõe ao Agente 07 onde no
pipeline de chamada de IA esse valor deveria ser preenchido, depois que esta coluna existir.

## O que eu faço depois que a coluna existir (meu escopo, não pedir de novo)

Assim que `agentRole` existir em `AILog` e o client Prisma for regenerado, eu (Agente 13) volto a
`getSwarmSloSnapshot` e troco o `prisma.aILog.aggregate(...)` único por
`prisma.aILog.groupBy({ by: ['agentRole'], ... })` filtrado pela mesma janela, preenchendo
`SwarmCostSnapshot` por papel em vez de só por organização — preservando a regra de estado vazio
explícito já usada nas outras 4 dimensões (nunca fabricar custo/latência média sobre uma linha sem
registros). Atualizo também `tests/unit/features/intelligence/services/swarmScheduler.sloSnapshot.test.ts`
e o payload consumido por `SwarmDashboard.tsx`.

## Teste esperado (Agente 01/01A)

- `npx prisma validate` e `npx prisma generate` passam com a coluna nova.
- Migração aditiva (`ALTER TABLE "AILog" ADD COLUMN "agentRole" TEXT;` + índice), reversível sem
  perda de dado — não precisa de bloco `-- ROLLBACK:` de migração destrutiva
  (`docs/security/runbooks/MIGRATION_ROLLBACK.md`), mas classificar formalmente como aditiva no
  processo padrão do time.
- Nenhum teste de tenant/RBAC deveria quebrar: coluna nova, nullable, sem mudança de comportamento
  em nenhum consumidor existente de `AILog` até que o Agente 13 (eu) e o Agente 07 comecem a
  preenchê-la.

## Contexto adicional

Item de auditoria ACH-13-03 (`report-atualizado.html`, sev P2). Não editei `prisma/schema.prisma`
nem nenhuma migração — só este handoff. Nenhum outro arquivo de código foi alterado nesta
investigação.
