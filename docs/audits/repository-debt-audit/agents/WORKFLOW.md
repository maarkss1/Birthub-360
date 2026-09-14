# WORKFLOW — Auditoria de Infraestrutura de Automação/Workflow

## Agent
WORKFLOW (domínio: workflow engine, automações, notificações, webhooks, filas, workers,
schedulers/cron, gatilhos orientados a evento, retry/backoff, idempotência, dead-letter, auditoria
de ações automatizadas).

## Mission
Auditar toda a infraestrutura de workflow/automação do monorepo Birth Hub 360º e traçar pelo menos
uma automação ponta a ponta (TRIGGER → EVENT → WORKFLOW → QUEUE → WORKER → ACTION → INTEGRATION →
AUDIT LOG → RESULT), reportando onde a cadeia real quebra, é simulada, ou fica órfã — sem confundir
"existe no código" com "está funcionando".

## Scope
- Motor de automações do CRM (`src/features/automations/**`): triggers, condições, ações, retry,
  idempotência, versionamento, dry-run, histórico.
- BullMQ: filas, workers, `defaultJobOptions`, dead-letter, métricas, `upsertJobScheduler`
  (cron/repeat), os dois entrypoints de execução (`worker.ts` dedicado e `src/bootstrap/workers.ts`
  embutido).
- Webhooks de entrada (Bitrix24, 3CX, Birth Voice Hub, CRM360 público) e de saída (n8n).
- Integrações recém-adicionadas (Slack/Stripe/Omie, commit `72f0bd40`) na medida em que tocam
  notificação/automação.
- Observabilidade de fila (Prometheus `src/lib/queue/metrics.ts`, Bull Board `/admin/queues`).
- Fluxo de aprovação humana de ações de agente (`AIPendingAction`/`opsTools.ts`) como um workflow de
  duas etapas (proposta → aprovação → execução).

## Areas inspected
- `src/lib/queue/` (index.ts/leadsQueue, deadLetter.ts, metrics.ts, redis.ts, agent.worker.ts,
  bitrixSync.worker.ts, coldCall.worker.ts, dailyReport.worker.ts, enrichment.queue.ts,
  enrichmentCascade.worker.ts, newsMonitor.worker.ts, search.queue.ts, swarmScheduler.worker.ts,
  whatsappCommand.worker.ts/queue.ts, whatsappSignal.worker.ts)
- `worker.ts` (processo dedicado) e `src/bootstrap/workers.ts` (modo embutido) — os dois pontos que
  instanciam todos os workers e agendam todos os crons.
- `src/features/automations/**` (engine, use cases, idempotência, versionamento, dry-run, histórico,
  N8nWebhookDispatcher, scanners de lead frio/estagnado).
- `src/features/crm/jobs/*.worker.ts`, `src/features/cadence/jobs/cadenceRun.worker.ts`,
  `src/features/intelligence/jobs/agentMemoryCleanup.worker.ts`,
  `src/features/intelligence/services/winLossAnalysis.worker.ts`,
  `src/features/market-intelligence/jobs/*.worker.ts`,
  `src/features/commercial-intelligence/jobs/forecastSnapshotWeekly.worker.ts`,
  `src/features/copiloto-ia/jobs/transcribeConversation.worker.ts`,
  `src/features/integrations/bitrix/jobs/bitrixExtractionPurge.worker.ts`.
- `src/features/crm/presentation/LeadController.ts` (disparo real de evento a partir da ação do
  usuário) e `src/features/activities/services/activity.service.ts` (trigger "Atividade concluída").
- `src/lib/enumMap.ts` e `prisma/schema.prisma` (enum `AutomationTrigger`/`AutomationAction`).
- `src/bootstrap/bullBoard.ts` (admin de filas) e `src/lib/queue/metrics.ts` (Prometheus).
- Webhooks: `src/features/integrations/threecx/threecx.routes.ts`,
  `src/features/integrations/bitrix/bitrix.routes.ts`,
  `src/features/integrations/birth-voice/birthVoice.routes.ts`,
  `src/shared/security/webhookReplayGuard.ts` (por referência).
