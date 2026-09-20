- De: 07
- Para: 14 (Harness)
- Onda: 6
- Status: resolvido
- Prioridade: alto

## Resolução
Resolvido pelo Agente 14 na Onda 6 (commit `6254a32`). O conflito de nome de container e isolamento de ambiente entre worktrees foi corrigido em `scripts/test/prepare-integration-env.js`, permitindo que o gate de integração rodasse e fosse aprovado (48/48 testes na Onda 6). Para `verify:ai`, as diretrizes de execução registram a necessidade de chaves de API para live execution ou skips controlados quando segredos reais não estão configurados.


## Problema

Dois itens do gate obrigatório não são executáveis neste ambiente hoje:

1. `npm run test:integration` — 42 arquivos / 184 testes falham por estado do Postgres de teste
   compartilhado (FK `Company_organizationId_fkey` violada: organização ausente) e Redis
   `WRONGPASS`. CONFIRMADO PRÉ-EXISTENTE: as mesmas 8 falhas foram reproduzidas com o código do
   Agente 07 integralmente revertido para `89fced61`.
2. `npm run verify:ai` — exige `GROQ_API_KEY` ou `OPENAI_API_KEY` reais; aborta com "Nenhum motor
   de IA configurado".

Achado idêntico, de forma independente, pelo Agente 13 no mesmo horário (drift de
`Lead.tags`/`prisma migrate status` mentindo "up to date") — ver
`13-para-14-db-teste-drift-silencioso-lead-tags` na branch `feat/agent-execute-real-llm-execution`.
Duas confirmações independentes no mesmo banco compartilhado (`localhost:5434/prospectordb_test`).

## Arquivo(s) envolvido(s)

`.env.test` (DATABASE_URL :5434, REDIS_URL :6379), `scripts/test/prepare-integration-env.js`,
`docker-compose.postgres-local.yml`, `scripts/verify-ai-studio.ts`

## Alteração necessária

Isolar o banco/Redis de teste por worktree (ou serializar o gate entre agentes do enxame), e
definir como `verify:ai` roda sem credencial real (modo dry-run) ou registrar explicitamente que
exige segredo real para rodar.

## Teste esperado

`npm run test:integration` verde em worktree isolado, sem depender de qual outro agente do enxame
está rodando o gate ao mesmo tempo.

## Contexto adicional

Unit (3153/3153), architecture, lint, tsc e build passam normalmente nesta branch.
