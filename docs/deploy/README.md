# Infraestrutura e deploy — índice operacional (fonte de verdade)

Este arquivo é o ponto de entrada único para "qual é o caminho de deploy certo agora". O
repositório documenta **quatro** caminhos de infraestrutura/deploy diferentes, criados em épocas
diferentes; só um está de fato ativo hoje. Antes desta consolidação (ITEM-12), cada caminho
afirmava coisas diferentes sobre qual dos outros estava "ativo em produção" — `docs/deploy/
producao.md`, `charts/README.md`, `k8s/README.md`, `argocd/README.md` e `infrastructure/
observability/RUNBOOK.md` ainda diziam "Render é o deploy ativo em produção", escrito **antes** do
commit `53c55ac` ("chore(infra): move a Central para modo local-first (#180)"), que congelou o
Render (`render.yaml` → `autoDeployTrigger: off`, comentário `LEGACY/FROZEN`) sem que essas outras
páginas fossem atualizadas. Esta página resolve essa divergência sem apagar o trabalho documentado
em cada caminho — cada um continua descrito no lugar de sempre, agora com o status real.

> **Atualização (2026-09-20, DEVOPS-010): Oracle Cloud foi retirado do repositório.** A decisão de
> 2026-09-05 registrada abaixo — tornar Oracle Cloud Infrastructure o "alvo definitivo de
> produção" — foi revertida pelo commit `783f8582` ("retire oracle cloud deployment resources",
> 2026-09-18), que deletou todo o caminho OCI: `docker-compose.oci.yml`,
> `docs/deploy/oracle-cloud.md`, `docs/ADR/ADR-004-Producao-Oracle-Cloud.md`,
> `scripts/{deploy,backup,restore}-oci.sh`, `.github/workflows/deploy-oci.yml` e
> `docs/security/runbooks/DEPLOY_ROLLBACK_OCI.md` — todos confirmados ausentes do disco hoje. Não
> foi publicado nenhum ADR de substituição. **Render (`render.yaml`, `autoDeployTrigger: commit`)
> é hoje o único caminho de deploy que de fato funciona e é o canônico de produção.** O restante
> desta página (tabelas, seção 2) ainda descreve o estado de 2026-09-05 com Oracle Cloud como alvo
> — trate qualquer linha que cite `oracle-cloud.md`/ADR-004 como histórico invalidado por este
> banner, não como caminho ativo.

## 1. Caminho canônico por ambiente (estado real na época, 2026-09-05 — ver banner acima para o que mudou em 2026-09-20)

| Ambiente                                                 | Caminho canônico hoje                                                                                                                                              | Fonte de verdade                                                                                                                         | Status                                                                                                                                                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desenvolvimento local**                                | `docker-compose.yml` (Postgres+pgvector, Redis, Meilisearch, MinIO, LiteLLM, Ollama) + `npm run dev`                                                               | [`docs/development/LOCAL_FIRST.md`](../development/LOCAL_FIRST.md)                                                                       | **Ativo**                                                                                                                                                                                                                                            |
| **Homologação**                                          | Nenhum ambiente cloud ativo. `cd-homolog.yml` existe (build de imagem Docker + Helm `values.yaml`) mas não há cluster real consumindo o resultado                  | [`k8s/README.md`](../../k8s/README.md), [`charts/README.md`](../../charts/README.md)                                                     | Pipeline existe, alvo (cluster) não existe                                                                                                                                                                                                           |
| ~~**Produção (alvo definitivo)**~~                          | ~~Oracle Cloud Infrastructure, self-hosted — `docker-compose.oci.yml` (app + postgres + caddy; Redis/worker opt-in), instância Ampere A1, região `sa-saopaulo-1`~~ | ~~`docs/deploy/oracle-cloud.md`, `docs/ADR/ADR-004-Producao-Oracle-Cloud.md`~~ (ambos deletados em 2026-09-18, ver banner acima) | **Retirado (2026-09-20)** — nunca chegou a receber tráfego real; todo o caminho OCI foi deletado do repositório pelo commit `783f8582` antes do cutover acontecer. Render é hoje o único caminho de produção — ver seção "Atualização (2026-09-20)" acima |
| **Produção (canônica, 2026-09-20)** | Render (`prospector-atlas`, `plan: starter`) + Supabase (banco real hoje) — ver nota de cutover Neon pendente                                                      | [`docs/deploy/producao.md`](producao.md)                                                                                                 | **Ativo** — único caminho de deploy funcional hoje; deixou de ser "fallback" quando o caminho Oracle foi retirado (ver banner acima)                                                                                                                  |