- Conectores novos: `src/features/integrations/slack/slack.service.ts`,
  `src/features/integrations/stripe/stripe.service.ts` (por referência cruzada — achado de
  idempotência já reportado por INTEGRATION, não duplicado aqui).
- `src/features/intelligence/tools/opsTools.ts` (workflow de aprovação humana de ação de agente).
- Testes: `tests/unit/features/automation-engine-run.test.ts`,
  `automation.engine.retry-idempotency.test.ts`, `automation-sdr-voz.test.ts`,
  `automation-triggers.test.ts`, `stagnation-scanner.service.test.ts`,
  `cold-leads-scanner.service.test.ts`, `sec001-bullboard-access.test.ts`,
  `auto-anonymize-sweep-idempotency.test.ts`, `whatsapp-optout-gating.test.ts`.
- Documentos de auditoria já existentes desta mesma rodada (`docs/audits/repository-debt-audit/agents/INTEGRATION.md`,
  `BILLING.md`) — consultados para não duplicar achados (ex.: Stripe sem Idempotency-Key já é
  INTEGRATION-001).

## Files inspected
~70 arquivos lidos/grepados diretamente (filas, workers, engine de automação, rotas de webhook,
schema Prisma, testes de automação/fila, docs de auditoria já existentes).

## Executive summary
A infraestrutura de workflow deste repositório é, na média, **muito mais madura** do que o padrão
"AI slop" que este tipo de auditoria costuma encontrar: `AutomationEngine` tem retry com
classificação de erro permanente-vs-transitório, dedupe de disparo via Redis, versionamento de
regra, dry-run, histórico persistente e testes de ponta a ponta reais; o pipeline de filas tem
dead-letter centralizado em `AuditLog` (sanitizado, com `reprocessKey` estável), métricas Prometheus
por fila, graceful shutdown com timeout, e dezenas de comentários no próprio código documentando
bugs reais já corrigidos em ondas anteriores (RLS sem tenant, split-brain de scheduler, jobs mortos
vivos no Redis). Rastreei a cadeia completa **TRIGGER → EVENT → WORKFLOW → QUEUE → WORKER → ACTION →
INTEGRATION → AUDIT LOG → RESULT** para o caso real "lead muda de status → automação 'Notificar
equipe' com canal e-mail" (`LeadController.updateLead` → `fireAutomations` → `automationEngine.handle`
→ dedupe Redis → `runActionWithRetry` → `notificationService.create` + `sendEmail` → `AuditLog`
via `automationHistoryService`) e ela está genuinamente fechada, com testes cobrindo sucesso, falha
permanente, falha transitória com retry e duplicidade de evento.

Dito isso, a auditoria encontrou 4 quebras/gaps reais e verificáveis, nenhuma delas CRITICAL:
(1) um worker de fila (`daily-report`) que roda desde o boot mas nunca recebe um job — nenhum
produtor existe no repositório inteiro — e cujo handler, mesmo se disparado, apenas *simula* o envio
do e-mail ("Simulando envio de e-mail para diretores..."); (2) um dispatcher de webhook de saída
para n8n, completo e testável, sem nenhum chamador em todo o código de aplicação — já autodocumentado
como "capacidade sem gatilho de negócio ainda decidido"; (3) um gatilho de automação
("Lead sem interação") declarado em três lugares do código mas sem valor correspondente no enum
Prisma e bloqueado pelo próprio schema de validação Zod — inatingível por construção, e que quebraria
em runtime (enum inválido no Prisma) se algum dia fosse disparado; (4) uma lacuna real de
observabilidade — 15 das ~25 filas do sistema (a maior parte das automações agendadas de produto:
follow-up, resumo executivo, deduplicação, PDF semanal, anonimização automática, scanners de lead
frio/estagnado, cadência, limpeza de memória de agente, purga de extração Bitrix, forecast semanal,
win/loss, transcrição do Copiloto IA, insights de account intelligence) nunca chamam
`registerQueueForMetrics`, então não aparecem nos gauges Prometheus de profundidade/idade de fila
nem no Bull Board — só ganham visibilidade quando um job já esgotou todas as tentativas e cai no
dead-letter do `AuditLog`. Um backlog silencioso (worker travado, Redis lento) nessas 15 filas não
gera nenhum sinal antecipado.

