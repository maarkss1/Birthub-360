# Runbook — Prospector-Atlas (Agente 10, Onda 4 — atualizado na Onda 8, go-live; corrigido para Oracle Cloud em ACH-10-01)

Runbook de resposta a incidentes e de go-live para os cenários já mapeados como bloqueadores em
`/AGENTS.md` e para migração/rollback (missão do Agente 10 — ver
`.agents/prompts/10-infraestrutura-sre.md`).

**Antes de tudo: qual é o deploy ativo?** Verifique o ambiente real antes de agir.

> **Correção (ACH-10-01, ver relatório de auditoria): a tabela abaixo estava desatualizada em
> relação a `docs/deploy/README.md` e ao ADR-004.** A correção anterior (ITEM-12, 2026-08-25)
> dizia "hoje não há nenhum deploy cloud ativo" (modo local-first) — isso já não é verdade desde
> `docs/ADR/ADR-004-Producao-Oracle-Cloud.md` (2026-09-05): o dono do produto decidiu que o
> destino definitivo de produção passa a ser **Oracle Cloud Infrastructure, self-hosted**
> (`docker-compose.oci.yml`), com uma instância real já provisionada e recebendo tráfego. Render
> continua ativo em paralelo como **fallback durante a transição** (não descontinuado, não recebe
> mais investimento de infraestrutura novo) até o cutover Oracle estar validado (backup/restore/
> smoke = PASS) — ver [`docs/deploy/README.md`](../../docs/deploy/README.md) para o inventário
> completo e sempre atualizado dos quatro caminhos. Esta página é a fonte de verdade sobre "qual é
> o ambiente real" — se este runbook e `docs/deploy/README.md` voltarem a divergir no futuro,
> `docs/deploy/README.md` prevalece e este arquivo deve ser corrigido para bater com ele.

| Caminho | Status (ver `docs/deploy/README.md` §1 para o estado sempre atualizado) | Onde |
| --- | --- | --- |
| **Oracle Cloud Infrastructure, self-hosted** (`app`+`postgres`+`caddy`; Redis/worker opt-in via profile `queues`) | **Alvo definitivo de produção (ADR-004)** — instância real provisionada, recebendo tráfego; deploy automático via `deploy-oci.yml` pendente de ativação dos secrets SSH (ver `docs/deploy/oracle-cloud.md` §3.3), deploy manual via SSH funciona hoje | `docker-compose.oci.yml`, `docs/deploy/oracle-cloud.md` |
| Render (monólito Express: API + estático do Vite) + Supabase (Postgres/Storage) + Cloudflare (DNS/CDN) | **Ativo, fallback durante a transição** — continua recebendo tráfego real hoje; não desligar antes do cutover Oracle validado | `render.yaml`, `docs/deploy/producao.md` |
| Kubernetes/Helm/ArgoCD (`k8s/`, `charts/`, `argocd/`) | Aspiracional/legado, nenhum cluster real registrado | `charts/README.md`, `argocd/README.md`, `k8s/README.md` |

> **Correção de registro (Onda 8, ainda válida):** a missão citava "Render+Vercel" como caminho
> real — verificado que **não existe Vercel neste projeto**, é um único serviço Render
> (`prospector-atlas`, `srv-d9qtn8bm8hqs7395qtpg`) servindo API e frontend estático do mesmo
> processo Express. A seção "Go-live (Render)" abaixo usa "Render" para esse caminho.

Os passos abaixo cobrem os três caminhos com tráfego real ou potencial (Oracle Cloud, Render, k8s
aspiracional); identifique qual se aplica antes de agir — comandos `docker compose -f docker-
compose.oci.yml ...` não têm efeito nenhum se o incidente é no Render, e vice-versa, e comandos
`kubectl`/`helm`/`argocd` não têm efeito nenhum enquanto não existir cluster real.

## 0. Go-live — passo a passo executável (Render)

Verificado nesta rodada contra o serviço Render real via MCP (workspace "Marcelo's workspace",
serviço `prospector-atlas` = `srv-d9qtn8bm8hqs7395qtpg`, branch `main`, plano `free`, região
`oregon`) — não é um procedimento teórico, é o que o serviço configurado hoje realmente faz.

### 0.1 Pré-checks (antes de mesclar em `main`)

1. `ci.yml` (GitHub Actions) verde no PR/commit que vai para `main` — lint, typecheck, testes
   unitários/integração/E2E, build. O Render **não roda gate de qualidade nenhum**, só
   `buildCommand` (ver `docs/deploy/producao.md` seção 2.3) — se `main` não tiver branch
   protection exigindo `ci.yml`, código quebrado chega direto em produção no próximo push.
2. Se a mudança envolve `prisma/schema.prisma`/migrations: confirmar que a migration é seguramente
   aplicável a dados de produção existentes (`.claude/skills/database-integrity/SKILL.md`) —
   nenhuma migration destrutiva sem plano de compensação. Domínio do Agente 01, não deste runbook,
   mas é o pré-check de maior risco real (ver bloqueador #5 de `/AGENTS.md`: "Deploy capaz de
   iniciar sem aplicar migrações" — aqui o risco inverso, migração que quebra o boot, é o que este
   passo cobre).
3. Confirmar que nenhuma env var nova exigida pelo código já mesclado está faltando no Render
   (**Environment** do serviço) — o processo sobe com a env ausente lida como `undefined`/valor
   default do schema Zod (`src/config/env.ts`), não falha o build; o sintoma só aparece em
   runtime (rota específica quebrando, feature "inacessível").
