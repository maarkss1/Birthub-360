# Ativação do worker dedicado (`prospector-atlas-worker`) no Render

> [!WARNING]
> **DOCUMENTO ARQUIVADO / WORKER RENDER DESATIVADO (2026-09-20):**
> Por decisão de produto, o Render e demais provedores cloud foram desativados por enquanto.
> O processamento de workers e background jobs no modo **100% Local-First** opera localmente via `npm run dev:worker` / `npm run start:worker`.
> Este arquivo permanece arquivado como referência histórica.


## O que já está pronto (não precisa refazer)

- **Entrypoint**: `worker.ts` (raiz) — sobe só os workers BullMQ + agendadores + cron
  `cold-leads-scanner`, sem Express/SPA/SSE. Já teve o healthcheck, graceful shutdown e trava de
  concorrência do cron implementados e testados localmente (Onda 6, Agente 16).
- **Scripts npm**: `package.json` já tem `build:worker` (esbuild → `dist/worker.cjs`),
  `start:worker` (`node dist/worker.cjs`) e `dev:worker` (`tsx watch`), no mesmo padrão de
  `server.ts`/`dist/server.cjs`. Confirmado nesta rodada: `npm run build:worker` gera
  `dist/worker.cjs` sem erro; `npx tsc --noEmit` e `npx biome lint src` passam limpos com o
  worker no escopo do build (`lint:architecture` já inclui `worker.ts` como entrypoint).
- **Blueprint**: `render.yaml` já tem o serviço `prospector-atlas-worker` (`type: worker`,
  `buildCommand: npm ci --include=dev && npm run build:worker`, `startCommand: npx prisma migrate
  deploy && npm run start:worker`) com as env vars incondicionais já declaradas (`DATABASE_URL`,
  `DIRECT_URL`, `ENABLE_QUEUES=true`, `REDIS_URL`, `ENABLE_SEARCH=false`,
  `SDR_COLD_CALL_ENABLED`/`SDR_COLD_CALL_ORGANIZATIONS`,
  `SWARM_SCHEDULER_ENABLED`/`SWARM_SCHEDULER_ORGANIZATIONS`, `WORKER_HEALTH_PORT=3006`).
- **Observabilidade documentada (não ativa)**: `infrastructure/observability/RUNBOOK.md` seção 7
  já descreve o contrato de monitoramento (`GET /health/ready` na porta `WORKER_HEALTH_PORT`,
  métricas `bullmq_queue_*` já existentes independente de onde o worker roda, log pattern de
  shutdown por timeout). Nenhuma regra em `infrastructure/observability/alert.rules.yml` aponta
  para esse endpoint ainda — de propósito, para não gerar uma regra `unknown` permanente contra um
  serviço que não existe.

## Validação local feita nesta rodada (sem infraestrutura externa real)

- `npx tsc --noEmit`: passou sem erros.
- `npx biome lint src`: passou sem erros (1163 arquivos verificados).
- `npm run build:worker`: gerou `dist/worker.cjs` (855kb) + sourcemap sem erro.
- `node dist/worker.cjs` executado localmente duas vezes, sem Postgres/Redis reais disponíveis:
  - Com `ENABLE_QUEUES=false`: falhou de forma esperada e explícita —
    `Error: Worker dedicado requer ENABLE_QUEUES=true e REDIS_URL configurada.` (guarda de
    inicialização funcionando corretamente, não um bug).
  - Com `ENABLE_QUEUES=true` e uma `REDIS_URL` que não aponta para um Redis real: falhou ao tentar
    conectar (`Stream isn't writeable and enableOfflineQueue options is false`) — falha de rede
    esperada contra um Redis inexistente, não um erro de código. Isso confirma que o bootstrap do
    processo (env, tracing, guards, registro das ~25 filas) executa sem exceção até o ponto em que
    depende de infraestrutura externa real.
  - Não foi possível validar o teste completo do handoff original (subir contra Redis/Postgres
    reais e confirmar `/health/ready` com todas as filas ativas, matar com `SIGTERM` em job em
    andamento) porque este ambiente não tem Redis/Postgres provisionados — o Agente 16 já havia
    feito esse teste completo contra o Docker Compose local na Onda 6 (ver relatório de entrega
    daquela onda).

## Pré-requisitos antes de criar o serviço de verdade (bloqueadores reais, não deste agente)

1. **Aplicar `.agents/handoffs/onda-6/16-para-00-remover-workers-de-server-ts.md`.** Hoje
   `server.ts` (o serviço web `prospector-atlas`) ainda processa as mesmas filas BullMQ. Ativar o
   worker dedicado *antes* desse corte faz os dois processos competirem pelos mesmos jobs
   (processamento duplicado) — verifique o status desse handoff primeiro.
2. **Autorizar o custo.** Serviços `type: worker` do Render **não têm plano free** — só o serviço
   web atual está em `plan: free`/`starter`. Confirme com quem paga a conta antes de criar.
3. **Decisão de produto sobre o caminho de deploy.** Ver `docs/deploy/README.md`: o destino de
   produção definitivo hoje é Oracle Cloud (ADR-004-Producao-Oracle-Cloud.md), não Render. Ativar
   este worker só faz sentido se (a) o caminho Render ainda estiver servindo tráfego real como
   fallback, ou (b) uma decisão explícita reabrir investimento nele.

## Passo a passo para ativar o serviço no Render (quando os 3 pré-requisitos acima estiverem OK)

1. **Sync do Blueprint**: no dashboard do Render, abra o Blueprint conectado a este repositório e
   force um novo sync (ou reimporte `render.yaml`) para que o serviço `prospector-atlas-worker`
   apareça na lista de serviços do workspace. Ele nasce com `autoDeployTrigger: off`, então não
   dispara deploy sozinho — isso é intencional até o passo 5.