Não encontrei duplicação de cron entre o processo dedicado (`worker.ts`) e o modo embutido
(`src/bootstrap/workers.ts`) — ambos usam `upsertJobScheduler` com o mesmo `jobSchedulerId`
determinístico, e o modo embutido é gateado por `ENABLE_EMBEDDED_WORKERS` (documentado como proibido
em produção). Não encontrei webhook de entrada sem verificação de assinatura nas rotas auditadas
(3CX exige HMAC + replay guard; Bitrix24 tem fluxo de segredo próprio). O achado de maior impacto
financeiro potencial (Stripe sem `Idempotency-Key` em `createStripeCharge`) já está registrado por
INTEGRATION-001 e não é duplicado aqui — apenas referenciado, porque tecnicamente não passa por
nenhuma fila/retry deste domínio (é uma chamada HTTP síncrona direta).

## Critical
Nenhum achado CRITICAL neste domínio nesta auditoria.

## High
Nenhum achado HIGH neste domínio nesta auditoria (o único risco de severidade HIGH tocando filas —
Stripe sem idempotency key — é don domínio INTEGRATION/BILLING; ver referência cruzada em
WORKFLOW-002 abaixo... na verdade não incluído como item numerado aqui para não duplicar).

## Medium
- **WORKFLOW-004** — 15 das ~25 filas BullMQ do produto (a maioria das automações agendadas reais)
  não têm métrica de profundidade de fila nem aparecem no Bull Board; só ficam visíveis via
  dead-letter após esgotar todas as tentativas.

## Low
- **WORKFLOW-001** — Worker `daily-report` órfão (sem produtor) e com ação simulada (não envia
  e-mail de verdade).
- **WORKFLOW-002** — `N8nWebhookDispatcher` (webhook de saída) sem nenhum chamador em produção.
- **WORKFLOW-003** — Gatilho de automação `"Lead sem interação"` inatingível (sem enum Prisma
  correspondente, bloqueado no schema Zod, nunca disparado).
- **WORKFLOW-005** — Notificação da automação ("Notificar equipe") só suporta canal `in_app`/`email`;
  os conectores Slack/Stripe/Omie recém-adicionados (mesmo commit desta sessão) não têm nenhuma
  integração com o motor de automações — só ação manual via UI/rota própria.

## Technical debt
- TD-OBS (WORKFLOW-004): lacuna de observabilidade de fila para a maioria das automações agendadas.
- TD-DEAD (WORKFLOW-001, WORKFLOW-002): worker e dispatcher sem nenhum caller/produtor.
- TD-DATA (WORKFLOW-003): tipo de gatilho declarado em 3 lugares sem contraparte no schema.
- TD-WORKFLOW (WORKFLOW-005): canal de notificação de automação não acompanhou os novos conectores.

## Implementation debt
- `dailyReport.worker.ts` não exporta nenhuma `Queue`/função de agendamento — mesmo que um
  desenvolvedor quisesse religar a feature, teria que criar a `Queue('daily-report', ...)` do zero
  (ela não existe hoje, só o `Worker` consumidor). Isso é evidência adicional de que a feature nunca
  foi terminada, não apenas desativada.
- `N8nWebhookDispatcher.dispatchN8nWebhook` não injeta autenticação (comentário no próprio arquivo
  já registra isso como decisão consciente, delegada ao nó Webhook do n8n) — aceitável hoje porque a
  função nunca é chamada, mas quando algum caller for adicionado, a ausência de qualquer segredo
  compartilhado no payload/headers deve ser revisitada.

