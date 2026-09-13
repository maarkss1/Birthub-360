- De: 07
- Para: 05 (Prospecção)
- Onda: 6
- Status: aberto
- Prioridade: normal

## Problema

`accountIntelligenceService` (`src/features/market-intelligence/server/accountIntelligence.service.ts:864+`)
tem ZERO chamadores em `src/` e `tests/`, e é estruturalmente incapaz de funcionar: todos os 8 métodos
fazem `new AccountIntelligenceService(tx, '')`, e o construtor (linha 358) faz
`if (!organizationId) throw new AppError('Organização autenticada não informada.', 403)`.
String vazia é falsy — qualquer chamada lançaria 403.

Achado durante o reaudit da AIAGENT-004, fora do escopo do Agente 07 (arquivo é de
market-intelligence).

## Arquivo(s) envolvido(s)

`src/features/market-intelligence/server/accountIntelligence.service.ts` (linhas 353-359, 864-935)

## Alteração necessária

Decidir entre: (a) remover o singleton morto; ou (b) corrigi-lo para receber `organizationId` real
se houver consumidor planejado. NÃO foi tocado por 07 — a classe em si é usada corretamente pela
rota real (`defaultServiceFactory`) e pela rota nova do Agente LDR (`AIAGENT-004`).

## Teste esperado

Teste que afirme o comportamento escolhido (ausência do export, ou 403 só sem tenant real).

## Contexto adicional

A rota nova `/api/agent/commercial-cell/ldr-intelligence/run` usa a CLASSE via fábrica no DI
container com `req.db` + `req.user.organizationId` — não depende deste singleton.
