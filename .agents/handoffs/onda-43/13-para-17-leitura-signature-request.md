- De: 13
- Para: 17
- Onda: 43
- Status: aberto
- Prioridade: normal

## Problema

O Agente Contratos & Assinatura da Célula Comercial
(`src/features/intelligence/agents/contractSignature.agent.ts`) narra prontidão/status de
assinatura, mas hoje não pode ser ligado a dado real: `src/features/cadence/infra/
PrismaSignatureRequestRepository.ts` (via `SignatureRequestRepositoryPort` em `application/
documentSignature.ts`) só expõe `create`, `markSent`, `findByProviderRequestId` (usado pelo
webhook) e `updateStatus` — nenhum método de LEITURA por `organizationId` ou `documentId` para uma
tela/agente consultar "qual o status de assinatura deste documento agora".

## Arquivo(s) envolvido(s)

- `src/features/cadence/infra/PrismaSignatureRequestRepository.ts` (propriedade do Agente 17)
- `src/features/cadence/application/documentSignature.ts` (interface `SignatureRequestRepositoryPort`)

## Alteração necessária

Um método de leitura, por exemplo `findByDocumentId(organizationId, documentId)` ou
`listByOrganization(organizationId, filter?)`, retornando o(s) `CrmDocumentSignatureRequest` real
com status atual. Não precisa de UI própria — o consumidor imediato seria uma rota nova em
`src/features/intelligence/routes/agent.routes.ts` (`POST /commercial-cell/contract-signature/run`,
mesmo padrão já aplicado a `revenue-intelligence`/`churn-retention` nesta onda: resolvida via
`container.resolve()`, registrada em `src/shared/di/setup.ts`, nunca por import direto
cross-feature).

## Teste esperado

Teste unitário do novo método do repositório (ou do use case que o expõe), cobrindo: documento
sem solicitação de assinatura (retorna null/vazio, não erro), documento com solicitação em
andamento, documento com solicitação já num estado terminal (`signed`/`declined`/`expired`/
`cancelled`).

## Contexto adicional

Ver `.agents/handoffs/onda-43/13-para-00-instalacao-celula-comercial.md` (seção "Resolução",
pendência 1) para o racional completo — os outros 2 agentes bloqueados pela mesma classe de
problema (`revenue-intelligence`, `churn-retention`) já foram resolvidos nesta onda registrando o
serviço real no container de DI compartilhado; o mesmo caminho serve aqui assim que o método de
leitura acima existir.