## Feature debt
- "Relatório diário por e-mail para diretores" (`dailyReportWorker`) é uma feature que nunca saiu do
  estágio de protótipo: gera texto via LLM, loga, e finge enviar e-mail. Não há UI, rota, nem cron
  que a acione.
- Webhook de saída para n8n existe como capacidade de infraestrutura pronta (URL, timeout, feature
  flag) mas nenhuma decisão de produto foi tomada sobre qual evento deveria disparar qual workflow
  n8n — a integração está "pronta para ligar", não em uso.
- Gatilho "Lead sem interação" parece ser uma automação de reengajamento planejada e nunca
  finalizada (irmã do "Lead estagnado", que foi corrigida e está ativa).

## Bugs
- Nenhum bug ativo confirmado em produção neste domínio (os candidatos a bug — `daily-report` e
  `"Lead sem interação"` — são inatingíveis pela cadeia real de chamadas hoje, então não têm efeito
  em produção; ver WORKFLOW-001/003 para o cenário latente de cada um caso algum dia sejam
  conectados sem correção).

## Architecture
- Padrão consistente e bem documentado entre os ~25 pares fila/worker: `Queue` com
  `defaultJobOptions` (attempts + backoff exponencial + `removeOnComplete`/`removeOnFail`),
  `registerQueueForMetrics`, fábrica `createXWorker()` (nunca `Worker` eager de módulo, exceto
  `dailyReportWorker` — a única exceção, e justamente o worker órfão), `registerWorkerForRuntimeMetrics`,
  handler `on('failed')` chamando `recordDeadLetter` só na tentativa final via `isFinalAttempt`.
  `dailyReportWorker` quebra esse padrão em pelo menos 3 pontos (eager, sem `registerQueueForMetrics`,
  sem `recordDeadLetter`) — outro sinal de que é código deixado para trás, não uma exceção
  arquitetural deliberada.
- Dois entrypoints de execução (`worker.ts` dedicado, `src/bootstrap/workers.ts` embutido) share o
  mesmo conjunto de fábricas `createXWorker`/`scheduleXJob`, com `upsertJobScheduler` garantindo
  idempotência de agendamento entre eles — arquitetura correta para não duplicar cron.

## Security
- Bull Board (`/admin/queues`) tem dupla trava (`requireRole(['ADMIN'])` +
  `requirePlatformOperator`, SEC-001) — correto, mas expõe só 3 das ~25 filas (não é uma falha de
  segurança, é uma lacuna de cobertura que reforça WORKFLOW-004).
- `recordDeadLetter` (`src/lib/queue/deadLetter.ts`) sanitiza chaves sensíveis
  (`authorization|api[-_]?key|token|secret|password|webhook|cookie`) e mensagens de erro (Bearer
  tokens, chaves `sk-`/`gsk-`) antes de persistir no `AuditLog` — boa prática já implementada,
  verificada por leitura direta do código.
- Webhook de entrada do 3CX exige HMAC (`x-3cx-signature`) validado contra `THREECX_WEBHOOK_SECRET`
  E replay guard (`claimWebhookDelivery`) antes de processar — nenhuma falha encontrada nesta rota.

## Tests
- `automation.engine.retry-idempotency.test.ts`, `automation-engine-run.test.ts` e
  `automation-sdr-voz.test.ts` cobrem sucesso, erro permanente (não retenta), erro transitório (retenta
  e conta `retryCount`), dedupe de disparo (mesmo evento duas vezes → só uma execução) e isolamento
  de tenant — cobertura real, não apenas mockada.
- Nenhum teste unitário/integração encontrado para `dailyReport.worker.ts` (reforça que é código
  esquecido, não uma feature ativamente mantida).
- Nenhum teste exercitando `dispatchN8nWebhook` além do que a ausência de qualquer chamador já
  implica (função pura, sem side effect de negócio a testar ainda).

## Integration
- Ver INTEGRATION.md (mesma rodada de auditoria) para o achado de maior severidade tocando
  automação disparada externamente: Stripe sem `Idempotency-Key`. Não duplicado aqui porque não
  atravessa fila/retry deste domínio (chamada HTTP síncrona de rota).
