# CERTIFICAÇÃO DE PROCESSAMENTO ASSÍNCRONO — ONDA 19
## Birth Hub 360º / Prospector Atlas

**Data da Auditoria:** Agosto de 2026
**Status Final:** CERTIFICADO PARA GENERAL AVAILABILITY (GA)
**Decisão de Produção:** `QUEUES REQUIRED FOR GA = YES` (Opção B)

---

## 1. RESUMO EXECUTIVO E DECISÃO FINAL

A análise exaustiva e baseada 100% em evidências do código fonte do **Birth Hub 360º (Prospector Atlas)** concluiu de forma **definitiva e incondicional** que a aplicação **NÃO PODE operar em produção com `ENABLE_QUEUES=false`**.

A habilitação de **Redis + Worker (`ENABLE_QUEUES=true`) é OBRIGATÓRIA para o lançamento em General Availability (GA)**.

### Veredito Binário
```text
QUEUES REQUIRED FOR GA = YES
```

### Justificativa baseada no código:
1. **Atuação de Agentes Autônomos (Swarm / Job Roles):** Os agentes executam ciclos contínuos de prospecção, qualificação, limpeza e reação a eventos de mercado. Sem filas (`agentQueue`, `swarmSchedulerQueue`), a inteligência autônoma da plataforma fica completamente paralisada.
2. **Integração Bi-direcional com CRM (Bitrix24 / WhatsApp):** A extração, sincronização de leads/negócios, envio de mensagens e comandos via WhatsApp/Bitrix dependem diretamente de `bitrixSyncQueue`, `whatsappCommandQueue` e `whatsappSignalQueue`. Desabilitar filas impede a sincronização em tempo real e a execução do webhook assíncrono.
3. **Cascatas de Enriquecimento e Prospecção:** O enriquecimento de dados CNPJ/Google/Apollo em cascata (`enrichmentCascadeQueue`) e prospecção fria (`coldCallQueue`) dependem do processamento em segundo plano para contornar limites de taxa (rate limits) e timeouts de provedores externos. Sem fila, chamadas diretas síncronas estouram o timeout HTTP (30s) e provocam perda de dados.
4. **Isolamento de Tenant & RLS:** Todos os trabalhadores (workers) executam no contexto isolado via `requestContext.run({ tenantId })` e respeitam as políticas de Row Level Security (RLS) no PostgreSQL.
5. **Observabilidade & Resiliência:** Métricas Prometheus dedicadas (`bullmq_*`), retries com backoff exponencial, suporte a dead-letter queues e shutdown gracioso de workers foram implementados e validados no ecossistema.

---

## 2. INVENTÁRIO REAL E MATRIZ DE MATURIDADE DOS JOBS (26 JOBS)

Auditoria realizada em `src/lib/queue/`, `src/features/`, `src/bootstrap/workers.ts` e `src/worker.ts`.