2. **Preencher as env vars com `sync: false`** no serviço `prospector-atlas-worker` →
   **Environment**:
   - `DATABASE_URL` e `DIRECT_URL`: mesmo banco Postgres do serviço web (não crie um banco novo).
     `DIRECT_URL` é obrigatória aqui porque o `startCommand` roda `prisma migrate deploy`
     diretamente (sem `preDeployCommand`), e só a role com DDL (`prospector_app`) consegue migrar.
   - `REDIS_URL`: mesma instância Redis usada por `ENABLE_QUEUES` no serviço web (Render Key Value
     ou Upstash) — **obrigatória de verdade** aqui, diferente do serviço web, porque
     `ENABLE_QUEUES=true` já vem fixo no blueprint para este serviço.
   - `SDR_COLD_CALL_ORGANIZATIONS` e `SWARM_SCHEDULER_ORGANIZATIONS`: deixe vazio enquanto as
     flags `SDR_COLD_CALL_ENABLED`/`SWARM_SCHEDULER_ENABLED` continuarem `false` (valor fixo hoje
     no blueprint). Se decidir ligar alguma dessas duas flags, mude o valor da flag em
     `render.yaml` (não só a env var) e preencha a lista de organizações.
3. **Credenciais de provedor condicionais** (não incluídas no blueprint de propósito — ver
   comentário em `render.yaml`): se qualquer fila que dependa delas for ativada, copie do serviço
   web `prospector-atlas` os mesmos valores de `BITRIX24_WEBHOOK_URL`,
   `BIRTH_VOICES_WEBHOOK_SECRET`, `GROQ_API_KEY` e `STORAGE_*` (usado pelo job de PDF semanal).
   Não duplique como um valor diferente — é a mesma integração, mesma credencial.
4. **Health check / readiness**: `type: worker` do Render não expõe porta pública nem
   `healthCheckPath` (isso é só para `type: web`). O processo abre `WORKER_HEALTH_PORT` (`3006`)
   internamente com `GET /health/live` e `GET /health/ready`. Para um probe de verdade, é preciso
   um mecanismo externo ao Render (ex.: expor a métrica via um serviço de observabilidade que
   tenha rede até essa instância, ou um blackbox exporter apontando para o IP interno do Render se
   o plano permitir) — o Render sozinho não reinicia o worker com base nesse endpoint. Documentar
   qual mecanismo foi escolhido de fato no momento da ativação (ver seção "Depois de ativar"
   abaixo).
5. **Grace period de shutdown**: `worker.ts` trata `SIGTERM` com timeout interno de 25s para
   drenar jobs BullMQ em andamento antes de sair. O Render não expõe uma chave de
   `render.yaml`/Blueprint para configurar o tempo de graça entre `SIGTERM` e `SIGKILL` de um
   `type: worker` (diferente de Kubernetes, que tem
   `terminationGracePeriodSeconds`) — isso não foi confirmado como configurável na documentação
   pública do Render nesta rodada. Ação recomendada: depois de ativar o serviço, testar
   manualmente um deploy/restart com um job em andamento e confirmar nos logs se o processo
   recebeu tempo suficiente para logar `worker.ts: shutdown concluído` antes de sumir dos logs. Se
   o Render matar o processo antes disso, é um gap real a escalar para o suporte do Render ou a
   aceitar como risco conhecido (job volta para a fila, não se perde — BullMQ reprocessa jobs não
   confirmados).
6. **Ativar o deploy**: só depois dos passos 1-5 confirmados, mude `autoDeployTrigger: off` para
   `commit` no bloco do worker em `render.yaml` (mesmo valor já usado pelo serviço web) e faça o
   commit/push. Isso é uma mudança de código deste repositório — pode ser feita por qualquer
   sessão com acesso ao repo, mas só depois que os passos manuais acima (env vars, decisão de
   negócio, corte de `server.ts`) estiverem confirmados por quem tem acesso ao Render.
7. **Validar o teste esperado do handoff original**: subir o worker isolado (sem `server.ts`
   processando fila ao mesmo tempo) contra o Redis/Postgres reais de produção/staging e confirmar
   via `GET /health/ready` que todas as ~25 filas do inventário (`worker.ts`) aparecem ativas.
   Depois, forçar um `SIGTERM` durante um job em andamento (ex.: reiniciar o serviço pelo
   dashboard) e confirmar que o job não se perde (volta pra fila ou completa) e que o processo sai
   dentro do timeout.

## Depois de ativar: fechar a lacuna de observabilidade

Assim que o serviço `prospector-atlas-worker` estiver rodando de verdade em produção:

1. Adicionar em `infrastructure/observability/alert.rules.yml` uma regra de probe HTTP contra
   `GET /health/ready` do worker (grupo `prospector-atlas.filas.ativos-hoje` ou um grupo novo
   `prospector-atlas.worker-dedicado.ativos-hoje`), seguindo o mesmo padrão dos grupos já
   promovidos. Um 503 sustentado (`{ status: "degraded", errors: [...] }`) é o sinal mais direto de
   worker morto em silêncio.
2. Atualizar `infrastructure/observability/RUNBOOK.md` seção 7 removendo o texto "ainda não
   aplicável" e descrevendo o mecanismo de probe real escolhido (item 4 do passo a passo acima).
3. Atualizar `.agents/handoffs/onda-6/16-para-08-deploy-worker-service.md` e
   `.agents/handoffs/onda-6/16-para-10-observabilidade-worker.md` de `em-andamento` para
   `resolvido`, com a data e quem confirmou a ativação real no Render.
