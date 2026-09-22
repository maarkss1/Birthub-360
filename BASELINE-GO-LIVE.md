# BASELINE GO-LIVE — BIRTH HUB 360° (MODO 100% LOCAL-FIRST)

**Data de Geração:** 2026-09-20  
**Auditor / Engenheiro:** Agente Autônomo Antigravity  
**Alvo:** Repositório `maarkss1/Birthub-360`  
**Branch:** `main`  
**HEAD SHA:** `0b76143d7004e5fcf94209f6dd0856eb36cc5175`  
**Mensagem de Commit:** `chore(infra): retirar Render, Neon, Cloudflare e pipelines cloud em favor do modo 100% Local-First`  
**Status do Git Worktree:** Não-rastreados e modificações estritamente documentais (`DELTA-2026-09-20.md`, `tsconfig.tsbuildinfo`, `BIRTH-HUB-360-GO-LIVE-AUDIT.html`, `birth-hub-360-go-live-audit.json`). Zero código de aplicação alterado nesta etapa.  

---

## 1. Fotografia do Ambiente de Execução

| Componente | Versão / Estado | Detalhes |
|---|---|---|
| **Node.js** | v24.19.0 | Runtime oficial ativo |
| **npm** | 11.17.0 | Gerenciador de pacotes ativo |
| **Prisma CLI / Client** | 7.10.0 | Query Compiler enabled, postgresqlExtensions |
| **TypeScript** | 6.0.3 | Compilador estático |
| **Docker Compose** | Ativo | 6 containers saudáveis em execução |
| `birthhub_postgres` | `Up (healthy)` | Porta host `5434` -> `5432` (db: `prospectordb`) |
| `birthhub_redis` | `Up (healthy)` | Porta host `6379` -> `6379` |
| `birthhub_minio` | `Up (healthy)` | Portas host `9000-9001` -> `9000-9001` |
| `birthhub_litellm` | `Up (healthy)` | Porta host `4000` -> `4000` |
| `birthhub_ollama` | `Up (healthy)` | Porta host `11434` -> `11434` |
| `birthhub_meilisearch` | `Up (healthy)` | Porta host `7700` -> `7700` |
| **Local Doctor** | `doctor.mjs` OK | PostgreSQL e Auth apontam para localhost; alerta de STORAGE_ENDPOINT ausente |

---

## 2. Resultado dos Gates Estáticos e Dinâmicos de Qualidade

| Comando | Resultado | Duração / Métrica | Observação |
|---|---|---|---|
| `npm run lint` | **PASS** (0 erros) | 912ms | 1.164 arquivos checados pelo Biome |
| `npx tsc -b --noEmit` | **PASS** (0 erros) | ~40s | Zero erros em todo o projeto |
| `npm run build` | **PASS** | 34.96s | Vite 6.4.3 + esbuild `server.cjs` (2.6MB) |
| `npm run verify:pwa-precache` | **PASS** | 187ms | 147 entradas reais precacheadas (8.330,74 KiB) |
| `npm run test:architecture` | **PASS** | ~12s | 991 módulos analisados, 0 novas violações, hotspots aprovados |
| `npm run test:unit` | **PASS** | 402.93s | **408 arquivos de teste passaram (408/408), 3.383 testes passaram (3.383/3.383)**, 0 falhas |
| `npx prisma migrate status` | **BLOCKED (Code 1)** | <3s | 123 aplicadas, 2 pendentes (`20260920000000`, `20260920010000`) |

---

## 3. Reconciliação dos Achados Históricos e Divergências de Auditoria

### 3.1. TypeScript em `src/shared/security/urlGuard.ts`
- **Estado Histórico:** Erro TS2345 na linha 177, parâmetro de `undiciFetch`.
- **Estado Atual:** **FIXED**.
- **Evidência:** Corrigido no commit `fa4749c0` com tipagem precisa via `Parameters<typeof undiciFetch>[1]`.
- **Verificação:** `npx tsc -b --noEmit` conclui com 0 erros.

### 3.2. As 2 Migrações Pendentes no PostgreSQL
- **Estado Atual:** **PENDENTE DE APLICAÇÃO (GATE 02 BLOCKED)**.
- **Migrações:**
  1. `20260920000000_add_ailog_agentrole`: adiciona coluna `agentRole` e índice composto em `AILog`.
  2. `20260920010000_data007_organizationid_not_null_guarded`: aplica `NOT NULL` e `ON DELETE CASCADE` com guardas estritas que lançam exceção se houver linhas órfãs com `organizationId IS NULL`.
- **Ação Obrigatória:** Executar **PROMPT 02** (Preflight de dados -> Backup -> `npx prisma migrate deploy`).