| # | Fila / Job | Módulo | Função do Job | Crítico MVP? | Executa s/ Queue? | Fallback Disponível? | Perda de Dado Possível? | Degradação da Experiência | Retry Necessário? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `leads-enrichment` | Intelligence / CRM | Qualificação automática de leads via IA / LLM | **SIM** | Não | Não | Sim (lead não qualificado) | Alta (score/temperatura ausentes) | SIM (Backoff Exp 5s) |
| 2 | `agent-queue` | Intelligence / Swarm | Execução de tarefas autônomas dos Agentes IA | **SIM** | Não | Não | Sim (ação do agente não executada) | Crítica (recursos de IA paralisados) | SIM (Backoff Exp) |
| 3 | `enrichment-queue` | CRM / Companies | Enriquecimento em lote de empresas/leads | **SIM** | Não | Parcial (retorna `enfileirado: false`) | Não (permanece pendente) | Alta (processamento manual exigido) | SIM (Backoff Exp) |
| 4 | `enrichment-cascade-queue` | Prospecting | Cascata de enriquecimento CNPJ/Google/Apollo | **SIM** | Não | Não | Sim (perda de dados enriquecidos) | Alta (timeout na rota HTTP) | SIM (Backoff Exp 8s) |
| 5 | `whatsapp-signal-queue` | WhatsApp / Telemetria | Ingestão e processamento de sinais do WhatsApp | **SIM** | Não | Não | Sim (perda de mensagem/sinal) | Crítica (atendimento interrompido) | SIM (Backoff Exp) |
| 6 | `whatsapp-command-queue` | WhatsApp / Bot | Envio de comandos/mensagens WhatsApp | **SIM** | Não | Não | Sim (mensagem não enviada) | Crítica (falha na comunicação) | SIM (Backoff Exp) |
| 7 | `bitrix-sync` | Integrations / Bitrix | Sincronização periódica de leads e negócios Bitrix | **SIM** | Não | Não | Sim (desalinhamento com CRM) | Crítica (dados legados desatualizados) | SIM (Backoff Exp) |
| 8 | `follow-up-queue` | CRM / Automations | Varredura e disparo de tarefas de follow-up | **SIM** | Não | Não | Sim (follow-up esquecido) | Alta (perda de oportunidade comercial) | SIM (Backoff Exp) |
| 9 | `executive-summary` | CRM / Executive | Geração diária de resumo executivo do CRM | NÃO | Não | Não | Não (pula relatório do dia) | Média (executivo sem resumo diário) | SIM |
| 10 | `deduplication-queue` | CRM / Quality | Detecção e fusão assíncrona de leads duplicados | NÃO | Não | Não | Não | Média (leads duplicados na base) | SIM |
| 11 | `win-loss-analysis` | Commercial Intel | Análise de causa raiz de ganhos e perdas | NÃO | Não | Não | Não | Média (insights indisponíveis) | SIM |
| 12 | `weekly-pdf-report` | CRM / Reports | Geração de relatórios consolidados em PDF | NÃO | Não | Não | Não | Baixa | SIM |
| 13 | `auto-anonymize` | LGPD / Compliance | Anonimização automática de leads desqualificados | **SIM** | Não | Não | Sim (não conformidade LGPD) | Crítica (risco legal/compliance) | SIM |
| 14 | `cold-leads-scanner` | CRM / Automations | Varredura de leads frios para reengajamento | **SIM** | Não | Não | Não | Média (cadência fria interrompida) | SIM |
| 15 | `stagnation-scanner` | CRM / Automations | Varredura de negócios estagnados no funil | **SIM** | Não | Não | Não | Média (funil estagnado sem alerta) | SIM |
| 16 | `account-intelligence-scheduler` | Market Intel | Agendamento diário LDR para inteligência | **SIM** | Não | Não | Sim (LDR não agendado) | Média | SIM |
| 17 | `account-insights-queue` | Market Intel | Geração de insights de contas estratégicas | **SIM** | Não | Não | Não | Média | SIM |
| 18 | `forecast-snapshot` | Commercial Intel | Snapshot semanal do Forecast comercial | **SIM** | Não | Não | Sim (perda de histórico do forecast) | Alta (métrica de acurácia quebrada) | SIM |
| 19 | `copiloto-transcription` | Copiloto IA | Transcrição assíncrona de reuniões/áudio | **SIM** | Não | Parcial (áudio salvo no storage) | Não (áudio retido) | Alta (transcrição pendente) | SIM (Backoff Exp 10s) |
| 20 | `news-monitor` | Market Intel | Monitoramento de notícias corporativas dos leads | NÃO | Não | Não | Não | Baixa | SIM |
| 21 | `cadence-run` | Cadence / Outbound | Execução de passos de cadência (e-mail/task) | **SIM** | Não | Não | Sim (passo de cadência não executado)| Crítica (outbound parado) | SIM |
| 22 | `agent-memory-cleanup` | AI / System | Limpeza periódica de memória/contexto dos agentes| NÃO | Não | Não | Não | Baixa (acúmulo de contexto) | SIM |
| 23 | `search-indexing` | Search / Meilisearch| Indexação assíncrona para busca global | **SIM** | Não | Não | Não | Média (busca com dados antigos) | SIM |
| 24 | `cold-call-campaign` | Prospecting | Disparo de campanhas de prospecção fria | **SIM** | Não | Não | Sim (campanha não disparada) | Alta | SIM |
| 25 | `swarm-scheduler` | Intelligence / Swarm | Agendamento do enxame autônomo de agentes | **SIM** | Não | Não | Sim (enxame inativo) | Crítica | SIM |
| 26 | `bitrix-extraction-purge` | Integrations / Bitrix| Purga e limpeza de arquivos extraídos do Bitrix | NÃO | Não | Não | Não | Baixa | SIM |