- `N8nWebhookDispatcher` é a única integração de automação "outbound genérica" do sistema e está
  100% inerte (WORKFLOW-002).

## Product
- O motor de automações em si (triggers reais: lead criado, lead mudou de status, atividade
  concluída, lead estagnado) é uma feature de produto genuinamente funcional e testada — vale
  destacar isso porque contrasta com o padrão "recurso decorativo" que este tipo de auditoria
  costuma achar em outros domínios do mesmo repositório.
- A ação "Notificar equipe" ganhou canal e-mail real recentemente, mas os 3 conectores novos
  (Slack/Stripe/Omie, adicionados nesta mesma sessão) ainda não têm um caminho de produto até o
  motor de automações — hoje são painéis de integração isolados, não gatilhos/ações do workflow
  builder (WORKFLOW-005).

## Mock/Fake/Placeholder
- **`dailyReport.worker.ts`** (linha 17): `logger.info(\`Simulando envio de e-mail para
  diretores...\`)` — comentário e comportamento explicitamente simulados, nunca chama
  `sendEmail`/`sendSlackMessage`/qualquer transporte real, apesar do e-mail transacional real já
  existir no mesmo repositório (`src/lib/email/mailer.ts`, usado de verdade por
  `automation.engine.ts`).

## Dead/Orphan code
- `dailyReportWorker` (`src/lib/queue/dailyReport.worker.ts`) — worker ativo, sem produtor (WORKFLOW-001).
- `dispatchN8nWebhook`/`N8nWebhookDispatcher.ts` — função exportada, zero chamadores (WORKFLOW-002).
- Tipo/gatilho `"Lead sem interação"` em `enumMap.ts`, `automation.engine.ts`,
  `automations.api.ts` — inatingível (WORKFLOW-003).

## Quick wins
- Adicionar `registerQueueForMetrics(QUEUE_NAME, queue)` às 15 filas listadas em WORKFLOW-004 — é
  literalmente a mesma linha já usada em 10 outras filas do mesmo diretório, custo mínimo, sem
  risco, ganho real de observabilidade.
- Remover (ou implementar de verdade, com decisão de produto) `dailyReport.worker.ts` — hoje ele só
  consome uma conexão de fila e mente no log; qualquer um dos dois caminhos remove o débito.
- Remover `"Lead sem interação"` das 3 listas de tipo onde é inatingível (ou terminar a feature:
  enum Prisma + migration + inclusão em `AUTOMATION_TRIGGERS` + um disparo real) — hoje é
  inconsistência pura sem custo de manter, mas também sem benefício.

## Structural problems
- Nenhum problema estrutural amplo encontrado no motor de workflow em si. A única discrepância
  estrutural real é a cobertura desigual de métricas de fila (WORKFLOW-004), que é um problema de
  disciplina de padrão (nem toda fila nova lembrou de chamar `registerQueueForMetrics`) e não de
  design.

## Needs verification
- Não foi possível confirmar em runtime (sem acesso a um ambiente com Redis/Postgres reais) se as
  15 filas de WORKFLOW-004 realmente nunca aparecem em nenhum dashboard Grafana já existente que
  leia diretamente do Redis por fora do `metrics.ts` (ex.: um dashboard genérico do BullMQ fora
  deste repositório) — o achado é sobre a ausência de instrumentação NESTE código, não uma garantia
  de que não exista visibilidade nenhuma por qualquer outro meio operacional.

## Complete findings list