O critério anterior ("voltar à produção" a partir do modo local-first) já foi cumprido em
2026-09-02 — ver [`docs/development/LOCAL_FIRST.md`](../development/LOCAL_FIRST.md). O checklist de
cutover que existia em `docs/deploy/oracle-cloud.md` não se aplica mais — o arquivo foi deletado
junto com todo o caminho Oracle Cloud (ver banner "Atualização (2026-09-20)" no topo desta página).
Não há hoje nenhum cutover pendente: Render é o ambiente de produção.

## 2. Os quatro caminhos documentados — o que cada um é e seu status real

| #   | Caminho                                                    | Arquivos                                                                                                                                                                | Status                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Local-first (docker-compose)**                           | `docker-compose.yml`, `docs/development/LOCAL_FIRST.md`                                                                                                                 | **Ativo** — ambiente de desenvolvimento                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2   | ~~Self-hosted Oracle Cloud (Docker Compose + Caddy)~~      | Todos os arquivos deste caminho foram deletados (`docker-compose.oci.yml`, `docs/deploy/oracle-cloud.md`, `scripts/{deploy,backup,restore}-oci.sh`, `.github/workflows/deploy-oci.yml`) | **Retirado (2026-09-20).** Commit `783f8582` ("retire oracle cloud deployment resources", 2026-09-18) removeu todo o caminho antes de qualquer tráfego real ser migrado para ele — nunca saiu do estado "ativação pendente" descrito na versão anterior desta linha. Não é mais um caminho de deploy válido; não recriar sem uma nova decisão de infraestrutura |
| 3   | **Render + Supabase/Neon + Cloudflare** (monólito Express) | `render.yaml`, `docs/deploy/producao.md`, `docs/deploy/render.md`                                                                                                       | **Ativo — único caminho de deploy funcional hoje (2026-09-20).** Deixou de ser "fallback durante a transição para Oracle" quando o caminho 2 foi retirado do repositório antes de o cutover acontecer                                                                                                                                                                                                                                                   |
| 4   | **Kubernetes / Helm / ArgoCD**                             | `k8s/`, `charts/prospector-atlas/`, `argocd/`                                                                                                                           | Aspiracional — chart e manifests existem e são mantidos corretos (ver `charts/README.md`), mas nenhum cluster real está registrado consumindo isso. `cd-homolog.yml`/`production.yaml` publicam imagem em `ghcr.io` e atualizam `values.yaml`, sem cluster no outro lado                                                                                                                                                                           |

O caminho 2 (Oracle) foi de fato removido do repositório em 2026-09-18 (ver banner no topo desta
página) — ao contrário do que a tabela acima registrava antes (estado de 2026-09-05, preservado
aqui só como histórico), essa remoção aconteceu antes de qualquer decisão de negócio documentada
que a revertesse. O caminho 3 (Render) voltou a ser simplesmente "ativo/canônico", não mais
"fallback durante a transição" — não há mais transição em curso.

## 3. Healthcheck e readiness — já padronizado

Toda a aplicação (local, Render, k8s/Helm) usa os mesmos dois endpoints definidos uma única
vez em `server.ts` (o compose OCI que também os usava, `docker-compose.oci.yml`, foi deletado em
2026-09-18 — ver banner no topo desta página):

| Endpoint                              | Verifica                                                            | Usado por                                                                      |
| ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `GET /health/live` (alias `/healthz`) | Processo no ar                                                      | `k8s/api-deployment.yaml`, `charts/prospector-atlas` |
| `GET /health/ready` (alias `/readyz`) | Conexão real com o banco (`SELECT 1`) — não só "processo respondeu" | `render.yaml` (`healthCheckPath`), Helm probes                                 |

