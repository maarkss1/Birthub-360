# Incident Response Plan — Birth Hub 360° (Local-First)

## Overview

Este documento estabelece o plano operacional de resposta a incidentes de segurança, falhas de integridade ou violação de dados para o ambiente canônico Local-First da **Birth Hub 360°**.

Canal de reporte operacional: **`security@birthhub360.com`** ou mantenedor principal (`marcelinmark@gmail.com`).

---

## Phase 1: Identification (Detecção e Triagem)

- **Auditoria de Acesso:** Monitorar a tabela `AuditLog` por anomalias (ex.: picos anormais de `USER_LOGIN_FAILED`, tentativas massivas de acesso não autorizado ou violação de RLS).
- **Métricas e Logs Operacionais:** Inspecionar logs estruturados com `x-request-id` e `x-correlation-id` emitidos pelo middleware de rastreamento (`src/bootstrap/middleware/logging.ts`).
- **Healthchecks:** Verificar `/health/ready` e `/health/live`. Se `dependencies.database`, `redis` ou `storage` entrarem em estado `unhealthy`, iniciar triagem técnica imediata.
- **Armazenamento de Objetos (MinIO):** Inspecionar logs de acesso ao MinIO em `http://localhost:9001` (console) ou via `docker logs birthhub_minio` para acessos não autorizados a áudios de voz ou anexos.

---

## Phase 2: Containment (Contenção Imediata)

1. **Sessões e Autenticação:**
   - Rotacionar imediatamente `BETTER_AUTH_SECRET` no arquivo `.env`.
   - Reiniciar a aplicação (`npm run build && npm start` ou reiniciar o container da aplicação).
   - Isso invalida imediatamente todos os cookies de sessão ativos no Better Auth.

2. **Credenciais e Chaves de Integração:**
   - Se o incidente envolver credenciais de integração (Bitrix24, Bland AI, Google, Stripe, etc.), revogar o token no provedor externo.
   - Rotacionar `CREDENTIALS_ENCRYPTION_KEY` e re-criptografar os segredos necessários (`src/lib/crypto/secretFields.ts`).
   - Rotacionar chaves de armazenamento local (MinIO): atualizar `STORAGE_ACCESS_KEY_ID` e `STORAGE_SECRET_ACCESS_KEY` no `docker-compose.local-first.yml` e no `.env`.

3. **Isolamento de Rede Local / Banco de Dados:**
   - Caso haja suspeita de exfiltração ativa, isolar a porta do Postgres (`docker compose -f docker-compose.local-first.yml stop birthhub_postgres` ou revogar portas expostas temporariamente).
   - Para colocar o banco em modo somente leitura (read-only):
     ```sql
     ALTER DATABASE "prospector" SET default_transaction_read_only = true;
     ```

---

## Phase 3: Eradication & Recovery (Erradicação e Recuperação)

1. **Correção de Vulnerabilidades:**
   - Identificar a causa raiz (ex.: falta de validação Zod, falha em política RLS, falha em middleware de autorização).
   - Aplicar patch corretivo no código com testes automatizados dedicados.
   - Validar com `npx tsc --noEmit` e `npm run lint`.

2. **Restauração de Dados (se houver corrupção ou destruição):**
   - Caso os dados do banco tenham sido corrompidos, executar restauração a partir do último backup verificado íntegro (ver `docs/security/runbooks/MIGRATION_ROLLBACK.md` e `scripts/local-first/restore-local.ps1`).
   - Validar a integridade pós-restauração com `npm run backup:drill`.

3. **Retomada dos Serviços:**
   - Retornar transações para leitura e escrita:
     ```sql
     ALTER DATABASE "prospector" SET default_transaction_read_only = false;
     ```
   - Reiniciar todos os containers de infraestrutura:
     ```powershell
     docker compose -f docker-compose.local-first.yml up -d
     node scripts/local-first/doctor.mjs
     ```

---

## Phase 4: Post-Incident & Lessons Learned (Pós-Incidente)

- Elaborar relatório detalhado de causa raiz (RCA - Root Cause Analysis) em `docs/security/incidents/`.
- Atualizar o modelo de ameaças (`docs/security/THREAT_MODEL.md`) com novos vetores identificados.
- Se dados pessoais (LGPD) foram afetados, avaliar notificação à ANPD e aos titulares conforme Art. 48 da Lei 13.709/2018.
- Atualizar a suíte de testes de regressão de segurança.
