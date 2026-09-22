- De: sessão de swarm (item 42 do roadmap — "Playbook Vivo")
- Para: Agente 01 (Plataforma, Segurança e Dados)
- Onda: 49
- Status: resolvido
- Prioridade: média

## Problema

Item 42: "quando um vendedor descobre uma abordagem que converte melhor, o sistema sugere pro time
inteiro." A v1 implementada nesta onda (`src/features/playbook/living-playbook/`) computa
sugestões **sob demanda**, a partir de `AIPendingAction` executadas com `outcomeStatus: 'POSITIVE'`
agrupadas por (`Lead.owner`, segmento), e distribui via `notificationService` (broadcast in-app).
Funciona, mas tem uma lacuna real por não ter tabela própria:

- Nenhuma sugestão gerada é **persistida** — cada clique em "Playbook Vivo" recalcula do zero, sem
  histórico de quais padrões já foram identificados, anunciados, ou o que o time fez com eles.
- Não há como saber depois quem já viu um anúncio, se alguém realmente adotou a abordagem, ou medir
  se ela continuou convertendo bem depois de virar recomendação (fechar o loop, mesmo espírito do
  `outcomeStatus` de `AIPendingAction`).
- `ObjectionMatrixItem`/`QualificationMatrixItem` não têm campo de proveniência (`createdBy`,
  `sourceActionIds`) — mesmo que um padrão vire manualmente um item da Matriz de Objeções hoje, o
  crédito ao vendedor de origem se perde.

Não posso alterar `prisma/schema.prisma`/migrações (propriedade exclusiva do Agente 01) — por isso
esta v1 evita completamente esse caminho (nenhuma migration foi criada ou aplicada) e essa lacuna
fica documentada aqui, não escondida.

## Arquivo(s) envolvido(s)

- `prisma/schema.prisma` — precisa de um model novo (proposta abaixo).
- `src/features/playbook/living-playbook/application/livingPlaybook.service.ts` — passaria a
  persistir a sugestão gerada e a atualizar o registro quando alguém anuncia/aprova (eu assumo essa
  parte assim que o model existir — é só trocar o retorno computado por um `create`/`update`).

## Alteração necessária

Sugestão de modelo (nome e campos exatos a seu critério, mas cobrindo):

```prisma
model PlaybookInsight {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  /// Vendedor de origem — User.id, nunca nome livre (mesmo padrão de Lead.owner).
  sellerId   String
  segment    String

  patternTitle       String
  patternDescription String @db.Text
  suggestedScript    String @db.Text

  /// Quantos AIPendingAction.outcomeStatus=POSITIVE embasaram esta sugestão no momento da geração
  /// — histórico, não recalculado depois (a base real pode crescer/mudar).
  evidenceCount   Int
  sourceActionIds String[]

  status        PlaybookInsightStatus @default(SUGGESTED)
  broadcastAt   DateTime?
  broadcastBy   String?
  /// Se alguém decidiu promover a sugestão para um item real da Matriz de Objeções.
  promotedToObjectionMatrixItemId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId, sellerId])
  @@index([organizationId, status])
}

enum PlaybookInsightStatus {
  SUGGESTED
  BROADCAST
  DISMISSED
}
```

Alternativa mais simples, se preferir não introduzir um model novo agora: acrescentar
`createdBy String?` e `sourceActionIds String[]` diretamente em `ObjectionMatrixItem` — cobre só o
caso em que a sugestão vira item da matriz, não o caso de broadcast avulso sem virar item
permanente. Decisão sua qual caminho faz mais sentido para o roadmap.

## Teste esperado

Depois da migration, os testes existentes em
`src/features/playbook/living-playbook/application/__tests__/livingPlaybook.service.test.ts`
continuam válidos para a lógica de agrupamento/geração; um teste novo cobriria
`prisma.playbookInsight.create` sendo chamado com os campos corretos, e a idempotência de não
recriar uma sugestão idêntica numa nova rodada (mesmo (sellerId, segment, patternTitle) dentro de
uma janela, análogo ao `idempotencyKey` de `AIPendingAction`).

## Contexto adicional

- Onda que motivou este handoff: item 42 do roadmap de 50 itens ("IA Agêntica de Vendas" e
  correlatos), coordenado por Giselle nesta sessão de swarm.