### WORKFLOW-001 — Worker `daily-report` órfão e com ação simulada
- **Categoria:** TD-MOCK, TD-DEAD, TD-WORKFLOW
- **Severidade:** LOW · **Prioridade:** P3 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `src/lib/queue/dailyReport.worker.ts` define `export const dailyReportWorker = new
  Worker('daily-report', ...)` cujo handler (linhas 9-23) gera um resumo via LLM e depois só executa
  `logger.info(\`Simulando envio de e-mail para diretores...\`)` — nunca chama um transporte real.
  Não existe, em todo o repositório, nenhuma `Queue('daily-report', ...)` exportada para produtores,
  nenhuma rota, nenhum `upsertJobScheduler`/cron e nenhum outro caller que adicione um job a esta
  fila (confirmado por `grep -rn "dailyReportWorker\|'daily-report'"` — únicos resultados são a
  própria definição e o registro em `worker.ts:231`, que só serve para métricas/shutdown, não
  enfileira nada). O worker é instanciado como singleton de módulo (não como fábrica lazy, ao
  contrário de todos os outros ~24 workers do sistema) e nunca chama `registerQueueForMetrics` nem
  `recordDeadLetter`.
- **Root cause:** feature de "relatório diário por e-mail" iniciada e nunca terminada — falta tanto
  o produtor/agendamento quanto o envio real do e-mail.
- **Business impact:** nenhum hoje (a feature nunca roda). Risco latente: se alguém adicionar um
  agendamento assumindo que o e-mail já é enviado de verdade, diretores nunca receberiam nada, sem
  erro visível.
- **Suggested resolution:** remover o arquivo (é código morto) ou terminá-lo: expor uma `Queue`,
  adicionar `upsertJobScheduler` diário, e trocar o `logger.info` de simulação por uma chamada real a
  `sendEmail` (`src/lib/email/mailer.ts`, já usado por `automation.engine.ts`).

### WORKFLOW-002 — Webhook de saída para n8n sem nenhum chamador
- **Categoria:** TD-DEAD, TD-INTEGRATION, TD-WORKFLOW
- **Severidade:** LOW · **Prioridade:** P4 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `src/features/automations/infra/N8nWebhookDispatcher.ts` implementa
  `dispatchN8nWebhook(event, payload)` — POST real para `${N8N_WEBHOOK_URL}/webhook/${event}`, com
  timeout, feature flag (`ENABLE_N8N_WEBHOOKS`) e tratamento "nunca lança". `grep -rn
  "dispatchN8nWebhook"` no repositório inteiro só retorna a própria definição — nenhuma ação do
  `AutomationEngine` (`AUTOMATION_ACTIONS = ['Notificar equipe', 'Criar atividade', 'Ligar via SDR de
  Voz']`), rota ou serviço a invoca. O próprio arquivo já documenta isso: "Nenhum caller existe
  hoje — isto fica disponível para quando essa decisão for tomada." `ENABLE_N8N_WEBHOOKS`/
  `N8N_WEBHOOK_URL` existem em `.env.example` e `docker-compose.services.yml` provisiona um serviço
  n8n, o que pode sugerir a um operador que a integração está ativa quando não está.
- **Root cause:** infraestrutura de integração construída antecipadamente, decisão de produto
  (qual evento dispara qual workflow n8n) nunca tomada.
- **Business impact:** nenhum hoje (não é invocado). Custo de manutenção mínimo (função pura, sem
  estado).
- **Suggested resolution:** ou mapear explicitamente um evento do `AutomationEngine`/trigger de CRM
  para disparar isso (ação nova "Webhook n8n" no catálogo `AUTOMATION_ACTIONS`), ou remover o
  arquivo e o serviço docker associado até a decisão de produto ser tomada, documentando a remoção.