Não há endpoint divergente (ex.: `/api/health`) usado por nenhum manifest/compose/blueprint da
aplicação hoje — o único `/api/health` citado em `docs/deploy/producao.md` §2.2 é um exemplo do
bug **já corrigido** (rota que não existia, corrigida para `/health/ready`). O worker dedicado
(`worker.ts`) expõe os mesmos dois endpoints numa porta interna própria (`WORKER_HEALTH_PORT`,
padrão `3006`).

## 4. Secrets — já padronizado, não versionado em nenhum caminho

- Local: `.env` (`.gitignore` cobre `.env*`, exceto `.env.example`/`.env.test.example`).
- Render: variáveis `sync: false` em `render.yaml`, preenchidas manualmente no dashboard — nunca
  hardcoded no blueprint.
- OCI: caminho retirado do repositório em 2026-09-18 junto com `scripts/deploy-oci.sh` (ver banner
  no topo desta página) — não há mais um `.env.production` de OCI a gerenciar.
- Kubernetes/Helm: `values.yaml` mantém `secrets:` vazio por padrão de propósito (ver
  `charts/README.md`); segredo real só entraria via mecanismo externo (ex. Sealed Secrets/External
  Secrets), nunca versionado no chart.

Nenhuma mudança necessária aqui — auditado nesta consolidação (ITEM-12) e confirmado correto nos
quatro caminhos.

## 5. Rollback — onde está documentado cada caminho

| Caminho | Mecanismo | Documentado em |
| --- | --- | --- |
| Render | Dashboard → Deploys → "Rollback to this deploy"; sem API scriptável para commit específico; migração não é desfeita pelo rollback | `infrastructure/observability/RUNBOOK.md` §6 "Rollback via Render" |
| Helm (sem ArgoCD) | `helm history` / `helm rollback` — não reexecuta o hook de migração | `infrastructure/observability/RUNBOOK.md` §6 "Rollback via Helm"; `charts/README.md` |
| ArgoCD | `argocd app history` / `argocd app rollback` — reverte o `sync`, não o schema | `infrastructure/observability/RUNBOOK.md` §6 "Rollback via ArgoCD" |
| Manifests k8s avulsos (`k8s/`) | Sem histórico de release — reaplicar YAML de um commit anterior via `git show` + `kubectl apply` | `k8s/README.md` §"Rollback" |
| Local (docker-compose) | `docker compose down` / restaurar volume nomeado / `git checkout` de um commit anterior + `npx prisma migrate resolve` quando aplicável | `docs/development/LOCAL_FIRST.md` |

Em todos os caminhos vale a mesma ressalva: reverter o deploy/release **não** desfaz uma migration
já aplicada ao banco. Uma migration destrutiva exige avaliação e, se necessário, migration de
compensação antes ou depois do rollback de código — nunca assumir que reverter o código também
reverte o schema.

## 5.1. Observabilidade em produção — status real (ACH-10-01)

`infrastructure/observability/RUNBOOK.md` é a fonte de verdade operacional para incidentes; este
índice só resume o estado atual para não divergir dele no futuro. Hoje o único caminho com tráfego
real de produção (Render) **não** tem Prometheus apontado — o stack completo
(Prometheus/Grafana/Loki/Tempo) só roda no ambiente local (`npm run infra:up`). O caminho Oracle
Cloud discutido em versões anteriores deste parágrafo (e em `RUNBOOK.md`/`oracle-cloud.md`) foi
retirado do repositório em 2026-09-18 — ver banner no topo desta página; `RUNBOOK.md` ainda contém
seções operacionais detalhadas escritas para esse caminho que não foram atualizadas por essa
retirada (débito de documentação separado, não corrigido nesta rodada). Se este resumo e o
RUNBOOK voltarem a divergir sobre o que está ativo, prevaleça pelo que de fato existe no disco
(`render.yaml`), não pelo texto do runbook.

## 6. Ambiente local reproduz o essencial da produção, sem exigir serviços desnecessários

