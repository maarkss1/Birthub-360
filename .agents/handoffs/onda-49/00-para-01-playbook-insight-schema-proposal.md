- De: sessão de swarm (item 42 do roadmap — "Playbook Vivo")
- Para: Agente 01 (Plataforma, Segurança e Dados)
- Onda: 49
- Status: aberto
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