### WORKFLOW-003 — Gatilho de automação `"Lead sem interação"` inatingível por construção
- **Categoria:** TD-DATA, TD-DEAD, TD-WORKFLOW
- **Severidade:** LOW · **Prioridade:** P3 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `"Lead sem interação"` aparece como membro válido de tipo em 3 arquivos:
  `src/lib/enumMap.ts` (`AutomationTriggerLabel`, mapeado para a string `'Lead_Sem_Interacao'`),
  `src/features/automations/automation.engine.ts` (`AutomationTrigger`), e
  `src/features/automations/automations.api.ts` (tipo do lado do cliente). Porém:
  (1) `prisma/schema.prisma` linha 1833-1838 define `enum AutomationTrigger` com **apenas 4**
  membros (`Lead_Criado`, `Lead_Mudou_Status`, `Atividade_Concluida`, `Lead_Estagnado`) — não existe
  `Lead_Sem_Interacao` no banco; (2) `AUTOMATION_TRIGGERS` (`AutomationUseCases.ts`, o array validado
  por `z.enum(...)` em `automationSchema`) também tem só os mesmos 4 valores — uma tentativa de criar
  uma automação com esse trigger pela API/UI é rejeitada na validação Zod antes de chegar ao banco;
  (3) `grep -rn "Lead sem interação"` no repositório inteiro não retorna nenhum caller disparando
  esse evento (`automationEngine.handle({ trigger: 'Lead sem interação', ... })` nunca acontece).
  Se algum código viesse a chamar isso, `toPrismaAutomationTrigger('Lead sem interação')` produziria
  a string `'Lead_Sem_Interacao'`, passada como `never` para `prisma.automation.findMany({ where:
  { trigger: ... } })` — um valor de enum que não existe no Postgres, que o Prisma rejeitaria em
  runtime.
- **Root cause:** aparenta ser um gatilho de reengajamento ("lead sem interação há X dias") pensado
  como irmão de "Lead estagnado" e nunca finalizado (a correção documentada no próprio código para
  "Lead estagnado" — ver comentário no topo de `AutomationUseCases.ts` — não foi replicada para este).
- **Business impact:** nenhum hoje (inatingível). Risco: inconsistência confunde quem for estender o
  motor de automações, achando que o trigger já é suportado ponta a ponta.
- **Suggested resolution:** remover das 3 listas de tipo (é a opção de menor risco), ou terminar a
  feature adicionando o enum Prisma + migration + entrada em `AUTOMATION_TRIGGERS` + um disparo real
  (ex.: um scanner análogo a `stagnation-scanner.service.ts`).

### WORKFLOW-004 — 15 filas de automação sem métrica de profundidade/observabilidade proativa
- **Categoria:** TD-OBS, TD-WORKFLOW
- **Severidade:** MEDIUM · **Prioridade:** P2 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `src/lib/queue/metrics.ts` expõe gauges Prometheus
  (`bullmq_queue_waiting_jobs`, `_active_jobs`, `_failed_jobs`,
  `bullmq_oldest_waiting_job_age_seconds`) alimentados exclusivamente pelas filas registradas via
  `registerQueueForMetrics(name, queue)`. `grep -rn "registerQueueForMetrics(" src` retorna 10
  chamadas, todas em `src/lib/queue/*.ts` (leads, agent, bitrixSync, coldCall, enrichment,
  enrichmentCascade, search, swarmScheduler, whatsappCommand, whatsappSignal). Nenhuma das 15 filas
  definidas em `src/features/**/jobs/*.worker.ts` e correlatas (`followUp.worker.ts`,
  `dailyExecutiveSummary.worker.ts`, `deduplication.worker.ts`, `weeklyPdfReport.worker.ts`,
  `autoAnonymizeDisqualified.worker.ts`, `cold-leads-scanner.service.ts`,
  `stagnation-scanner.service.ts`, `cadenceRun.worker.ts`, `agentMemoryCleanup.worker.ts`,
  `bitrixExtractionPurge.worker.ts`, `accountIntelligenceInsights.worker.ts`,
  `accountIntelligenceScheduler.worker.ts`, `forecastSnapshotWeekly.worker.ts`,
  `transcribeConversation.worker.ts`, `winLossAnalysis.worker.ts`) chama `registerQueueForMetrics`
  (confirmado por grep dedicado a cada arquivo). Todas essas filas SÃO cron/`upsertJobScheduler`
  reais que processam dados de produção (follow-up de WhatsApp, deduplicação de leads, anonimização
  para LGPD, cadência multicanal, forecast comercial). `src/bootstrap/bullBoard.ts` também só monta
  3 filas (`leadsQueue`, `searchQueue`, `agentQueue`) no painel administrativo `/admin/queues`.
  A única visibilidade que essas 15 filas têm hoje é: (a) contadores de `stalled`/retry via
  `registerWorkerForRuntimeMetrics` (que É chamado para todas, via `worker.ts`/`workers.ts`), e (b)
  um registro em `AuditLog` via `recordDeadLetter` **somente depois de esgotadas todas as
  tentativas** de um job específico — nenhum sinal de "a fila está crescendo" ou "o job mais antigo
  está esperando há 2 horas" antes disso.