### 3.3. Matriz de Reconciliação dos 16 Production Blockers Históricos

| ID | Título | Severidade | Estado Atual | Evidência Código / Teste | Commit / SHA | Ação Necessária |
|---|---|---|---|---|---|---|
| **SEC-001** | Fail-closed em `BETTER_AUTH_SECRET` | HIGH / P0 | **RESOLVIDO** | `src/config/env.ts:406-453` aborta boot com `process.exit(1)`; 15 testes aprovados em `tests/unit/config/env.test.ts`. | `783f8582` | Nenhuma ação de código necessária. Manter verificado. |
| **SEC-002 / BACKEND-001** | CORS confiando em extensões Chrome por scheme | HIGH / P1 | **RESOLVIDO** | `src/bootstrap/security.ts:138-154` removeu `startsWith('chrome-extension://')`; exige origem exata em `ALLOWED_ORIGINS`; 11 testes aprovados em `tests/unit/bootstrap/security.test.ts`. | Anterior a 09-20 | Nenhuma ação de código necessária. |
| **DOCBRAND-011** | Regressão em `moduleKey` do Hub Executivo | CRITICAL / P0 | **RESOLVIDO** | `src/config/module-catalog.ts:9-33` aposentou módulos Atlas GR proprietários; 3 testes aprovados em `src/config/__tests__/module-catalog.test.ts`. | `09-20` | Nenhuma ação necessária. |
| **CRM-002 / CRM-003** | Hard-delete órfão em deduplicação de leads | CRITICAL / P0 | **RESOLVIDO** | `LeadDeduplicationService.ts:67-220` roda em `requestContext.run({ tenantId })`, reatribui relações e executa soft-delete interceptado com `AuditLog`; 9 testes aprovados em `LeadDeduplicationService.test.ts`. | Anterior a 09-20 | Nenhuma ação necessária. |
| **DEVOPS-001 / DEVOPS-002** | Backup, restore e deploy com containers errados (OCI) | CRITICAL / P0 | **RESOLVIDO NO OCI / PENDENTE NO LOCAL-FIRST** | OCI deletado em `783f8582`. `scripts/backup.sh` e `scripts/restore.sh` apontam para postgres local. Falta automação e restore drill comprovado (Gate 07). | `783f8582` / `0b76143d` | **Executar PROMPT 10** (Rotina automatizada + restore drill). |
| **DATA-006** | 3 índices únicos parciais fora do `schema.prisma` | MEDIUM | **RESOLVIDO** | Mapeados no schema com comentários e validados diretamente no catálogo do Postgres por 3 testes de integração em `tests/integration/partial-unique-indexes-drift.test.ts`. | `f68e1a80` | Nenhuma ação de código necessária. |
| **TENANT-001** | Vazamento cross-tenant em storage do Copiloto IA | CRITICAL / P0 | **RESOLVIDO** | `CopilotoIaUseCases.ts:223-227` valida prefixo `copiloto-ia/${organizationId}/${id}/` e devolve 403; testado em `CopilotoIaUseCases.unit.test.ts` (38 testes pass). | Anterior a 09-20 | Nenhuma ação necessária. |
| **TENANT-002** | Admin de tenant alterando settings de IA globais | HIGH / P1 | **RESOLVIDO** | `src/features/intelligence/routes/intelligence.routes.ts:590-594` exige `requireRole(['ADMIN'])` E `requirePlatformOperator`; testado por 28 testes em `intelligence.routes.test.ts`. | Anterior a 09-20 | Nenhuma ação necessária. |
| **PRODUCT-004 / VOICE-001** | Script de IA de voz hardcoded para marca de um tenant | CRITICAL / P0 | **RESOLVIDO** | `src/features/integrations/birth-voice/voiceScript.ts` monta prompt por tenant; testado em `birthVoice.service.test.ts` (9 testes pass). Módulos executivos aposentados. | Anterior a 09-20 | Nenhuma ação necessária. |
| **AIAGENT-003 / AIAGENT-004** | Catálogo de 391 agentes vs execução real | HIGH / P1 | **DOCUMENTAL** | Catálogo opera como matriz referencial; execução protegida por `agentBus`. | Baseline | Ajuste documental de posicionamento. |
| **BILLING-004 / BILLING-003** | Fatura "paga" auto-atestada sem reconciliação | HIGH / P1 | **CONDICIONAL** | Webhook da Stripe valida HMAC mas reconciliação automática de fatura não está conectada. | Baseline | **Executar PROMPT 08** (Conter billing ativo no GO-LIVE ou documentar cobrança manual). |
| **INTEGRATION-001** | Cobrança Stripe sem chave de idempotência | HIGH / P1 | **RESOLVIDO** | `stripe.service.ts:348-357` exige `idempotencyKey` não vazio (≤255 chars); 30 testes unitários aprovados em `tests/unit/features/integrations/stripe/`. | Anterior a 09-20 | Nenhuma ação necessária no código de criação. |
| **DEVOPS-003** | Ausência de observabilidade operacional | HIGH / P1 | **RESOLVIDO** | Prometheus `/metrics`, OpenTelemetry e `/health/live`, `/health/ready` implementados com nota 95 no Gate 08. | Baseline | Nenhuma ação impeditiva. |
| **VOICE-003** | LGPD data-subject erasure incompleto para voz | HIGH / P1 | **RESOLVIDO EM DB / PENDENTE STORAGE** | `dataSubjectErasure.service.ts:162-212` anonimiza `CopilotoTranscriptSegment`, `CopilotoInsight`, `VoiceCallLog` e `WhatsAppMessage` (4 testes pass). Falta validação do arquivo de áudio no MinIO. | Baseline | **Executar PROMPT 09** (Validar exclusão de áudio no object storage). |
| **VOICE-004** | Áudio/transcrições gravados em texto puro | MEDIUM | **RESOLVIDO** | `VoiceCallLog` e `CopilotoTranscriptSegment` incluídos em `ENCRYPTED_MODEL_FIELDS` (`src/lib/crypto/piiFields.ts:65-76`); 10 testes pass em `piiFields.unit.test.ts`. | Baseline | Nenhuma ação de código necessária. |

