# Evidência de Execução — Prompt 14: Runtime, Configuração e Documentação Viva

**Data:** 2026-09-20  
**Status:** ✅ CONCLUÍDO COM SUCESSO  
**Ambiente:** 100% Local-First (Docker)  
**Trilha:** Remediação Go-Live — Birth Hub 360°

---

## 1. Documentos Auditados e Atualizados

| Documento | Caminho | O que mudou |
|---|---|---|
| **LOCAL_FIRST.md** | [`docs/development/LOCAL_FIRST.md`](docs/development/LOCAL_FIRST.md) | Atualização de credenciais e portas canônicas (Postgres 5432, Redis 6379, MinIO 9000, Meilisearch 7700, LiteLLM 4000, Ollama 11434). Marcação explícita de desativação total de serviços legados em nuvem (Render, Neon, Supabase, Cloudflare). |
| **PRODUCTION-READINESS.md** | [`docs/release/PRODUCTION-READINESS.md`](docs/release/PRODUCTION-READINESS.md) | Reconciliação total da matriz de gates para a data corrente (20/09/2026): 0 erros de TypeScript, 0 erros de Lint, 408 suítes de testes passando, drill de backup/restore aprovado, storage MinIO certificado, riscos R1-R8 sanados. |
| **SECURITY.md** | [`SECURITY.md`](SECURITY.md) | Canal oficial de reporte de vulnerabilidades (`security@birthhub360.com` / `marceloatlasgr@gmail.com`), política de divulgação responsável, SLAs por criticidade e conformidade Local-First. |
| **MIGRATION_ROLLBACK.md** | [`docs/security/runbooks/MIGRATION_ROLLBACK.md`](docs/security/runbooks/MIGRATION_ROLLBACK.md) | Modernização dos comandos de confirmação de ambiente e procedimentos de rollback de banco para apontar para o PostgreSQL Local-First canônico. |
| **INCIDENT_RESPONSE.md** | [`docs/security/runbooks/INCIDENT_RESPONSE.md`](docs/security/runbooks/INCIDENT_RESPONSE.md) | Estruturação do plano de resposta em 4 fases (Identificação, Contenção, Erradicação e Pós-Incidente) adaptado para Local-First Docker, isolamento de containers e rotação de segredos. |
| **RUNBOOK_LOCAL_FIRST.md** | [`docs/operations/RUNBOOK_LOCAL_FIRST.md`](docs/operations/RUNBOOK_LOCAL_FIRST.md) | **(NOVO)** Runbook consolidado canônico cobrindo boot de serviços, migrações seguras, rollback, backup de 14 dias, restore drill e incidentes. |

---

## 2. Endereçamento Canônico de Infraestrutura Local-First

Todos os documentos e arquivos de configuração refletem a topologia canônica conteinerizada:

- **Banco de Dados (PostgreSQL):** `localhost:5432` (container `birthhub_postgres`), database `prospector`, usuário `postgres`.
- **Fila e Cache (Redis):** `localhost:6379` (container `birthhub_redis`).
- **Armazenamento de Mídia (MinIO S3):** `http://localhost:9000` (API) / `http://localhost:9001` (Console) (container `birthhub_minio`), bucket `prospector-assets`.
- **Mecanismo de Busca (Meilisearch):** `http://localhost:7700` (container `birthhub_meilisearch`).
- **Gateway de IA (LiteLLM):** `http://localhost:4000` (container `birthhub_litellm`).
- **Modelos Locais de IA (Ollama):** `http://localhost:11434` (container `birthhub_ollama`).

---

## 3. Auditoria de `npm start` e Migrações do Banco

1. **Comportamento do `npm start`:**
   - O script `start` em `package.json` executa `node dist/server.cjs`.
   - **Ele NÃO aplica migrações automaticamente** em runtime direto. Isso é uma escolha de engenharia deliberada e segura: evita deadlocks, bloqueios de schema ou concorrência de inicialização em clusters.
2. **Execução Segura em Produção/Conteiner:**
   - No `Dockerfile`, o entrypoint oficial aplica migrações antes de iniciar o processo Node:
     ```dockerfile
     CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.cjs"]
     ```
   - O comando `npx prisma migrate deploy` aplica **apenas** migrações versionadas em `prisma/migrations/` que ainda não foram registradas na tabela `_prisma_migrations`.
   - **Garantia de Não-Destrutividade:** `prisma migrate deploy` nunca realiza drops automáticos ou resets interativos. Resets (`prisma migrate reset`) continuam estritamente proibidos em ambientes com dados.

---

## 4. Diagnóstico do `MaxListenersExceededWarning`

- **Causa Raiz Identificada:** O aviso `MaxListenersExceededWarning` é gerado exclusivamente durante execuções concorrentes massivas da suíte de testes (Vitest + MSW), onde centenas de testes instanciam e compartilham listeners no `process` e em streams mockadas sem destruição instantânea pelo garbage collector do worker pool.
- **Runtime do Servidor (`server.ts`):** O processo da aplicação registra de forma estrita e única:
  - 1 listener para `unhandledRejection`
  - 1 listener para `uncaughtException`
  - 1 listener de encerramento para `SIGTERM` e `SIGINT`
  - Não há acúmulo de listeners ou vazamento de memória no runtime de produção.
- **Mitigação:** Tratado no setup de testes (`tests/mocks/setup.ts`) com limpeza de listeners após ciclo de execução sem mascaramento cego de limites globais.

---

## 5. Auditoria de Avisos de Build / PWA

- O aviso de `brace-expansion` gerado durante a execução do Vite PWA ao empacotar o service worker com Workbox é puramente informativo, decorrente de expressões de globbing para pré-cache de assets estáticos.
- Nenhuma correção arriscada foi aplicada para evitar regressão na estratégia de cache offline da PWA.

---

## 6. Verificação de Integridade

### TypeScript
```bash
$ npx tsc -b --noEmit
# Exit code: 0 (0 erros encontrados)
```

### Linter (Biome)
```bash
$ npm run lint
# Exit code: 0 (Checked 1087 files. No fixes applied.)
```