- **Root cause:** `registerQueueForMetrics` foi adicionado ao padrão dos workers "de infraestrutura"
  (`src/lib/queue/`) mas o hábito não se propagou para os workers "de feature" adicionados depois em
  `src/features/**/jobs/`, apesar de todos compartilharem a mesma dependência de `metrics.ts` e o
  mesmo padrão de `recordDeadLetter`.
- **Business impact:** se o worker de follow-up, deduplicação, cadência ou anonimização travar
  silenciosamente (ex.: exceção não tratada matando o processo, Redis lento, um bug em uma dessas
  automações), a equipe só percebe pelo sintoma de negócio (leads sem follow-up, dados não
  anonimizados dentro do prazo de LGPD) ou por um dead-letter isolado no `AuditLog` — não existe um
  gráfico/alerta de "fila X tem 4000 jobs esperando".
- **Suggested resolution:** adicionar `registerQueueForMetrics(QUEUE_NAME, queue)` logo após a
  criação de cada uma das 15 `Queue`s listadas (mesma linha usada nas 10 filas que já fazem isso);
  opcionalmente adicionar um alerta Prometheus (`alert.rules.yml`, já citado no código para outras
  métricas) sobre `bullmq_oldest_waiting_job_age_seconds` acima de um limiar por fila crítica
  (follow-up, anonimização, cadência).

### WORKFLOW-005 — Conectores Slack/Stripe/Omie desconectados do motor de automações
- **Categoria:** TD-WORKFLOW, TD-INTEGRATION
- **Severidade:** LOW · **Prioridade:** P3 · **Confiança:** HIGH · **Status:** CONFIRMED
- **Evidência:** `AUTOMATION_ACTIONS` (`src/features/automations/application/AutomationUseCases.ts`)
  e o `switch` de execução em `automation.engine.ts` (`runAction`) só reconhecem 3 ações: "Notificar
  equipe" (canais `in_app`/`email`), "Criar atividade", "Ligar via SDR de Voz". Os 3 conectores
  adicionados nesta mesma sessão (`src/features/integrations/slack/`, `stripe/`, `omie/`, commit
  `72f0bd40`) expõem apenas rotas manuais próprias (`POST /connections/:id/test`, envio de mensagem
  avulsa, criação de cobrança avulsa, sync avulso) chamadas a partir de um painel dedicado em
  `Integrations.tsx` — nenhum deles é uma opção de canal/ação dentro do motor de automações do CRM.
  Um usuário que configure "Notificar equipe" hoje não pode escolher "Slack" como canal, mesmo tendo
  acabado de conectar o Slack da organização.
- **Root cause:** os conectores foram construídos como integrações standalone (mesmo padrão de
  BitrixConnection/ThreeCXConnection), sem uma segunda etapa de produto que os exponha como opção
  dentro do workflow builder existente.
- **Business impact:** funcionalidade manual (enviar mensagem de teste ao Slack, criar cobrança
  avulsa) funciona; funcionalidade de automação ("avisar o time no Slack quando um lead muda de
  status") não existe, apesar de a infraestrutura de mensageria já estar pronta.
- **Suggested resolution:** se for do roadmap, estender `NotifyConfig`/`runAction` para aceitar
  `channel: 'slack'` reaproveitando `sendSlackMessage` já implementado — mudança pequena e de baixo
  risco, dado que o padrão de retry/idempotência do motor já existe e cobre canais externos (e-mail
  já segue esse padrão).

## Capability rows summary
Ver `capability_rows` na saída estruturada.
