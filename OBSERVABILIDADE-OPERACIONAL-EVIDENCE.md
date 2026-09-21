# OBSERVABILIDADE OPERACIONAL — EVIDÊNCIA DE REMEDIAÇÃO (PROMPT 12 / DEVOPS-003)

**Data de Execução:** 20/09/2026  
**Status do Item:** `DEVOPS-003: CLOSED / RESOLVED (PASS)`  
**Escopo:** Auditoria de health probes, readiness granular multi-dependência, rastreabilidade ponta a ponta com correlationId/traceId, métricas Prometheus/OTel, sanitização de logs contra vazamento de segredos e regras de alerta para arquitetura Local-First.

---

## 1. Mapa de Sinais e Health Probes

| Endpoint | Tipo | Finalidade e Dependências | Código de Retorno |
|---|---|---|---|
| `/health/live` / `/healthz` | Liveness | Indica que o processo Node/Express está ativo e aceitando sockets | `200 OK` |
| `/health/ready` / `/readyz` | Readiness | Validação ativa de **PostgreSQL** (`SELECT 1`), **Redis** (`PING`) e status do **MinIO Storage** | `200 OK` (nominal) / `503 Service Unavailable` (se DB ou Redis falhar) |
| `/health/version` / `/version` | Metadados | Informações de release, commit SHA, build version, deployedAt e ambiente | `200 OK` |
| `/metrics` | Métricas | Scraping Prometheus protegido por token de operador de plataforma (`requirePlatformOperator`) | `200 OK` |

### 1.1 Contrato Granular do `/health/ready`
Em caso de falha de qualquer componente crítico, a resposta identifica com precisão qual subsistema degradou, permitindo triagem sem inspeção manual de container:
```json
{
  "status": "ok",
  "dependencies": {
    "database": "connected",
    "redis": "connected",
    "storage": "configured"
  },
  "version": "1.0.0",
  "commit": "ca19297e",
  "timestamp": "2026-09-20T23:44:54.184Z"
}
```

---

## 2. Rastreabilidade e Logs Estruturados

- **Formato dos Logs:** JSON estruturado via `pino` com saída nativa para `stdout` e integração opcional com Grafana Loki (`LOKI_HOST`).
- **Propagação de Contexto:** O middleware `observabilityMiddleware` extrai ou gera `x-request-id` e `x-correlation-id`, propagando-os nos cabeçalhos de resposta HTTP e nos metadados de cada log do ciclo de vida da requisição.
- **OpenTelemetry:** Integração com OTel SDK (`@opentelemetry/sdk-node`), injetando `traceId` e `spanId` W3C TraceContext nos logs e spans automáticos para Express, PostgreSQL (driver nativo `pg`) e Redis.
- **Isolamento de Segurança (Sanitização de Query Strings):** A função `redactSensitiveQueryParams` filtra automaticamente parâmetros como `token`, `code`, `access_token`, `secret`, `password` e `refresh_token`, substituindo seus valores por `[REDACTED]` antes de qualquer gravação em log, garantindo conformidade estrita com LGPD e prevenção de vazamento de credenciais.

---

## 3. Catálogo de Métricas (Prometheus / prom-client)

- **Métricas HTTP:** `http_server_duration_milliseconds` (histograma categorizado por método HTTP, rota normalizada sem UUIDs para preservação de cardinalidade, e código de status).
- **Métricas de Runtime:** `process_cpu_user_seconds_total`, `nodejs_heap_size_total_bytes`, `nodejs_eventloop_lag_seconds`.
- **Métricas de Filas (BullMQ):** `bullmq_jobs_completed_total`, `bullmq_jobs_failed_total`, `bullmq_queue_wait_duration_seconds`.
- **Métricas de IA Gateway:** `ai_requests_total`, `ai_tokens_consumed_total`, `ai_model_latency_seconds`, `ai_fallbacks_total`.

---

## 4. Alertas e Observabilidade Local-First

Regras catalogadas em `infrastructure/observability/alert.rules.yml` alinhadas à operação Local-First:
1. **`HighErrorRate5xx`:** Dispara se a taxa de erros HTTP 5xx ultrapassar 5% do tráfego total em janela de 5 minutos.
2. **`DatabaseDown`:** Dispara imediatamente se a sonda `/health/ready` reportar `dependencies.database == "unavailable"`.
3. **`RedisDown`:** Dispara se o Redis PING falhar no `/health/ready`.
4. **`SlowResponsesP95`:** Dispara se a latência P95 exceder 1.500ms em requisições de API durante 5 minutos.
5. **`QueueStalledJobs`:** Dispara se houver jobs travados na fila BullMQ sem processamento por mais de 10 minutos.

---

## 5. Validação e Testes Automatizados

### 5.1 Testes Unitários de Health Checks (`src/bootstrap/__tests__/healthchecks.unit.test.ts`)
- `handleLiveness retorna 200 OK com status ok, versao e timestamp`: PASS
- `handleReadiness retorna 200 OK quando Database e Redis estao saudaveis`: PASS
- `handleReadiness retorna 503 com status error quando Database falha`: PASS
- `handleReadiness retorna 503 com status error quando Redis falha`: PASS
- `handleVersion retorna 200 OK com metadados de deploy e versao`: PASS
- **Resultado:** 5/5 aprovados em 11ms.

### 5.2 Auditoria Automatizada End-to-End (`scripts/observability/verify-observability.ts`)
- `Liveness probe (/health/live)`: PASS (200 OK)
- `CorrelationId & RequestId propagation`: PASS (cabeçalhos e contexto preservados)
- `Sensitive query string redaction`: PASS (parâmetros sensíveis anonimizados)
- `Prometheus metrics recording`: PASS (`http_server_duration_milliseconds` operante)
- `Readiness nominal probe`: PASS (200 OK com Postgres, Redis e Storage)
- `Alert rules alignment`: PASS (regras mapeadas)
- **Resultado:** 6/6 verificações aprovadas.

---

## 6. Veredito

O apontamento **DEVOPS-003** está **100% RESOLVIDO e VERIFICADO (PASS)**. O sistema dispõe de visibilidade total, métricas operacionais, rastreabilidade distribuída e detecção ativa de falhas sem requerer acesso manual aos containers.