4. Checklist completo de validação pós-deploy já existe e não deve ser duplicado aqui — ver
   `docs/deploy/producao.md` seção 7 (domínio do Agente 08; incorpora o antigo
   `docs/deploy/RELEASE_CHECKLIST.md`, removido do controle de versão em 22/08/2026, ver
   `docs/REMOVED-DOCS.md`).

### 0.2 Ordem de deploy (automática, sem passo manual — confirmado no serviço real)

Cada push em `main` dispara, sem intervenção:

1. **Build**: `npm ci --include=dev && npm run build`.
2. **Migração antes do start** (contrato de `/AGENTS.md` bloqueador #5, implementado por
   Agente 01/08): `startCommand: npx prisma migrate deploy && npm run start` — só migrations novas
   desde o baseline já aplicado rodam; `npm run start` só é executado (logo, só passa a aceitar
   tráfego) depois que `prisma migrate deploy` termina com sucesso.
3. **Health check antes de rotear tráfego**: Render bate em `healthCheckPath: /health/ready`
   (`SELECT 1` real no Postgres, não só "processo respondeu") até responder `200` antes de mover
   tráfego para a instância nova. Instância antiga continua servindo até esse ponto.
4. Se migração ou health check falharem, o deploy é abortado — instância antiga permanece no ar.
   **Não há downtime automático em nenhum desses casos** — o único jeito de ter downtime é a
   instância antiga também cair antes da nova ficar pronta.
5. **Ressalva do plano `free`**: `preDeployCommand` (instância efêmera separada para migração,
   zero-downtime "de verdade") só existe em planos pagos do Render — o serviço está em
   `plan: free` hoje (sem cartão cadastrado no workspace) e roda a migração dentro do
   `startCommand` em vez de uma instância separada. A garantia de "nunca servir tráfego contra
   schema desatualizado" continua valendo (passo 3); só perde o isolamento extra.

Não há passo manual de "disparar o deploy" no fluxo normal — é `git push`/merge em `main`. Um
redeploy manual sem novo commit (ex.: limpar cache de build) é feito pelo botão "Manual Deploy" no
dashboard, ou pela chamada de API/MCP `trigger_deploy` (redeploya sempre o HEAD atual da branch
configurada — não aceita um commit específico, não serve para rollback, ver seção 6).

### 0.3 Confirmar saúde pós-deploy

1. `GET https://<host-do-serviço>/health/live` → `200 { status: "ok" }` (processo vivo).
2. `GET https://<host-do-serviço>/health/ready` → `200` (Postgres real acessível). Se isto já
   passou, o Render já roteou tráfego pra essa instância — checar isto de fora é redundante com o
   próprio health check do Render, mas confirma que continua saudável minutos depois do deploy,
   não só no instante do rollout.
3. Dashboard Render → serviço → aba **Deploys**: status do deploy mais recente deve ser `live`
   (não `deactivated`/`build_failed`/`update_failed`). Confirmado nesta rodada: a API de deploys
   do Render (usada também pelo MCP Render) retorna exatamente esse enum de status por deploy —
   deploys anteriores ficam com status `deactivated` automaticamente quando um novo fica `live`,
   não são apagados (isso é o que sustenta o rollback da seção 6).
4. Métricas nativas do Render (CPU/memória) na aba **Metrics** do dashboard, ou via `get_metrics`
   do MCP Render — confirmado funcionando neste serviço (memória/CPU por instância retornam
   série real). **Gap encontrado nesta rodada**: `http_request_count` retornou vazio para este
   serviço via API — não há confirmação de que a contagem nativa de requisições HTTP do Render
   está populada para este serviço (pode ser limitação do plano `free`, falta de tráfego real
   registrado, ou outra causa não identificada). Não depender só da métrica nativa do Render para
   confirmar tráfego pós-deploy — usar os `/health/*` e os logs (`list_logs`/aba Logs) como fonte
   primária até isso ser investigado.
5. Seguir o checklist funcional completo (login, `/api/companies`, RLS por tenant, IA, TLS) em
   `docs/deploy/producao.md` seção 7 — não duplicado aqui.

### 0.4 Quem aciona rollback e como

**Lacuna que precisa de decisão humana, não técnica**: este repositório não define, em nenhum
documento existente (`/AGENTS.md`, `docs/deploy/**`, `.agents/**`), quem tem autoridade/acesso para
acionar um rollback em produção nem um canal de escalonamento (on-call, Slack, telefone). Isso não
é algo que este agente pode decidir por conta própria — é uma decisão organizacional. Registrado
aqui como pendência explícita para o usuário/gestão definir antes do primeiro incidente real:
- quem tem acesso ao dashboard Render do workspace de produção (rollback de código é uma ação
  manual do dashboard, ver seção 6 — não há automação scriptável para isso hoje);
- canal de decisão para autorizar rollback quando o incidente também envolve dado (migration
  aplicada que precisaria de compensação, não só reverter código — ver seção 6).

**Mecanismo (como), já confirmado tecnicamente** — ver seção 6, "Rollback via Render".

## 0-OCI. Go-live e operação — Oracle Cloud (`docker-compose.oci.yml`, alvo definitivo de produção)

Procedimento completo (provisionamento, firewall/VCN, segredos, cutover de domínio, backup/
restore, migração de dado) já documentado em `docs/deploy/oracle-cloud.md` — não duplicado aqui.
Esta seção cobre só o que um plantão de incidente precisa saber que é **diferente** do caminho
Render:

