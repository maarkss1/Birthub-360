- De: 08 — revisão final local
- Para: 14 — Ambiente de Execução e Test Harness
- Onda: 13 — validação local de pendências em 2026-09-16
- Status: aberto
- Prioridade: bloqueador

## Problema

Integração e E2E não chegaram a executar: o Docker Desktop instalado no Windows não
disponibiliza o pipe `dockerDesktopLinuxEngine`. A tentativa de iniciar com
`docker desktop start --timeout 60` terminou com `context deadline exceeded`.
O bloqueio foi confirmado fora do sandbox; não é uma falha de teste nem um PASS.

## Arquivo(s) envolvido(s)

- `scripts/test/prepare-integration-env.js` (preservado)
- `tests/integration/backfill-contact-pii.test.ts`
- `tests/integration/backfill-voice-transcript-pii.test.ts`
- `tests/integration/import-agent-catalog.test.ts`

## Alteração necessária

Restabelecer o engine Docker local ou executar o mesmo commit em ambiente de CI com
Postgres, Redis e Meilisearch reais. Reexecutar o provisionamento existente e os dois
gates completos. Não definir `CI=true` para contornar o provisionamento local, não
reduzir asserts, não substituir o banco por mocks e não converter falhas em skips.

## Teste esperado

`npm run test:integration` e `npm run test:e2e` devem ultrapassar o pretest, aplicar
migrações no banco isolado e produzir resultados reais das suítes. Confirmar
especialmente dry-run, criptografia, índices cegos, idempotência e preservação de
UserRole nos três testes revisados. Release permanece bloqueado até a evidência.

## Contexto adicional

Branch `codex/finalize-pending-work`, baseada em `bb7f2aa6`. Nenhuma alteração de
schema, migração ou script de provisionamento faz parte deste pacote. O smoke da
invocação `process.execPath --import tsx` passou no Windows com argumentos contendo
espaços e `&`, sem shell; isso não substitui os testes de banco.