`docker-compose.yml` sobe as dependências que a aplicação de fato usa hoje: Postgres+pgvector
(equivalente ao Supabase Postgres), Redis (opcional, `ENABLE_QUEUES`), Meilisearch (opcional,
`ENABLE_SEARCH`), MinIO (equivalente ao Supabase Storage/S3), LiteLLM e Ollama (IA local opcional).
Nenhum desses serviços é obrigatório para `npm run dev` subir — Redis/Meilisearch só passam a ser
necessários quando as respectivas flags (`ENABLE_QUEUES`/`ENABLE_SEARCH`) são ligadas, conforme
`docs/development/LOCAL_FIRST.md`. O verificador `node scripts/local-first/doctor.mjs` falha
explicitamente se algum endpoint de runtime apontar para um provedor cloud (Supabase, Neon, Render,
Railway, Vercel), evitando que o ambiente "local" acabe silenciosamente dependendo de produção.

## 6.1. Overlay opcional de ferramentas extra (`docker-compose.services.yml`)

Além do `docker-compose.yml` descrito acima, existe um **overlay opt-in**,
`docker-compose.services.yml` ("Ondas OS-3 a OS-7"), que define serviços adicionais que nenhuma
rota da aplicação depende hoje: Flowise, OpenWebUI, Qdrant, Superset, n8n, Chatwoot, Uptime Kuma,
Pocketbase e Plane. Ele **não substitui** `docker-compose.yml` nem `docker-compose.opensource.yml`
— é somado por cima, só quando alguém quer usar uma dessas ferramentas localmente:

```bash
docker compose -f docker-compose.yml -f docker-compose.opensource.yml -f docker-compose.services.yml up -d
```

Nenhum desses serviços entra em `render.yaml` (o único caminho de deploy real hoje —
`docker-compose.oci.yml`, mencionado em versões anteriores desta nota, foi deletado em 2026-09-18,
ver banner no topo desta página) — mesmo critério da seção 6: só passam a fazer parte de um
caminho de deploy real quando algum código da aplicação de fato depender deles, não só por
existirem definidos aqui.
Flowise e OpenWebUI já têm um consumidor real (`src/lib/ai/gateway/providers/litellm.provider.ts`,
roteado por prefixo de modelo `flowise/...`/`openwebui/...`, configurado via `FLOWISE_URL`/
`OPENWEBUI_URL` em `src/config/env.ts`); os demais ainda não têm código de aplicação que os
consuma — rodá-los localmente é opcional e não afeta `npm run dev`.

### Primeiro acesso — Superset, Uptime Kuma, Pocketbase, Plane

Esses quatro não são consumidos pelo código da aplicação — são ferramentas internas que rodam ao
lado do CRM, cada uma com sua própria conta de admin:

| Serviço             | URL local                                       | Primeiro login                                                                                                                                                                                                                                                             |
| ------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Apache Superset** | http://localhost:8089                           | Não vem com admin pronto — rode uma vez `docker compose -f docker-compose.yml -f docker-compose.services.yml --profile tools run --rm superset-init` (aplica migrations + cria o admin via `SUPERSET_ADMIN_USERNAME`/`SUPERSET_ADMIN_PASSWORD` do `.env`) antes de acessar |
| **Uptime Kuma**     | http://localhost:3003                           | Cria o admin na primeira visita à UI (sem variável de ambiente)                                                                                                                                                                                                            |
| **Pocketbase**      | http://localhost:8090/_/                        | Cria o admin na primeira visita à UI (sem variável de ambiente); serviço com `profiles: [tools, test]`, não sobe com `up -d` sem `--profile`                                                                                                                               |
| **Plane**           | http://localhost:3004 (frontend) / API em :8091 | Cria o workspace/admin na primeira visita à UI                                                                                                                                                                                                                             |

Nenhum desses quatro tem healthcheck confiável baseado em endpoint documentado oficialmente pelo
projeto upstream, **exceto** Superset e Pocketbase (`/health` e `/api/health`, confirmados na
documentação oficial de cada um) — Plane não define healthcheck nem no próprio
`docker-compose.yml` oficial do makeplane/plane, então não inventamos um aqui.

## 7. Para quem for reabrir um caminho cloud no futuro

Ver `docs/development/LOCAL_FIRST.md` ("Critério para voltar à produção"). Quando esse critério
for atingido, a escolha de arquitetura de produção definitiva é decisão de negócio — este índice
não a antecipa. Os quatro caminhos documentados na seção 2 continuam sendo o inventário de opções
já avaliadas/preparadas; nenhuma delas precisa ser reconstruída do zero.
