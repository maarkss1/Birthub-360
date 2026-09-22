# CERTIFICAÇÃO DE PROCESSAMENTO ASSÍNCRONO — ONDA 19
## Birth Hub 360º / Prospector Atlas

**Data da Auditoria:** Agosto de 2026
**Status Atual da Onda 19:** `NOT GA READY - ASYNC PROCESSING REQUIRES PRODUCTION ACTIVATION AND CERTIFICATION`
**Decisão de Arquitetura:** `QUEUES REQUIRED FOR FULL GA = YES`

---

## 1. RESUMO EXECUTIVO E DECISÃO FINAL

A análise exaustiva e baseada 100% em evidências do código fonte do **Birth Hub 360º (Prospector Atlas)** concluiu que:

1. **O MVP Atual opera com `ENABLE_QUEUES=false`:**
   - No deploy atual na OCI, a variável `ENABLE_QUEUES=false` permanece como padrão. O servidor HTTP opera de modo síncrono/degradado, tratando requisições e operando fluxos básicos com degradamento gracioso para rotas que tentam enfileirar jobs (e.g., retornando `enfileirado: false` e mantendo estados pendentes sem travar o processo HTTP).
2. **O lançamento em Full GA exige Redis + Worker (`ENABLE_QUEUES=true`):**
   - Para o lançamento completo em General Availability (Full GA), a habilitação de **Redis + Worker dedicado é OBRIGATÓRIA**.
3. **Status de Validação Operacional:**
   - **GA BLOCKED UNTIL QUEUES ARE ENABLED AND VALIDATED IN PRODUCTION**. A arquitetura de código para filas está implementada e pronta, porém a **certificação operacional em produção na OCI ainda está PENDENTE** de ativação e testes reais em ambiente de execução.

### Veredito Binário
```text
QUEUES REQUIRED FOR FULL GA = YES
STATUS = GA BLOCKED UNTIL QUEUES ARE ENABLED AND VALIDATED IN PRODUCTION
```

---

## 2. DIFERENCIAÇÃO DE ESTADOS DA APLICAÇÃO

| Dimensão | MVP Atual (`ENABLE_QUEUES=false`) | Full GA Exigido (`ENABLE_QUEUES=true`) |
|---|---|---|
| **Deploy na OCI** | Padrão atual no Blueprint/OCI sem container Redis/Worker dedicado ativo | Exige serviço Redis provisionado e processo `worker.ts` dedicado rodando |
| **Qualificação / Enrichment** | Operação síncrona / retornos de alerta informando filas desabilitadas | Processamento em segundo plano sem impactar a latência do HTTP |
| **Agentes Autônomos (Swarm)** | Desativados / sem agendamento periódico de background jobs | Execução autônoma contínua via `agentQueue` e `swarmSchedulerQueue` |
| **Sincronização CRM / Bitrix** | Execução síncrona pontual / sem cron background contínuo | Sincronização periódica resiliente via `bitrixSyncQueue` |
| **Sinais/Mensagens WhatsApp** | Requer processamento síncrono direto no webhook | Processamento assíncrono isolado com retries e fila dedicada |
| **Evidência no Código** | Código implementado com verificações `if (queuesEnabled)` e fallbacks | Código preparado com BullMQ, RLS AsyncLocalStorage, dead-letters |
| **Evidência Operacional** | Confirmada em testes locais / dev / CI | **PENDENTE DE ATIVAÇÃO E VALIDAÇÃO EM PRODUÇÃO OCI** |

---

## 3. INVENTÁRIO REAL E MATRIZ DE MATURIDADE DOS JOBS (26 JOBS)

Auditoria realizada em `src/lib/queue/`, `src/features/`, `src/bootstrap/workers.ts` e `src/worker.ts`.

| # | Fila / Job | Módulo | Função do Job | Crítico MVP? | Executa s/ Queue? | Fallback Disponível? | Perda de Dado Possível? | Degradação da Experiência | Retry Necessário? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `leads-enrichment` | Intelligence / CRM | Qualificação automática de leads via IA / LLM | **SIM** | Não | Parcial (retorna job `no-queue`) | Sim (lead não qualificado) | Alta (score/temperatura ausentes) | SIM (Backoff Exp 5s) |
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

## 4. O QUE PERMANECE PENDENTE PARA CERTIFICAÇÃO EM PRODUÇÃO

Apesar de a base de código do **Birth Hub 360º** possuir suporte completo a BullMQ, RLS AsyncLocalStorage, dead-letter logging e shutdowns graciosos, a **certificação final de produção (GA)** necessita da execução e validação dos seguintes itens operacionais na OCI:

1. **Habilitação de Infraestrutura na OCI:**
   - Provisionar instância/container Redis com senha forte e configurar `REDIS_URL` em produção.
   - Definir `ENABLE_QUEUES=true` no ambiente de produção.
   - Iniciar o processo worker dedicado (`npm run start:worker` / `worker.ts`).

2. **Validação Operacional Runtime:**
   - Validar que o probe de prontidão `/health/ready` responde `200 OK` ao pugar com sucesso o Redis online.
   - Testar o comportamento da aplicação quando o Redis fica offline (garantir isolamento de erros via `process-guards`).
   - Processar jobs críticos em ambiente de homologação/produção (e.g., `leads-enrichment`, `bitrix-sync`, `whatsapp-signal-queue`).
   - Verificar a retenção de falhas e registro em audit log via `recordDeadLetter`.
   - Validar retries com backoff exponencial sob interrupções simuladas.
   - Testar o shutdown gracioso do processo worker (`SIGTERM`/`SIGINT`) garantindo que nenhum job em execução seja corrompido.
   - Validar todas as jornadas de produto dependentes de processamento assíncrono em ambiente real.

---

## 5. ESTIMATIVA DE RECURSOS OCI PARA ACTIVATION

| Componente | Memória RAM Estimada | CPU Estimada | Armazenamento | Recomendação |
|---|---|---|---|---|
| **Redis Server (v7.2+)** | 256 MB - 512 MB | 0.2 - 0.5 OCPU | In-Memory + AOF (~2 GB) | Configurar `maxmemory 512mb` e policy `volatile-lru`. |
| **Worker Node.js (`worker.ts`)**| 384 MB - 768 MB | 0.5 - 1.0 OCPU | Ephemeral | Executar em processo/container separado do servidor web. |
| **Servidor Web Express** | 512 MB - 1024 MB | 0.5 - 1.0 OCPU | Ephemeral | Mantido leve pois delega background jobs ao worker. |
| **TOTAL ESTIMADO STACK** | **~1.5 GB - 2.3 GB** | **1.2 - 2.5 OCPU** | **~10 GB Disk** | Compatível com VM OCI Ampere A1 / Standard Instance. |

---

## 6. CONCLUSÃO REVISADA

A Onda 19 atesta que o código-fonte está **tecnicamente preparado** para suporte a filas, mas a aplicação **PERMANECE NÃO CERTIFICADA PARA GA** até que a infraestrutura de Redis e Worker seja ativada e operacionalmente validada em ambiente de produção na OCI.