---

## 3. INFRAESTRUTURA HABILITADA PARA GA

Para garantir a operação estável com `ENABLE_QUEUES=true` em produção:

1. **Configuração do Redis & Auth Guard:**
   - Variável de ambiente obrigatória: `REDIS_URL=redis://:SUA_SENHA_FORTE@redis-host:6379/0`
   - O módulo `src/lib/queue/redis.ts` implementa a guarda de autenticação (`makeAuthGuard`), interrompendo tentativas infinitas de re-conexão em caso de erro de credenciais (`NOAUTH`/`WRONGPASS`), evitando poluição de logs.

2. **Processo Worker Dedicado (`worker.ts`):**
   - Em produção, o processo web HTTP atua como produtor (`queuesEnabled=true`) e as filas são processadas pelo processo dedicado `npm run worker` (`isDedicatedWorkerProcess=true`).
   - Bloqueio explícito: `ENABLE_EMBEDDED_WORKERS=true` é rejeitado em produção no processo HTTP para evitar disputa de CPU/RAM com requisições do usuário.

3. **Healthcheck e Probes Kubernetes/Docker:**
   - Em `src/bootstrap/healthchecks.ts`, o endpoint `/health/ready` (e `/readyz`) realiza a verificação completa do banco de dados e do Redis (`connection.ping()`) apenas quando `queuesEnabled=true`. Se o Redis estiver fora do ar, o probe retorna HTTP 503, prevenindo o roteamento de tráfego para instâncias não prontas.

4. **Tratamento de Dead-Letter & Shutdown Gracioso:**
   - Todos os workers usam `isFinalAttempt` e gravam falhas definitivas via `recordDeadLetter` (`src/lib/queue/deadLetter.ts`).
   - O gerenciador de shutdown gracioso (`src/bootstrap/shutdown.ts`) encerra os workers e fecha as conexões do ioredis de forma limpa ao receber sinais `SIGTERM` / `SIGINT`.

---

## 4. DIMENSIONAMENTO DE RECURSOS OCI (ORACLE CLOUD INFRASTRUCTURE)

Avaliação de consumo real para provisionamento da VM (Compute Shape OCI / Ampere A1 ou E4):

| Componente | Memória RAM Estimada | CPU Estimada | Armazenamento | Recomendação |
|---|---|---|---|---|
| **Redis Server (v7.2+)** | 256 MB - 512 MB | 0.2 - 0.5 OCPU | In-Memory + AOF (~2 GB) | Configurar `maxmemory 512mb` e policy `volatile-lru`. |
| **Worker Node.js (`worker.ts`)**| 384 MB - 768 MB | 0.5 - 1.0 OCPU | Ephemeral | Executar em processo/container separado do servidor web. |
| **Servidor Web Express** | 512 MB - 1024 MB | 0.5 - 1.0 OCPU | Ephemeral | Mantido leve pois delega background jobs ao worker. |
| **TOTAL ESTIMADO STACK** | **~1.5 GB - 2.3 GB** | **1.2 - 2.5 OCPU** | **~10 GB Disk** | Perfeitamente compatível com uma VM OCI Free Tier (4 OCPU, 24 GB RAM) ou Standard Instance. |

---

## 5. CONCLUSÃO DA CERTIFICAÇÃO

O **Birth Hub 360º (Prospector Atlas)** está oficialmente **CERTIFICADO** na Onda 19 para operar em **General Availability (GA)** com o ecossistema de filas e workers totalmente ativo (`ENABLE_QUEUES=true`).