---

## 4. Relação Exata dos Próximos Prompts a Executar

Com base na reconciliação real do código e testes, os prompts a serem executados são:

1. **PROMPT 02 (Obrigatório - BLOQUEADOR)**: `02_DB-MIGRATIONS-INTEGRIDADE.txt`
   - *Motivo:* Aplicar as 2 migrações pendentes (`20260920000000` e `20260920010000`) após preflight de dados NULL em `organizationId`. Desbloqueia o Gate 02.
2. **PROMPT 08 (Obrigatório - ALTO)**: `08_STRIPE-IDEMPOTENCY-RECONCILIACAO.txt`
   - *Motivo:* Definir a contenção de billing/reconciliação de webhooks no release Local-First para evitar falso status de pagamento.
3. **PROMPT 09 (Obrigatório - ALTO)**: `09_LGPD-VOICE-ERASURE.txt`
   - *Motivo:* Validar a exclusão dos arquivos físicos de áudio no MinIO durante o `eraseDataSubject`.
4. **PROMPT 10 (Obrigatório - CRÍTICO)**: `10_BACKUP-RESTORE-DRILL.txt`
   - *Motivo:* Criar rotina automatizada de backup diário com retenção >=14 dias e executar um restore drill contra um banco de recuperação para fechar o Gate 07.
5. **PROMPT 11 (Obrigatório - ALTO)**: `11_MINIO-STORAGE.txt`
   - *Motivo:* Sanar o aviso do doctor definindo `STORAGE_ENDPOINT` no ambiente local e atestar isolamento de tenant no MinIO.
6. **PROMPT 13 (Obrigatório - BLOQUEADOR)**: `13_CICD-LOCAL-FIRST.txt`
   - *Motivo:* Desbloquear o Gate 06 alinhando os workflows ao modelo 100% Local-First e removendo bloqueios órfãos.
7. **PROMPT 14 (Obrigatório - MÉDIO)**: `14_RUNTIME-CONFIG-DOCS.txt`
   - *Motivo:* Saneamento de documentação (`LOCAL_FIRST.md`, `SECURITY.md` canal oficial, referências a IPs antigos).
8. **PROMPT 15 (Obrigatório)**: `15_INTEGRACAO-E2E-REGRESSAO.txt`
   - *Motivo:* Execução da suíte de integração e E2E pós-remediações.
9. **PROMPT 16 (Obrigatório - FINAL)**: `16_REAUDITORIA-9-GATES.txt`
   - *Motivo:* Reauditoria formal dos 9 gates com emissão do veredito atualizado.
10. **PROMPT 17 (Obrigatório - FINAL)**: `17_RELEASE-GATE-EVIDENCE.txt`
   - *Motivo:* Evidência final de release e arquivo de decisão Go-Live.

*Nota:* Os prompts **03, 04, 05, 06, 07 e 12** tiveram seus requisitos técnicos integralmente comprovados e testados neste baseline, não necessitando de intervenção corretiva adicional além das verificações contidas nos testes de regressão dos prompts 15 e 16.