1. **Não há dashboard cloud** — tudo é `docker compose` via SSH na instância (IP público, ver
   secret `OCI_SSH_HOST` ou o registro do operador). Comandos básicos, executados no diretório do
   clone (`OCI_DEPLOY_PATH`, ver `docs/deploy/oracle-cloud.md` §3.3):
   ```bash
   docker compose --env-file .env.production -f docker-compose.oci.yml ps
   docker compose --env-file .env.production -f docker-compose.oci.yml logs -f app
   ```
2. **Migração roda dentro do próprio container `app`, não como passo separado**: a imagem
   (`Dockerfile`) tem `CMD ["sh", "-c", "npx prisma migrate deploy && exec npm run start"]` — se a
   migração falhar, o container `app` sai (`Exited`), não fica "rodando com erro". `docker compose
   ps` mostra o status `Exited`/`Restarting` (por causa de `restart: unless-stopped`, ele fica
   tentando de novo em loop se a causa não for corrigida) — ver seção 2 abaixo.
3. **Healthcheck do Compose só verifica `/health/live`** (processo vivo), não `/health/ready`
   (banco) — `docker compose ps` mostrando `healthy` não garante que o Postgres está acessível.
   Confirme sempre os dois: `curl -fsS http://127.0.0.1:3000/health/live` e `.../health/ready`
   (de dentro da instância; de fora, via `https://<domínio>/health/ready` atrás do Caddy).
4. **Deploy automático (`deploy-oci.yml`) só dispara depois de `ci.yml` verde em `main`** — mesmo
   gate de qualidade do Render, mas **pendente de ativação** até os 4 secrets SSH existirem no
   GitHub (ver `docs/deploy/oracle-cloud.md` §3.3). Enquanto isso, todo deploy é manual (`git pull`
   + `./scripts/deploy-oci.sh` via SSH) — um incidente causado por "deploy não aconteceu" pode ser
   simplesmente ninguém ter rodado o passo manual, não uma falha de infraestrutura.
5. **Sem observabilidade centralizada (Prometheus/Grafana/Loki) para esta instância hoje** —
   decisão de escopo registrada em `docker-compose.oci.yml` (cabeçalho) e
   `docs/deploy/oracle-cloud.md` §11, não uma lacuna esquecida. Um incidente real na Oracle,
   diferente do Render (que tem `InstanceDown`/`AIBudgetOverrun`/etc. via Prometheus local
   apontando para a instância — quando alguém configurar isso), hoje só é descoberto por relato de
   usuário ou por quem verificar `/health/*` manualmente. Ver seção 8 (lacunas conhecidas).
6. **Rollback**: ver seção 6, "Rollback via Oracle Cloud (Docker Compose)".
7. **Fila/worker**: mesmo desenho do Render (`ENABLE_QUEUES`), mas aqui `worker`+`redis` já existem
   como serviços reais no `docker-compose.oci.yml` (profile `queues`, opt-in) — não é um serviço
   "declarado mas nunca criado" como o `prospector-atlas-worker` do Render (ver seção 3 e 7). Se
   `ENABLE_QUEUES=true` estiver ativo, confirme que o Render **não** está processando as mesmas
   filas ao mesmo tempo (duplicaria jobs) — ver aviso no cabeçalho de `docker-compose.oci.yml`.

## Correlação de logs

Toda request HTTP carrega `x-request-id` e `x-correlation-id` (gerados ou propagados por
`src/shared/middlewares/observability.ts`) e aparecem estruturados no log Pino
(`requestId`, `correlationId`, `traceId`, `spanId`, `userId`, `tenantId`). Ao investigar qualquer
incidente abaixo, comece pedindo ao usuário afetado (ou pegando do header de resposta) o
`x-request-id`/`x-correlation-id` e filtre os logs agregados por ele — muito mais rápido que
procurar por timestamp aproximado. Se o stack Loki local estiver rodando (`npm run infra:up`),
use o mesmo campo como filtro LogQL: `{job="central-comercial"} | json | correlationId="<id>"`.
Na instância Oracle (produção real), não há Loki centralizando logs hoje (ver §11 de
`docs/deploy/oracle-cloud.md`) — filtre com `grep`/`jq` sobre a saída de `docker compose -f
docker-compose.oci.yml logs app`, que já é JSON estruturado (Pino) e carrega os mesmos campos.

## 1. Aplicação indisponível (5xx generalizado / instância não responde)

**Sintoma**: `InstanceDown` (Prometheus, só aplicável onde o Prometheus já está de fato scrapeando
a instância — hoje isso é só o stack local, não a instância Oracle nem o Render, ver seção 8) ou
relato de erro 5xx generalizado.

1. Checar health real, não só "site no ar": `GET /health/live` (processo vivo) e
   `GET /health/ready` (confirma `SELECT 1` no Postgres — se `/health/ready` falha com
   `Database unavailable`, o problema é o banco, não a aplicação).
2. **Oracle Cloud** (alvo definitivo, ver seção 0-OCI): via SSH,
   `docker compose --env-file .env.production -f docker-compose.oci.yml ps` — confirme os status
   dos containers `birthhub_app`, `birthhub_postgres`, `birthhub_caddy`. Se `birthhub_app` está
   `Restarting`/`Exited`, é quase sempre falha de migração (seção 2) ou env var ausente/inválida
   em `.env.production`. `docker compose ... logs --tail 200 app` mostra a causa. Se `caddy` está
   com problema mas `app` está saudável, o sintoma é TLS/roteamento, não a aplicação — checar
   `docker compose ... logs caddy` (renovação ACME falhando é a causa mais comum).