- V1 real e funcional já está em produção nesta onda sem depender desta migration — este handoff é
  sobre fechar o loop (histórico, medição de adoção), não sobre destravar a feature.
- Ver `.agents/runs/onda-49.md` para o resumo completo da onda.

## Resolução

Model implementado como `PlaybookInsight` (não a "alternativa mais simples" mencionada acima —
optei pela tabela própria porque o handoff já apontava a lacuna real de broadcast avulso sem virar
item permanente da Matriz de Objeções, que a alternativa não cobria).

- **`prisma/schema.prisma`**: novo model `PlaybookInsight` (com `organizationId`, `sellerId`,
  `segment`, `patternTitle`/`patternDescription`/`suggestedScript`, `evidenceCount`,
  `sourceActionIds: String[]`, `status: PlaybookInsightStatus`, `broadcastAt`/`broadcastBy`,
  `promotedToObjectionMatrixItemId`) e enum `PlaybookInsightStatus` (`SUGGESTED`/`BROADCAST`/
  `DISMISSED` — `DISMISSED` fica reservado, nenhuma rota escreve esse valor ainda). Segue os campos
  da proposta original quase 1:1; a única mudança foi trocar `sourceActionIds` de proveniência
  textual solta para IDs reais de `AIPendingAction` (agora coletados em `loadOutcomeGroups`).
  Relação `Organization.playbookInsights` adicionada.
- **Migration**: `prisma/migrations/20260920010000_add_playbook_insight/migration.sql` —
  `CreateTable`, dois índices (`organizationId+sellerId`, `organizationId+status`), FK para
  `Organization` (`ON DELETE CASCADE`), e RLS com o padrão simétrico USING/WITH CHECK que
  `20260917180000_fix_rls_tenant_write_isolation` já havia estabelecido como correto para
  `ObjectionMatrixItem`/`QualificationMatrixItem` (sem bypass de tenant nesta tabela nova).
  `npx prisma validate` e `npx prisma generate` passam.
- **`livingPlaybook.service.ts`**: `generateWinningPatterns` continua recalculando do zero a cada
  chamada (nunca confia num padrão persistido como fato adquirido — a base de evidências pode
  mudar), mas agora persiste cada sugestão via `persistInsight` — que deduplica contra um insight
  ainda ativo (`SUGGESTED`/`BROADCAST`) para o mesmo `(sellerId, segment, patternTitle)` dentro de
  `INSIGHT_DEDUPE_WINDOW_MS` (7 dias, mesmo espírito do `idempotencyKey` de `AIPendingAction`) em
  vez de duplicar. Falha de persistência é logada e nunca derruba a geração — `insightId` volta
  `null` nesse caso, a sugestão continua disponível para revisão. `broadcastWinningPattern` ganhou
  um `insightId`/`broadcastBy` opcionais: quando informados, marca o registro como `BROADCAST` sem
  jamais desfazer a notificação já criada se essa atualização falhar (comportamento observável
  preservado — CLAUDE.md seção 6).
- **Controller/rota/API/UI**: `LivingPlaybookController.broadcast` aceita `insightId` opcional no
  body e passa `req.user.id` como `broadcastBy`; `playbook.api.ts` e `LivingPlaybookReview.tsx`
  repassam o `insightId` que `generateSuggestions` já devolve, fechando o loop ponta a ponta sem
  quebrar um chamador antigo que não envie o campo.
- **Testes**: `livingPlaybook.service.test.ts` ganhou casos para criação, atualização
  (deduplicação) e falha tolerada de `persistInsight`, e para `broadcastWinningPattern` marcar
  `BROADCAST` (com e sem falha de update). 12 → 20 testes no arquivo, todos verdes.
- **Verificação**: `npx prisma validate` OK; `npx tsc --noEmit` sem novos erros (os erros
  pré-existentes em `PrismaCompanyRepository.ts`/`PrismaContactRepository.ts`/etc. não foram
  tocados por esta mudança); `npx eslint src/features/playbook` limpo; `vitest run -c
  vitest.unit.config.ts src/features/playbook src/features/intelligence` — 43 arquivos, 323 testes,
  todos passando.
- Não migrado: `ObjectionMatrixItem`/`QualificationMatrixItem` continuam sem campo de proveniência
  (`createdBy`/`sourceActionIds`) — fora do escopo desta resolução, só mencionado no problema
  original como contexto.