3. **Render**: dashboard → serviço `prospector-atlas` (`srv-d9qtn8bm8hqs7395qtpg`, confirmado
   nesta rodada) → aba Logs/Events. Verificar se o deploy mais recente falhou no `startCommand`
   (`npx prisma migrate deploy && npm run start` — ver seção 2 abaixo se for isso; corrigido nesta
   rodada: a referência anterior apontava para "seção 3", que é "Fila travada", não "Falha de
   migração") ou se é o banco Supabase que está fora.
4. **k8s/Helm** (se ativado): `kubectl get pods -n <namespace>`, `kubectl describe pod <pod>`,
   `kubectl logs <pod> --previous` (se reiniciou). Ver `argocd app get prospector-atlas-<env>`
   para status de sync/health do ArgoCD.
5. Se o Postgres está fora — Supabase (Render) é incidente do provedor, não corrigível por
   redeploy/restart (verificar status page do Supabase); `birthhub_postgres` (Oracle) é o
   container local da própria instância, então `docker compose ... logs postgres` + `docker
   compose ... ps` (checar `healthy`/`unhealthy`) já diagnosticam a causa diretamente, sem
   depender de terceiro.

## 2. Falha de migração (deploy travado)

**Sintoma**: deploy não conclui; `MigrationJobFailed` (só aplicável ao caminho k8s aspiracional,
requer kube-state-metrics — ver `alert.rules.yml`); no Render (caminho real, ver seção 0.2),
`startCommand` falha antes de `npm run start` rodar; na Oracle, o container `app` sai (`Exited`)
antes de `npm run start` rodar (ver seção 0-OCI item 2).

1. **Oracle Cloud**: `docker compose --env-file .env.production -f docker-compose.oci.yml logs
   app` — a saída de `npx prisma migrate deploy` aparece antes de qualquer log da aplicação, igual
   ao Render. Diferença importante: como a migração roda dentro do `CMD` da própria imagem (não um
   passo de deploy separado como o `startCommand` do Render), **não há "instância anterior"
   continuando a servir tráfego** — se o container `app` cai e `restart: unless-stopped` fica
   tentando de novo em loop contra a mesma migração quebrada, a aplicação fica fora do ar até
   alguém corrigir a causa raiz e rodar `docker compose ... up -d --no-deps app` de novo. Isso é
   uma diferença real de garantia entre os dois caminhos, não só de comando — documentar para quem
   for decidir se vale a pena reproduzir o padrão `preDeployCommand`/instância separada do Render
   aqui também.
2. **Render**: aba Logs do deploy que falhou — a saída de `npx prisma migrate deploy` aparece
   ali antes de qualquer log da aplicação. A instância anterior continua servindo tráfego
   (`healthCheckPath` nunca passa para a nova instância) — não há downtime, mas o deploy fica
   bloqueado até corrigir.
3. **k8s/Helm**: `kubectl get jobs -l app.kubernetes.io/component=migration`,
   `kubectl logs job/<nome>-migrate-<revisão>`. O hook `pre-install,pre-upgrade`
   (`charts/prospector-atlas/templates/migration-job.yaml`) aborta o `helm upgrade`/sync do
   ArgoCD — o Deployment/Rollout novo nunca chega a ser aplicado, então não há tráfego servido
   contra schema quebrado.
4. Causa raiz comum: migration com SQL inválido para os dados existentes, ou lock de tabela
   grande demais para o `activeDeadlineSeconds`/timeout do pooler. Ver
   `.claude/skills/database-integrity/SKILL.md` para diagnóstico de migration insegura — domínio
   do Agente 01, abrir handoff se a causa raiz for uma migration específica.
5. **Nunca** rode `prisma db push` em produção como "solução rápida" — mascarra o histórico de
   migrations e diverge do schema real (ver `/AGENTS.md` bloqueador #5).

## 3. Fila travada (BullMQ)

**Sintoma**: `QueueBacklogHigh`/`QueueStalled` — métrica real desde a Onda 5-7
(`src/lib/queue/metrics.ts`, ver `alert.rules.yml` → grupo `prospector-atlas.filas.ativos-hoje`),
só ausente de `/metrics` se `ENABLE_QUEUES=false` (padrão hoje no serviço web do Render) — ou
relato de leads não enriquecidos/mensagens não enviadas.

1. Painel de filas: `GET /admin/queues` (autenticado) — mostra jobs waiting/active/failed/delayed
   por fila (enriquecimento, sync Bitrix, agente IA, WhatsApp, relatórios — ver
   `src/lib/queue/**`).
2. Filas exigem `ENABLE_QUEUES=true` + `REDIS_URL` configurado — se essas envs estiverem ausentes
   (comportamento padrão hoje no Render, ver `render.yaml`), a fila está **desligada por
   design**, não travada. Confirme isso antes de tratar como incidente.
3. **Quem processa a fila hoje (Render real)**: o serviço `prospector-atlas-worker` (`type:
   worker` em `render.yaml`, preparado pelo Agente 16/08 na Onda 6) **ainda não foi criado de
   verdade no Render** — confirmado nesta rodada consultando o workspace real via API: só existe
   o serviço web `prospector-atlas`. Se `ENABLE_QUEUES=true` for ligado sem o worker dedicado
   ativo, é o próprio `server.ts` quem processa os jobs (workers ainda não foram removidos de lá —
   ver `.agents/handoffs/onda-6/16-para-00-remover-workers-de-server-ts.md`, `status:
   em-andamento`, corte proposital ainda não aplicado). Não assuma que o worker dedicado está
   rodando só porque `render.yaml` o declara.
3b. **Quem processa a fila na Oracle**: diferente do Render, o serviço `worker`
   (`docker-compose.oci.yml`, profile `queues`) **existe de verdade** como container próprio
   (`birthhub_worker`) quando o profile está ativo — `docker compose --env-file .env.production -f
   docker-compose.oci.yml --profile queues ps` mostra se ele está de pé. Se `ENABLE_QUEUES=true`
   mas o profile `queues` não foi usado no `up`, o worker dedicado simplesmente não existe (mesmo
   sintoma do Render — quem processa é o `app`, se `server.ts` ainda não teve os workers
   removidos). Confirme sempre qual dos dois (Render ou Oracle) tem `ENABLE_QUEUES=true` ativo —
   **nunca os dois ao mesmo tempo** (ver aviso no cabeçalho de `docker-compose.oci.yml`: consumers
   duplicados reprocessam jobs).
4. Se Redis está acessível mas jobs não avançam: checar logs do processo que está de fato
   processando (server.ts hoje, ou o worker dedicado quando for ativado) por exceção repetida no
   mesmo job (job "poison pill" sendo re-tentado infinitamente). No caminho k8s aspiracional,
   `charts/prospector-atlas/templates/worker-deployment.yaml` cobre o mesmo cenário.
5. Autoscaling do worker por profundidade de fila não existe no Render (plano `free`/`starter` não
   tem esse mecanismo) nem está ligado no caminho k8s (`worker.autoscaling.enabled: false` por
   padrão em `charts/prospector-atlas/values.yaml`) — hoje, fila crescendo mais rápido que a
   capacidade de processamento exige intervenção manual (mais réplicas manualmente, ou investigar
   por que o processamento está lento).

## 4. Sincronização Bitrix falhando (silenciosamente ou não)

**Sintoma**: leads/negócios não aparecem no Bitrix ou ficam desatualizados; `BitrixSyncFailuresHigh`
— métrica real desde a Onda 5 (`bitrix_sync_failures_total`, ver `alert.rules.yml` → grupo
`prospector-atlas.bitrix.ativos-hoje`), disparando de fato quando `EXPOSE_METRICS=true`.

1. Bloqueador prioritário de `/AGENTS.md`: "Sincronizações Bitrix que podem falhar
   silenciosamente" — trate como candidato a bloqueador de release, não como ruído.
2. Ver `BITRIX24-LEAD-FLOW-AUDIT.md` (auditoria já existente no repositório) antes de investigar
   do zero.
3. Verificar `src/lib/queue/bitrixSync.worker.ts` nos logs por status de job falho e a rota de
   webhook de entrada (`/api/integrations/bitrix`, autenticada por `auth.application_token` por
   conexão, não HMAC) por 401/403 repetidos — token de conexão pode ter expirado/sido revogado
   no lado do Bitrix.
4. Domínio de correção é do Agente 06 — se a causa raiz for lógica de sync (não infraestrutura),
   abrir handoff em vez de tentar corrigir fora do escopo deste agente.

## 5. Hub de IA inacessível / orçamento de IA estourado

**Sintoma**: bloqueador prioritário de `/AGENTS.md` ("Ferramentas do Hub de IA inacessíveis");
`AIBudgetOverrun` — métrica real desde a Onda 5-7 (`ai_usage_cost_usd_total`/
`ai_usage_budget_usd_total`, `src/lib/ai/metrics.ts`, ver `alert.rules.yml` → grupo
`prospector-atlas.orcamento-ia.ativos-hoje`), **mas só dispara se `AI_MONTHLY_BUDGET_USD` estiver
configurada no ambiente**. `AI_MONTHLY_BUDGET_USD` **não está declarada em `render.yaml`**
(confirmado nesta rodada — a variável não aparece na lista de `envVars` do blueprint) — como o
Render MCP não expõe os valores/nomes de env vars efetivamente configuradas no serviço (só o
dashboard mostra isso), não dá para confirmar 100% se alguém já a adicionou manualmente fora do
blueprint. **Lacuna que precisa de confirmação humana com acesso ao dashboard Render**: verificar
em Environment se `AI_MONTHLY_BUDGET_USD` está definida; se não estiver, este alerta fica
`unknown` permanentemente em produção. Sem orçamento configurado, o custo de IA continua sendo
registrado (`ai_usage_cost_usd_total` e a tabela `AILog`), só não há um limiar automático para
alertar sobre estouro. Na Oracle, o mesmo vale para `.env.production` na instância — `scripts/
deploy-oci.sh` não gera `AI_MONTHLY_BUDGET_USD` automaticamente (só os segredos essenciais listados
em `docs/deploy/oracle-cloud.md` §3.2); confirme com `grep ^AI_MONTHLY_BUDGET_USD= .env.production`
na instância (reporta só se está presente, nunca o valor em chat/log, ver §10 do mesmo guia).

1. Verificar `verify:ai` (`npm run verify:ai`, script `scripts/verify-ai-studio.ts`) — cobre
   conectividade dos provedores de IA configurados.
2. Checar quais chaves de provedor estão presentes no ambiente real (`GROQ_API_KEY`,
   `GEMINI_API_KEY` no Render, ou nas variáveis correspondentes de `.env.production` na instância
   Oracle) vs. as que o código tenta em ordem de fallback (`src/lib/ai/gateway.ts`) —
   "inacessível" às vezes é só "chave ausente", não uma falha de infraestrutura.
3. Se `AI_MONTHLY_BUDGET_USD` estiver configurada e `AIBudgetOverrun` disparar: orçamento de IA é
   lógica do Agente 07 (não há enforcement que bloqueie chamadas automaticamente — a métrica só
   alerta, não corta). Se uma ferramenta do Hub de IA está bloqueada, a correção de lógica é do
   Agente 07; este runbook cobre só o "o que checar primeiro" antes de escalar.

## 6. Rollback

### Rollback via Oracle Cloud (Docker Compose, alvo definitivo de produção)

Sem mecanismo de rollback automatizado ou versionado hoje (nenhum equivalente ao histórico de
deploys do Render) — é uma sequência manual via SSH na instância:

- **Reverter o código**: `git fetch origin && git checkout <commit-anterior-conhecido-bom>` (ou
  `git reset --hard <sha>` se já estiver em `main` e não houver trabalho local a preservar — a
  instância é um deploy, não um ambiente de desenvolvimento) seguido de
  `docker compose --env-file .env.production -f docker-compose.oci.yml up -d --build app`
  (rebuild só do serviço `app`; `postgres`/`caddy` não precisam de rebuild para um rollback de
  código de aplicação).
- **Migração roda de novo no boot do container revertido** (mesmo `CMD` do Dockerfile,
  seção 0-OCI item 2) — se a versão revertida espera um schema mais antigo e a migration mais
  recente já rodou e é destrutiva, o rollback de código não desfaz o schema. Mesma ressalva de
  sempre: avaliar com o Agente 01 se é necessária uma migration de compensação antes de reverter.
- **`.env.production` não é versionado por deploy** (mesma ressalva do Render abaixo) — reverter o
  código não reverte env vars alteradas manualmente na instância.
- **Sem downtime automático conhecido durante o rollback**: diferente do Render (health check
  antes de rotear tráfego para a instância nova), aqui `docker compose up -d --build app` substitui
  o container em execução diretamente — há uma janela real de indisponibilidade entre o container
  antigo parar e o novo (rebuildado, migrado) ficar pronto, maior que a do Render por não ter uma
  instância "nova" paralela à "antiga". Ainda não medido/documentado como SLA — considerar isso ao
  decidir a hora de um rollback não-emergencial.
- **`deploy-oci.yml` (GitHub Actions), quando os secrets estiverem ativados, também não serve para
  rollback a um commit específico** — dispara `git fetch`/`reset --hard origin/main` (sempre o HEAD
  de `main`), mesma limitação do `trigger_deploy` do Render descrita abaixo. Reverter para um
  commit anterior específico continua sendo a sequência manual acima, ou revertendo o commit em
  `main` via PR e deixando o pipeline normal reimplantar o novo HEAD.

### Rollback via Render (caminho real de produção)

Verificado nesta rodada contra o serviço real (`prospector-atlas`, `srv-d9qtn8bm8hqs7395qtpg`) via
MCP Render — não é suposição:

- Cada deploy tem um `status` (`live`, `deactivated`, `build_failed`, `update_failed`, etc.) e o
  histórico completo continua disponível depois que um deploy novo assume — o deploy anterior
  passa de `live` para `deactivated`, não é apagado. Confirmado consultando os últimos 10 deploys
  reais do serviço nesta rodada (todos os `deactivated` anteriores continuam listados com seu
  commit exato).
- **Mecanismo de rollback**: dashboard Render → serviço → aba **Deploys** → menu de contexto de
  um deploy anterior com status `live`/`deactivated` bem-sucedido → **"Rollback to this deploy"**.
  Isso reconstrói/reimplanta o commit exato daquele deploy (documentado publicamente pela Render
  em render.com/docs/deploys). Este runbook não executou esse botão nesta rodada (ação real de
  produção, fora do escopo de uma tarefa de documentação/observabilidade e não autorizada sem
  pedido explícito) — **o mecanismo em si está confirmado pela própria estrutura de dados de
  deploy do Render (histórico completo, com status, preservado)**, mas o texto exato do menu/fluxo
  de clique não foi verificado ao vivo nesta sessão. Se o texto do botão mudou na UI do Render,
  quem for executar o rollback real deve confirmar visualmente antes de agir sob pressão de
  incidente.
- **Sem mecanismo scriptável/API neste toolset para rollback a um commit específico**: a
  ferramenta de deploy do MCP Render (`trigger_deploy`) só redeploya o HEAD atual da branch
  configurada — não aceita um commit/deploy ID alvo. Rollback para uma versão anterior específica
  é, hoje, uma ação manual no dashboard, não scriptável a partir daqui. Se isso for um problema
  operacional (ex.: querer rollback automatizado por CI), é uma decisão de produto/infra futura,
  não implementada nesta rodada.
- **Env vars não são versionadas por deploy**: rollback de código no Render reimplanta o commit
  antigo com as env vars **atuais** do serviço (Environment), não as que estavam ativas no momento
  daquele deploy antigo. Se o incidente foi causado por uma env var nova mal configurada (não pelo
  código), rollback de deploy não resolve — corrija a env var diretamente.
- **Migração não é desfeita pelo rollback**: `startCommand: npx prisma migrate deploy && npm run
  start` roda a cada deploy, incluindo um rollback (que é, mecanicamente, um novo deploy do commit
  antigo). Se a migration mais recente já rodou e é destrutiva (coluna removida, tipo alterado),
  reverter só o código não desfaz o schema — o código antigo pode nem funcionar contra o schema
  novo. Avaliar com o Agente 01 se é necessária uma migration de compensação antes do rollback.
  Nunca assumir que "reverter o deploy" também reverte o banco — mesma ressalva que já valia para
  o caminho k8s abaixo.
- **Sem downtime automático conhecido durante o rollback**: mesmo mecanismo de health check da
  seção 0.2 se aplica — a instância antiga (que está falhando) só é substituída pela instância do
  commit revertido depois que ela passar em `/health/ready`.

### Caminho k8s/Helm/ArgoCD (aspiracional — só aplicável se um cluster real existir)

Aplicável apenas ao caminho k8s/Helm/ArgoCD, que **não é o deploy ativo hoje** (ver topo deste
documento). Mantido aqui como referência caso o projeto migre para esse caminho no futuro.

### Rollback via Helm (chart aplicado diretamente, sem ArgoCD gerenciando)

```bash
helm history prospector-atlas -n <namespace>          # lista revisões
helm rollback prospector-atlas <revisão-anterior> -n <namespace>
```

`helm rollback` reaplica os manifests da revisão anterior, incluindo a tag de imagem anterior em
`image.tag` — **não** re-executa o hook `pre-upgrade` de migração (Helm não roda hooks de
rollback por padrão). Se a revisão que está sendo revertida introduziu uma migration destrutiva
(coluna removida, tipo alterado), reverter o Deployment/Rollout sozinho não desfaz o schema —
avaliar com o Agente 01 se é necessária uma migration de compensação antes ou depois do rollback
de código. Nunca assumir que "reverter o deploy" também reverte o banco.

### Rollback via ArgoCD (caminho documentado como ativo em `argocd/README.md`, quando houver
cluster real)

```bash
argocd app history prospector-atlas-production
argocd app rollback prospector-atlas-production <ID-da-revisão>
```

Mesma ressalva do Helm acima quanto a migrations — `argocd app rollback` reverte o `sync` para um
`targetRevision` anterior do Git, não desfaz mudanças de schema já aplicadas.

### Rollback do Rollout (Argo Rollouts, blue-green)

Com `blueGreen.enabled: true` (default em `values.yaml`), o recurso é um `Rollout`, não um
`Deployment` simples. Se a promoção automática (`autoPromotionSeconds: 30`) ainda não ocorreu:

```bash
kubectl argo rollouts abort <nome-do-rollout> -n <namespace>   # cancela a promoção da versão "green"
kubectl argo rollouts undo <nome-do-rollout> -n <namespace>    # volta pra última versão estável
```

Isso é mais rápido que `helm rollback`/`argocd app rollback` quando a versão nova ainda está na
janela de preview (antes da promoção automática) — a versão "blue" (estável) nunca parou de
servir tráfego de produção durante esse período.

## 7. Worker dedicado (`worker.ts`) — observabilidade preparada, ainda não aplicável (Render)

**Esta seção é específica do Render** — no caminho Oracle Cloud o worker dedicado já existe como
serviço real opt-in (`docker-compose.oci.yml`, profile `queues`, ver seção 0-OCI item 7 e seção 3
item "3b"), não é uma pendência de criação. O que segue documenta só o estado (ainda pendente) do
Render.

Resposta ao handoff `.agents/handoffs/onda-6/16-para-10-observabilidade-worker.md` (Agente 16,
Onda 6, `status: aberto`).

**Status real confirmado nesta rodada**: o serviço `prospector-atlas-worker` declarado em
`render.yaml` (`type: worker`, `startCommand: npx prisma migrate deploy && npm run start:worker`)
**não existe no Render de verdade** — consultado o workspace real via API, só o serviço web
`prospector-atlas` está provisionado. Isso está alinhado com o próprio handoff de deploy
(`.agents/handoffs/onda-6/16-para-08-deploy-worker-service.md`, `status: em-andamento`
deliberadamente): falta (a) aplicar o corte de `server.ts` que hoje ainda processa as filas
(`16-para-00-remover-workers-de-server-ts.md`) e (b) autorização de gasto do usuário, já que
serviços `type: worker` do Render não têm plano `free`.

Enquanto isso não acontecer, monitorar `worker.ts` como processo separado **não é aplicável** —
não há processo separado rodando em produção. O runbook desta seção documenta o contrato para
quando ele for ativado, não um estado atual:

1. **Readiness como sinal de alerta**: `GET /health/ready` na porta `WORKER_HEALTH_PORT` (`3006`
   por padrão) retorna 503 com `{ status: "degraded", errors: [...] }` quando `queuesEnabled` é
   falso ou quando `sdr-cold-call`/`swarm-scheduler` falharam ao iniciar. Sugestão de alerta (não
   criada em `alert.rules.yml` ainda — sem endpoint HTTP real para o Prometheus fazer probe até o
   serviço existir): `probe_success{instance="<worker>:3006/health/ready"} == 0` via
   `blackbox_exporter` (não incluído no stack local hoje, seria dependência nova) ou, se o
   ambiente de destino oferecer HTTP health check nativo (Render supõe isso via
   `healthCheckPath`, mas services `type: worker` do Render não expõem porta pública/health check
   HTTP gerenciado pela plataforma — confirmar isso é uma lacuna, ver seção 8), via readiness probe
   do orquestrador equivalente.
2. **Métricas `bullmq_queue_*`**: já cobertas pelo grupo `prospector-atlas.filas.ativos-hoje` em
   `alert.rules.yml` — continuam corretas independente de rodar em `server.ts` ou `worker.ts`
   (mesmo módulo `src/lib/queue/metrics.ts`), desde que o processo que efetivamente roda os
   workers exponha `/metrics` com `EXPOSE_METRICS=true`.
3. **Contagem de workers ativos / shutdown por timeout**: `worker.ts` já loga
   `activeWorkers`/`totalRegistered` na inicialização e `worker.ts: shutdown excedeu o timeout —
   forçando saída` como `error` quando `SIGTERM` não drena a tempo (25s). Sem um coletor de logs
   estruturado versionado neste repositório com alerta por padrão de mensagem (Loki/Grafana Loki
   local existe via `infrastructure/observability/loki.yml`, mas sem regra de alerta baseada em
   `LogQL` neste arquivo — Prometheus só lê métricas, não logs), este item fica como
   **recomendação para quando o worker for ativado**, não uma regra pronta.

**Resolução parcial deste handoff**: mecanismo de alerta decidido (Prometheus, consistente com o
resto do projeto) e contrato de porta/endpoint documentado; regra concreta em `alert.rules.yml`
**não adicionada** porque apontar para um endpoint que não existe em produção seria o mesmo erro
que a Onda 4 evitou para as outras métricas (regra "pronta" mas enganosa). Deixado como
`em-andamento` no handoff original — quem ativar o worker de verdade (Agente 08, junto com o corte
de `server.ts`) deve avisar o Agente 10 (ou adicionar a regra diretamente, seguindo o padrão dos
grupos `ativos-hoje` deste arquivo) para promover isso a uma regra real.

## 8. Lacunas conhecidas (Onda 8 — não inventadas, documentadas para decisão; atualizado em ACH-10-01 com o gap real da Oracle Cloud)

| Lacuna | Detalhe | Quem decide/resolve |
| --- | --- | --- |
| **Produção Oracle Cloud sem observabilidade centralizada** | Alvo definitivo de produção (ADR-004) já recebendo tráfego real, mas `docker-compose.oci.yml` não sobe Prometheus/Grafana/Loki e nenhum Prometheus externo está scrapeando a instância — decisão de escopo MVP registrada em `docs/deploy/oracle-cloud.md` §11 (não uma lacuna esquecida: a barreira técnica real é que `/metrics` exige o header `x-platform-operator-token` da própria aplicação — `requirePlatformOperator` — que o `scrape_config` nativo do Prometheus não consegue enviar sem mudança de código fora do escopo desta correção). Até isso ser resolvido, um incidente real na Oracle só é descoberto por relato de usuário ou checagem manual de `/health/*` — ver seção 0-OCI item 5. | Agente 10 (mecanismo de auth compatível com scrape) + Agente 01/08 (se a solução exigir mudar `requirePlatformOperator` ou adicionar um exportador dedicado) |
| Sem dashboard Grafana versionado | `infrastructure/observability/` tem datasources (`grafana-datasources.yml`) mas nenhum `dashboards/*.json` — Grafana sobe "em branco", só com os datasources provisionados. Não criado nesta rodada por falta de tempo dentro do escopo de go-live (priorizado runbook/alertas executáveis) — fica como próximo passo, não crítico para o go-live em si (Prometheus `/alerts` e consultas ad-hoc já cobrem o mínimo). | Agente 10, próxima rodada |
| `AI_MONTHLY_BUDGET_USD` possivelmente não configurada em produção | Não está em `render.yaml`; não é possível confirmar via API/MCP se foi setada manualmente no dashboard. Na Oracle, `scripts/deploy-oci.sh` também não a gera automaticamente — mesmo gap, ver seção 5. Sem ela, `AIBudgetOverrun` fica `unknown` permanentemente em ambos os caminhos. | Confirmação humana (dashboard Render / SSH na instância Oracle) + decisão de negócio do valor do orçamento |
| Métrica HTTP por status code (`HighErrorRate5xx`) | Auto-instrumentação OTel emite métricas de runtime/GC mas não a métrica HTTP com a versão instalada de `instrumentation-http`. Ver `alert.rules.yml` para o diagnóstico completo. | Agente 01 (dono de `src/lib/tracing.ts`) |
| `MigrationJobFailed` (grupo k8s) não tem contraparte real no Render | Não é uma lacuna a fechar — é a confirmação de que o caminho k8s é aspiracional. A garantia equivalente no Render já existe via `startCommand`+`healthCheckPath` (seção 0.2); na Oracle, via o `CMD` da imagem (seção 0-OCI item 2). Nenhuma ação necessária a menos que o projeto migre para k8s de verdade. | N/A |
| Quem aciona rollback e por qual canal | Ver seção 0.4 — decisão organizacional, não técnica. Vale para os dois caminhos com tráfego real (Render e Oracle). | Usuário/gestão |
| Worker dedicado sem observabilidade aplicável (Render) | Ver seção 7 — não há processo separado rodando ainda no Render. Não se aplica à Oracle, onde o worker (profile `queues`) já existe como serviço real. | Agente 08 (ativação) + Agente 10 (regra de alerta quando ativar) |
| `http_request_count` nativo do Render vazio para `prospector-atlas` | Confirmado via `get_metrics` do MCP Render nesta rodada — pode ser limitação do plano `free`, falta de tráfego capturado no intervalo consultado, ou outra causa não identificada. Não impede os `/health/*` nem os logs de servirem como fonte de verdade, mas reduz a confiança em métricas nativas do Render para SLO de erro 5xx (reforça a importância de resolver a lacuna de `HighErrorRate5xx` acima). | Confirmação humana (dashboard Render, plano pago) se for crítico |
| Sem Alertmanager configurado | Já documentado no cabeçalho de `alert.rules.yml` desde a Onda 4 — alertas ficam visíveis em `/alerts` do Prometheus mas não notificam ninguém (Slack/e-mail/PagerDuty) até um receptor ser configurado. Continua verdade nesta rodada, e continuaria mesmo se a lacuna de observabilidade da Oracle acima fosse fechada. | Decisão de produto/operação (qual canal usar) |

## 9. Verificação pós-incidente

Depois de qualquer ação acima: confirmar `GET /health/ready` voltou a `200`, confirmar no painel
`/admin/queues` (se aplicável) que a fila voltou a processar, e registrar causa raiz + ação
tomada — este runbook não substitui um post-mortem quando o incidente afetou produção real.
