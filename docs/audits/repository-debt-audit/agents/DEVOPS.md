# DEVOPS — Auditoria de Débito Técnico (Infraestrutura e Deploy)

## Agente
DEVOPS (especialista em infraestrutura, deploy, observabilidade, backup/DR, CI/CD)

## Missão
Auditar infraestrutura e deploy do monorepo Birth Hub 360º: Docker/Docker Compose, reverse proxy,
provisionamento de banco/Redis/storage/search/vetores, workers/filas, gestão de segredos,
healthchecks, backup/restore, SSL/domínios, observabilidade, config produção vs staging, pipelines
CI/CD, rollback, segurança de migração no deploy, disaster recovery (RTO/RPO). Distinguir "funciona
localmente" de "pronto para produção de verdade". Esta é uma auditoria — nenhum arquivo de aplicação,
config, dependência ou banco foi alterado; apenas este relatório foi criado.

## Escopo
Todo o repositório, com foco em: `docker-compose*.yml`, `Dockerfile`, `docker/`, `k8s/`, `charts/`,
`argocd/`, `render.yaml`, `Caddyfile.oci`, `scripts/deploy-oci.sh`, `scripts/backup-oci.sh`,
`scripts/restore-oci.sh`, `.github/workflows/*` (18 pipelines), `infrastructure/observability/*`,
`infrastructure/opa/*`, `docs/deploy/*`, `docs/ADR/ADR-004-Producao-Oracle-Cloud.md`,
`.env.example`, `.trivyignore.yaml`, `.dependency-cruiser-known-violations.json` (parcial), `worker.ts`
(camada de boot/health), `src/lib/queue/redis.ts` (gate de filas embutidas vs. worker dedicado).

## Áreas inspecionadas
- Compose de desenvolvimento (`docker-compose.yml`, `docker-compose.opensource.yml`,
  `docker-compose.services.yml`, `docker-compose.postgres-local.yml`)
- Compose de produção self-hosted (`docker-compose.oci.yml`) e reverse proxy (`Caddyfile.oci`)
- Scripts operacionais OCI (`deploy-oci.sh`, `backup-oci.sh`, `restore-oci.sh`) e sua consistência
  com os nomes reais de container do Compose
- Caminho Render (`render.yaml`) + banco gerenciado (Neon/Supabase) — `docs/deploy/producao.md`
- Caminho Kubernetes/Helm/ArgoCD (`k8s/`, `charts/prospector-atlas/`, `argocd/`) — status real vs.
  aspiracional
- 18 workflows do GitHub Actions: CI canônico, backup, deploy OCI, publish de imagem, CD homolog,
  Trivy, CodeQL, SonarQube, dependency-review, budgets de bundle/latência, build Android/iOS
- Observabilidade (`infrastructure/observability/*`: Prometheus, Loki, Tempo, OTel, alertas) e
  `infrastructure/observability/RUNBOOK.md`
- OPA (Policy-as-Code) como sidecar opcional (`infrastructure/opa/policies/*`)
- Gestão de segredos (`.env.example`, `.gitignore`, `render.yaml` `sync: false`, `.env.production`
  gerado em runtime, `charts/prospector-atlas/values.yaml` `secrets: {}`)
- Consistência de documentação de deploy entre `docs/deploy/README.md` (índice canônico),
  `docs/deploy/producao.md`, `docs/deploy/oracle-cloud.md`, `charts/README.md`, `argocd/README.md`,
  `k8s/README.md`

## Arquivos inspecionados (não exaustivo)
`docker-compose.yml`, `docker-compose.oci.yml`, `docker-compose.opensource.yml`,
`docker-compose.services.yml`, `Dockerfile`, `docker/postgres/Dockerfile`, `Caddyfile.oci`,
`render.yaml`, `k8s/api-deployment.yaml`, `k8s/postgres-statefulset.yaml`, `k8s/redis-deployment.yaml`,
`k8s/ingress.yaml`, `k8s/migration-job.yaml`, `k8s/README.md`, `charts/prospector-atlas/*` (11
templates + values.yaml), `charts/README.md`, `argocd/application-production.yaml`,
`argocd/application-homolog.yaml`, `argocd/README.md`, `scripts/deploy-oci.sh`,
`scripts/backup-oci.sh`, `scripts/restore-oci.sh`, `.github/workflows/ci.yml`,
`.github/workflows/backup-production.yml`, `.github/workflows/deploy-oci.yml`,
`.github/workflows/docker-publish.yml`, `.github/workflows/cd-homolog.yml`,
`.github/workflows/production.yaml`, `.github/workflows/android-build.yml`,
`.trivyignore.yaml`, `infrastructure/observability/prometheus.yml`,
`infrastructure/observability/RUNBOOK.md` (leitura parcial), `infrastructure/opa/policies/*.rego`,
`docs/deploy/README.md`, `docs/deploy/producao.md`, `docs/deploy/oracle-cloud.md`,
`.agents/handoffs/onda-c0/11-para-15-opa-tenancy-policy-morta.md`, `.env.example` (leitura parcial),
`src/lib/queue/redis.ts`. Total aproximado: 45 arquivos lidos integralmente ou por trecho relevante.

## Resumo executivo
A infraestrutura deste repositório é excepcionalmente **auto-documentada** — quase todo arquivo de
deploy tem comentários extensos explicando decisões, histórico e status real, e `docs/deploy/README.md`
já resolve boa parte da confusão entre os quatro caminhos de deploy documentados (local, Oracle Cloud
self-hosted, Render+Supabase/Neon, Kubernetes/Helm/ArgoCD). Isso reduziu bastante o número de
descobertas "novas", mas a auditoria encontrou um achado CRÍTICO real e não documentado em nenhum
lugar: **os três scripts operacionais do caminho de produção definitivo (Oracle Cloud, ADR-004) —
`deploy-oci.sh`, `backup-oci.sh` e `restore-oci.sh` — e a própria `docs/deploy/oracle-cloud.md`
referenciam nomes de container (`atlasgr_app`, `atlasgr_postgres`) que não existem mais no
`docker-compose.oci.yml` atual (que usa `birthhub_app`, `birthhub_postgres`)**. Isso significa que,
hoje, rodar `backup-oci.sh` ou `restore-oci.sh` na instância real falha imediatamente com "container
não está em execução", e `deploy-oci.sh` aborta no passo de migração/seed (por causa de `set -e`) —
o próprio pipeline `deploy-oci.yml` do GitHub Actions depende desse script e herdaria essa falha.
Combinado com o fato de que o pipeline de backup agendado (`backup-production.yml`) está
deliberadamente desativado (R2 desabilitado, secrets ausentes), o caminho de produção definitivo do
produto está, no estado atual do repositório, **sem qualquer mecanismo de backup funcional** — nem
o automatizado (GitHub Actions) nem o manual documentado (scripts no host).

Fora esse achado, a maior parte da dívida de DevOps já é conhecida e razoavelmente gerenciada: os
caminhos Kubernetes/Helm/ArgoCD são explicitamente rotulados "aspiracionais" (nenhum cluster real os
consome), a ausência de Prometheus em produção é uma decisão de escopo documentada (não um
esquecimento), os segredos não estão versionados em nenhum caminho, e o CI (`ci.yml`) é robusto
(secret scanning, SBOM, Trivy bloqueante em imagem, actions fixadas por SHA, gate de working-tree
limpo). Os problemas remanescentes de maior impacto são: divergência entre documentos sobre o status
real do Render (`autoDeployTrigger`) e sobre se a instância Oracle já está "recebendo tráfego";
ausência total de observabilidade centralizada nos dois ambientes com tráfego real; e uma policy OPA
de tenancy carregada mas nunca consultada por nenhuma rota (falsa sensação de isolamento).

## Crítico
- **DEVOPS-001** — Scripts de deploy/backup/restore do Oracle Cloud (produção definitiva, ADR-004)
  referenciam nomes de container inexistentes (`atlasgr_app`/`atlasgr_postgres` vs. `birthhub_app`/
  `birthhub_postgres` reais). `backup-oci.sh` e `restore-oci.sh` falham com `exit 1` explícito
  ("Container ... não está em execução") antes de tocar no banco; `deploy-oci.sh` aborta (via
  `set -euo pipefail`) no passo `docker exec -i atlasgr_app npx prisma migrate deploy`, nunca chega
  ao passo de seed do admin (`seed-team.ts`). O pipeline `deploy-oci.yml` do GitHub Actions invoca
  exatamente esse script via SSH, herdando a falha. Ver Complete findings list.

## Alto
- **DEVOPS-002** — Backup de produção duplamente quebrado: o pipeline agendado
  (`backup-production.yml`) está propositalmente desligado (R2 retornando HTTP 403, secrets
  `BACKUP_DATABASE_URL`/`R2_*` ausentes, só `workflow_dispatch`) e o backup local no host OCI
  (`backup-oci.sh`) está quebrado pelo DEVOPS-001. Resultado combinado: nenhum backup real está
  sendo produzido para o destino de produção definitivo hoje.
- **DEVOPS-003** — Nenhum dos dois ambientes com tráfego real (Render+Supabase, Oracle Cloud) tem
  Prometheus/observabilidade centralizada apontada — já registrado como decisão de escopo (ACH-10-01)
  mas vale reafirmar como risco operacional real: um incidente em produção hoje depende de logs
  manuais/RUNBOOK, sem métricas nem alertas automáticos.
- **DEVOPS-004** — Documentação de deploy internamente inconsistente sobre o status real de dois
  caminhos: (a) `docs/deploy/README.md` linha ~39 afirma que a instância Oracle Cloud está "já
  provisionada e recebendo tráfego", enquanto `docs/deploy/oracle-cloud.md` §7 (mesma revisão) diz
  que o cutover de DNS "só após autorização explícita" e que nenhum smoke real contra domínio público
  "foi executado — depende da instância e do DNS estarem no ar"; (b) `charts/README.md` e
  `argocd/README.md` descrevem `render.yaml` como tendo `autoDeployTrigger: off` ("congelado"), mas o
  `render.yaml` atual tem `autoDeployTrigger: commit` e `docs/deploy/README.md`/`producao.md`
  confirmam que o deploy automático do Render foi reativado em 2026-09-02. Um operador que confie no
  documento errado pode subestimar o raio de impacto de um push em `main` (Render) ou superestimar a
  prontidão da instância Oracle.

## Médio
- **DEVOPS-005** — `infrastructure/opa/policies/tenancy.rego` é montado e carregado pelo engine OPA
  em runtime (via `docker-compose.services.yml`, serviço opcional `opa`), mas nenhuma rota do
  código-fonte consulta esse pacote (`atlasgr.tenancy`) — só `atlasgr.rbac` é efetivamente chamado
  (`src/middleware/opa.ts`). Já rastreado num handoff aberto (`onda-c0/11-para-15`), mas ainda sem
  decisão (remover ou conectar) — mantém uma policy de isolamento de tenant por marca documentada
  como ativa quando na prática nunca é avaliada por nenhum request real.
- **DEVOPS-006** — `.github/workflows/cd-homolog.yml` (job `build-and-push`) baixa o binário `yq`
  via `sudo wget` da URL `.../releases/latest/download/yq_linux_amd64` sem pin de versão nem
  verificação de checksum/assinatura, e executa com privilégio de root antes de usá-lo para editar
  `charts/prospector-atlas/values.yaml` e commitar/push em `develop`. Risco de cadeia de suprimentos
  (a "latest" pode mudar de conteúdo entre execuções, sem verificação). Impacto reduzido hoje porque
  este pipeline é `workflow_dispatch`-only e o caminho Kubernetes/Helm é aspiracional (nenhum cluster
  real consome o resultado), mas o padrão (download não fixado + sudo + push automático) merece
  correção antes de este caminho ser ativado de fato.
- **DEVOPS-007** — Postgres self-hosted da OCI usa certificado TLS autoassinado com validade de 10
  anos e clientes conectam com `sslmode=require` (cifra o canal, não valida a CA) — documentado e
  aceito no próprio compose como decisão consciente, mas isso deixa a conexão directa
  desenvolvedor→banco (porta 5432 pública, mesmo que restrita por CIDR na NSG e no firewall do host)
  sem proteção contra MITM caso um IP da allowlist seja comprometido ou a Security List seja mal
  configurada — defesa em profundidade incompleta (falta certificado validável ou mTLS).

## Baixo
- **DEVOPS-008** — `k8s/redis-deployment.yaml` (caminho minikube/local, explicitamente não-ativo)
  não define `requirepass` nem volume persistente para Redis, diferente do padrão já aplicado em
  `docker-compose.yml`/`docker-compose.oci.yml` (senha obrigatória, `appendonly yes`). Baixo impacto
  porque este manifest é rotulado "aspiracional/local" em `k8s/README.md`, mas se algum dia for
  promovido a caminho real sem revisão, herda uma configuração de Redis sem autenticação.
- **DEVOPS-009** — `docker-compose.yml` (stack de desenvolvimento) expõe Redis, Meilisearch e MinIO
  em todas as interfaces (`'6379:6379'`, `'7700:7700'`, `'9000-9001'`) em vez de `127.0.0.1:...`,
  diferente do padrão já usado em `docker-compose.oci.yml` para o Postgres/Redis de produção (bind
  explícito em loopback onde aplicável). Aceitável para desenvolvimento local atrás de firewall
  pessoal, mas inconsistente com o padrão de "bind seguro por padrão" adotado no compose de produção.

## Dívida técnica
- TD-DEVOPS: DEVOPS-001, DEVOPS-002, DEVOPS-006, DEVOPS-008, DEVOPS-009
- TD-DOC: DEVOPS-004
- TD-SEC: DEVOPS-006, DEVOPS-007
- TD-ARCH: DEVOPS-005 (autorização declarada mas não conectada)
- TD-OBS: DEVOPS-003

## Dívida de implementação
DEVOPS-001 é o caso canônico: a infraestrutura (compose, imagem, Dockerfile) foi corretamente
migrada do nome de marca antigo (AtlasGR) para o novo (Birth Hub 360 / `birthhub_*`), mas os scripts
operacionais que envolvem esses containers por nome literal (não por nome de serviço do Compose)
ficaram para trás — um caso de rename parcial que só se manifesta em produção real, nunca em CI
(que não usa esses scripts) nem em desenvolvimento local (que usa `docker-compose.yml`, sem esses
scripts).

## Dívida de funcionalidade (feature debt)
- Backup/restore automatizado de produção (feature planejada, código pronto, nunca executado com
  sucesso no estado atual — DEVOPS-001/002).
- Deploy automático via GitHub Actions para Oracle Cloud (`deploy-oci.yml`) — pronto mas com
  ativação pendente dos secrets SSH, e adicionalmente quebrado pelo DEVOPS-001 mesmo depois que os
  secrets forem cadastrados.
- Autoscaling do worker por profundidade de fila BullMQ (`worker-hpa.yaml`) — desligado por padrão
  porque não há métrica de fila exposta ao Prometheus (que por sua vez nem está apontado para
  produção, DEVOPS-003) — dependência em cascata de duas lacunas.

## Bugs
- **DEVOPS-001** (ver Crítico) é um bug de infraestrutura no sentido estrito: comportamento
  documentado ("backup diário", "restore de drill", "deploy git pull + up -d") não corresponde ao
  comportamento real (falha imediata) devido a um valor hardcoded desatualizado.

## Arquitetura
- Positivo: separação clara entre processo web (produtor de jobs) e worker dedicado (consumidor),
  com guarda em código (`ENABLE_EMBEDDED_WORKERS=true` faz `process.exit(1)` em produção — ver
  `src/lib/queue/redis.ts`) contra duplicação de consumers — mecanismo correto e efetivamente testado
  via `redisConfigured` + `ENABLE_QUEUES`.
- Quatro caminhos de deploy paralelos mantidos no repositório (local, OCI, Render, K8s/Helm/ArgoCD)
  — decisão de produto documentada (não remover histórico), mas custo real de manutenção: qualquer
  mudança de infraestrutura (ex.: novo endpoint de métricas, nova variável obrigatória) precisa ser
  replicada em até 4 lugares para não divergir — o DEVOPS-004 é um sintoma direto disso.
- O Job de migração do Helm (`charts/prospector-atlas/templates/migration-job.yaml`) e o hook
  `pre-install,pre-upgrade` estão corretos em desenho (aborta o release se a migration falhar), mas
  sem cluster real consumindo, isso nunca foi validado em execução — é uma garantia de papel.

## Segurança
- Segredos: nenhum caminho de deploy versiona segredo real (`.env*` no `.gitignore`, `render.yaml`
  usa `sync: false`, `values.yaml` do Helm mantém `secrets: {}` vazio, `.env.production` da OCI é
  gerado em runtime com `chmod 600` e nunca commitado) — auditado e confirmado correto nos quatro
  caminhos.
- `.trivyignore.yaml` só contém dois waivers, ambos com dono, justificativa e data de expiração
  (`docs/security/AUDIT_WAIVERS.md` como fonte única) — padrão saudável de gestão de exceção.
- CI (`ci.yml`) roda Gitleaks como gate obrigatório (`secret-scan`) antes de qualquer outro job, e
  todas as actions de terceiros são fixadas por SHA completo (não por tag) — mitiga ataques de
  supply-chain via tag flutuante, exceto no ponto isolado do DEVOPS-006.
- DEVOPS-007: TLS autoassinado no Postgres da OCI sem validação de CA — risco residual aceito, mas
  não documentado como tal em nenhum runbook de resposta a incidente (o que fazer se uma chave SSH
  de desenvolvedor vazar e o CIDR ainda estiver na allowlist).

## Testes
- Não há teste automatizado que valide os scripts de shell de infraestrutura (`deploy-oci.sh`,
  `backup-oci.sh`, `restore-oci.sh`) — nem shellcheck no CI, nem um teste de integração que suba
  `docker-compose.oci.yml` e rode esses scripts contra containers reais. É exatamente esse tipo de
  gap de teste que permitiu o DEVOPS-001 sobreviver sem detecção: os nomes de container só são
  usados por esses três scripts (nunca por `ci.yml`, que testa contra Postgres/Redis efêmeros do
  `services:` do GitHub Actions, sem Docker Compose).
- `k8s/`, `charts/` e `argocd/` não têm nenhum teste/lint automatizado no CI (nem `helm lint`, nem
  `kubeval`/`kubeconform`) — o "achado corrigido" descrito em `charts/README.md` (selector de label
  incompleto) só foi encontrado por revisão manual, não por um gate automatizado que preveniria
  regressão futura.

## Integração
- Cloudflare R2 (destino do backup automatizado) está reportado como desabilitado (HTTP 403) pela
  própria auditoria SRE citada no comentário de `backup-production.yml` — integração de storage
  externo para backup não está operacional.
- Bitrix24/WhatsApp/Groq — variáveis de ambiente para essas integrações estão corretamente
  declaradas como `sync: false` em `render.yaml` e documentadas como pré-requisito para ativar o
  worker dedicado, mas isso é responsabilidade de domínio de integração, não expandido aqui.

## Produto
- O caminho de produção que o dono do produto escolheu como definitivo (Oracle Cloud, ADR-004) é,
  na prática operacional de hoje, o menos coberto por automação funcional (deploy manual até os
  secrets serem cadastrados, backup quebrado) — o oposto do caminho "congelado" (Render), que
  continua com deploy automático funcionando e recebendo tráfego real. Há um risco de produto real
  aqui: se o Render for desligado antes do Oracle estar validado (o próprio `docs/deploy/README.md`
  já alerta para não fazer isso), e o Oracle for ativado com os scripts atuais, o primeiro
  incidente que exigir um restore de backup encontraria um script que nunca funcionou.

## Mock/Fake/Placeholder
- Nenhum mock de infraestrutura foi encontrado além do já documentado (Prometheus local não
  aponta para produção — é comportamento pretendido, não simulação enganosa).

## Código morto/órfão
- `infrastructure/opa/policies/tenancy.rego` (DEVOPS-005) — carregado, nunca consultado.
- Caminho Kubernetes/Helm/ArgoCD inteiro (`k8s/`, `charts/`, `argocd/`) é mantido "correto" mas
  órfão de qualquer cluster real — não é código morto no sentido de nunca ser exercitado por CI
  (`cd-homolog.yml`/`production.yaml` de fato buildam e publicam imagem), mas é infraestrutura órfã
  no sentido de nunca ser aplicada contra um ambiente vivo.

## Quick wins
- Corrigir os nomes de container em `scripts/deploy-oci.sh`, `scripts/backup-oci.sh`,
  `scripts/restore-oci.sh` e `docs/deploy/oracle-cloud.md` de `atlasgr_app`/`atlasgr_postgres` para
  `birthhub_app`/`birthhub_postgres` (busca-e-substituição direta, sem risco — DEVOPS-001).
- Atualizar `charts/README.md` e `argocd/README.md` para refletir `autoDeployTrigger: commit` real
  do `render.yaml` (DEVOPS-004b) — edição de texto, sem risco.
- Corrigir a frase "instância real já provisionada e recebendo tráfego" em `docs/deploy/README.md`
  para bater com o status real descrito em `docs/deploy/oracle-cloud.md` §7 (DEVOPS-004a).
- Fixar a versão do `yq` em `cd-homolog.yml` por tag específica + checksum, em vez de
  `releases/latest` (DEVOPS-006).
- Decidir e resolver o handoff aberto sobre `tenancy.rego` (remover ou conectar) — já está
  formulado como tarefa pronta em `.agents/handoffs/onda-c0/11-para-15-opa-tenancy-policy-morta.md`
  (DEVOPS-005).

## Problemas estruturais
- Duplicação de conhecimento operacional entre 4 caminhos de deploy documentados separadamente é a
  causa raiz recorrente de divergência de documentação (DEVOPS-004) e do próprio DEVOPS-001 (um
  rename precisa ser propagado manualmente para scripts fora do compose, sem gate automatizado que
  force essa consistência).
- Nenhum smoke test / verificação automatizada pós-deploy para o caminho OCI além do curl manual a
  `/health/live`/`/health/ready` embutido no próprio `deploy-oci.yml` — suficiente para detectar
  "processo não subiu", insuficiente para detectar "processo subiu mas backup/restore não funcionam"
  (exatamente o gap que esta auditoria encontrou).

## Precisa verificação
- Política de backup nativa do Supabase (retenção, PITR) para o banco que **hoje** ainda serve
  tráfego real via Render — não verificado nesta auditoria (fora do repositório, depende do
  dashboard do Supabase). Se o Supabase não tiver backup diário configurado no plano contratado, o
  caminho "ativo, congelado" também estaria sem cobertura de DR — só um operador com acesso ao
  dashboard pode confirmar.
- Se os secrets `OCI_SSH_HOST`/`OCI_SSH_USER`/`OCI_SSH_PRIVATE_KEY`/`OCI_DEPLOY_PATH` já foram
  cadastrados no GitHub (o repositório não permite inspecionar `Settings > Secrets` via arquivo) —
  se sim, todo push em `main` já estaria tentando (e falhando em) `deploy-oci.sh` desde a última
  vez que a branch de app mudou, o que elevaria DEVOPS-001 de "risco latente" para "falha ativa
  recorrente no Actions".
- Se a instância Oracle Cloud real (IP público citado como exemplo em `docs/deploy/oracle-cloud.md`)
  está de fato no ar rodando `docker-compose.oci.yml` neste momento, ou se é apenas
  código/documentação preparados sem instância provisionada ainda — os dois documentos que deveriam
  concordar sobre isso divergem entre si (DEVOPS-004a).

## Lista completa de achados

| ID | Título | Severidade | Prioridade | Confiança | Status |
| --- | --- | --- | --- | --- | --- |
| DEVOPS-001 | Nome de container desatualizado quebra deploy/backup/restore da produção OCI | CRITICAL | P0 | HIGH | CONFIRMED |
| DEVOPS-002 | Nenhum backup funcional real para o destino de produção definitivo | HIGH | P0 | HIGH | CONFIRMED |
| DEVOPS-003 | Nenhuma observabilidade centralizada em ambientes com tráfego real | HIGH | P1 | HIGH | CONFIRMED |
| DEVOPS-004 | Documentação de deploy internamente inconsistente (status Render/OCI) | HIGH | P1 | HIGH | CONFIRMED |
| DEVOPS-005 | Policy OPA de tenancy carregada mas nunca consultada | MEDIUM | P2 | HIGH | CONFIRMED |
| DEVOPS-006 | Download não fixado de `yq` com sudo em pipeline CD | MEDIUM | P2 | HIGH | CONFIRMED |
| DEVOPS-007 | TLS autoassinado sem validação de CA no Postgres OCI | MEDIUM | P3 | MEDIUM | CONFIRMED |
| DEVOPS-008 | Redis do manifest k8s local sem senha/persistência | LOW | P3 | HIGH | CONFIRMED |
| DEVOPS-009 | Serviços de dev expostos em todas as interfaces vs. loopback | LOW | P4 | HIGH | CONFIRMED |

### DEVOPS-001 — Nome de container desatualizado quebra deploy/backup/restore da produção OCI
- **Categoria**: TD-DEVOPS / TD-BUG
- **Severidade**: CRITICAL — **Prioridade**: P0 — **Esforço**: XS
- **Confiança**: HIGH — **Status**: CONFIRMED
- **Evidência**:
  - `docker-compose.oci.yml` linhas 32, 98: `container_name: birthhub_app`, `container_name:
    birthhub_postgres`.
  - `scripts/deploy-oci.sh` linhas 291, 298, 302: `docker exec -i atlasgr_postgres pg_isready...`,
    `docker exec -i atlasgr_app npx prisma migrate deploy`, `docker exec -i atlasgr_app npx tsx
    scripts/seed-team.ts`.
  - `scripts/backup-oci.sh` linha 30: `CONTAINER="atlasgr_postgres"`; linha 38-41: `if ! docker ps
    --format '{{.Names}}' | grep -qx "$CONTAINER"; then echo "❌ Container ... não está em
    execução."; exit 1; fi`.
  - `scripts/restore-oci.sh` linha 23: `CONTAINER="atlasgr_postgres"` (mesmo guard de saída
    antecipada).
  - `docs/deploy/oracle-cloud.md` linhas 222, 301, 325, 375 repetem os mesmos nomes.
  - Confirmado via `grep -rn "container_name:" docker-compose.oci.yml` (só `birthhub_*`) vs. `grep
    -rln "atlasgr_(app|postgres...)"` (5 arquivos, todos os 3 scripts + 1 doc + 1 handoff não
    relacionado).
  - Confirmado que os `container_name: birthhub_*` já existiam antes das mudanças não commitadas
    desta sessão (`git diff --cached -- docker-compose.oci.yml` mostra que a edição em progresso
    não tocou nessas linhas) — não é uma regressão desta sessão, é dívida pré-existente.
- **Causa raiz**: rebranding AtlasGR → Birth Hub 360 renomeou os `container_name` no Compose (fonte
  de verdade), mas os três scripts de shell que referenciam contêineres por nome literal (para poder
  rodar `docker exec` sem depender do Compose) não foram atualizados na mesma mudança.
- **Cenário de falha concreto**: um operador (ou o próprio `deploy-oci.yml` via SSH) roda
  `./scripts/deploy-oci.sh` na instância OCI real. Os passos 1-4 funcionam (usam `docker compose`,
  que resolve por serviço, não pelo `$CONTAINER` hardcoded). O passo 5 (espera do Postgres) volta 30
  tentativas sempre falhando silenciosamente (dentro de um `until ... || ...`, não aborta o script),
  desperdiçando ~60s. O passo 6 (`docker exec -i atlasgr_app npx prisma migrate deploy`) falha com
  `Error: No such container: atlasgr_app` e, por causa de `set -euo pipefail`, o script inteiro
  aborta ali — nunca chega ao passo 7 (seed do admin). Se for a primeira subida do stack (banco
  vazio), a aplicação de fato aplica a migration sozinha no boot (o `CMD` do `Dockerfile` já roda
  `npx prisma migrate deploy && exec npm run start`), então o schema não fica quebrado — mas o
  usuário administrador nunca é criado, e o script termina com uma falha visível em vez do banner de
  sucesso. Separadamente, `./scripts/backup-oci.sh` (agendado via cron conforme o próprio comentário
  do arquivo, `0 3 * * * ... backup-oci.sh`) e `./scripts/restore-oci.sh` falham
  **imediatamente**, antes de qualquer tentativa de `pg_dump`/`psql`, com `exit 1` — ou seja,
  qualquer cron configurado seguindo a própria documentação do script produz zero backups, todos os
  dias, sem nenhum alerta (o script só escreve no stdout redirecionado para um arquivo de log local,
  que ninguém necessariamente monitora).
- **Impacto no usuário/negócio**: se a Oracle Cloud for de fato o destino de produção (conforme
  ADR-004) e o Render for desligado antes desta correção, a empresa fica sem qualquer backup
  funcional do banco de produção e sem deploy automatizado funcional via o único script documentado
  para isso.
- **Resolução sugerida**: substituir `atlasgr_app`/`atlasgr_postgres` por `birthhub_app`/
  `birthhub_postgres` nos 3 scripts e na doc; idealmente, trocar o hardcode por resolução dinâmica
  (`docker compose -f docker-compose.oci.yml ps -q postgres`) para que um rename futuro não repita o
  mesmo problema.

### DEVOPS-002 — Nenhum backup funcional real para o destino de produção definitivo
- **Categoria**: TD-DEVOPS / TD-DATA
- **Severidade**: HIGH — **Prioridade**: P0 — **Esforço**: S
- **Confiança**: HIGH — **Status**: CONFIRMED
- **Evidência**: `.github/workflows/backup-production.yml` linhas 1-9 (comentário do próprio
  arquivo): "A auditoria SRE confirmou Cloudflare R2 desabilitado (HTTP 403) e secrets de backup
  ainda não configurados"; `on: workflow_dispatch: {}` (sem `schedule:`), passo "Validar
  pré-requisitos secretos" falha explicitamente se `BACKUP_DATABASE_URL`/`BACKUP_ENCRYPTION_
  PASSPHRASE`/`R2_*` estiverem ausentes. Combinado com DEVOPS-001 (backup local também quebrado).
- **Cenário de falha**: perda de dados (corrupção, erro humano, incidente de infraestrutura) na
  instância OCI hoje não tem nenhum backup dos últimos N dias para restaurar — RPO efetivo é
  "indefinido/infinito" enquanto os dois mecanismos permanecerem quebrados/desligados.
- **Resolução sugerida**: resolver DEVOPS-001 primeiro (destrava o caminho manual/cron local
  imediatamente, sem depender de infraestrutura externa); paralelamente, reativar R2 ou trocar o
  destino do backup automatizado (S3 real, ou o mesmo host via `rclone` como já sugerido no próprio
  comentário de `backup-oci.sh`).

### DEVOPS-003 — Nenhuma observabilidade centralizada em ambientes com tráfego real
- **Categoria**: TD-OBS
- **Severidade**: HIGH — **Prioridade**: P1 — **Esforço**: M
- **Confiança**: HIGH — **Status**: CONFIRMED
- **Evidência**: `infrastructure/observability/prometheus.yml` linhas 1-13 (comentário): "a
  produção real (Oracle Cloud...) NÃO tem Prometheus próprio hoje"; `docs/deploy/README.md` §5.1:
  "Hoje nenhum dos dois caminhos com tráfego real (Oracle Cloud, Render) tem Prometheus apontado —
  o stack completo... só roda no ambiente local". Barreira técnica real documentada: `/metrics`
  exige header `x-platform-operator-token` que o `scrape_config` nativo do Prometheus não envia sem
  mudança de código.
- **Cenário de falha**: um incidente de produção (latência, erro 5xx em massa, fila travada) só é
  detectável por relato de usuário ou inspeção manual de log via SSH — sem dashboard, sem alerta
  automático, sem histórico de métricas para correlacionar causa raiz.
- **Resolução sugerida**: já mapeado como decisão de escopo MVP explícita; quando priorizado,
  `RUNBOOK.md` §8 e `oracle-cloud.md` §11 já descrevem o pré-requisito de código (endpoint de
  scrape autenticável) necessário antes de apontar Prometheus para produção.

### DEVOPS-004 — Documentação de deploy internamente inconsistente
- **Categoria**: TD-DOC
- **Severidade**: HIGH — **Prioridade**: P1 — **Esforço**: XS
- **Confiança**: HIGH — **Status**: CONFIRMED
- **Evidência (a — status OCI)**: `docs/deploy/README.md` linha 39 (tabela, caminho 2): "**Alvo
  definitivo de produção (ADR-004), instância real já provisionada e recebendo tráfego.**" vs.
  `docs/deploy/oracle-cloud.md` linha 445: "**Cutover** só após autorização explícita do dono do
  produto — nunca como consequência automática" e linha 556-557: "**Não executado**: qualquer smoke
  real (login, CRM, Prospecção, Copiloto) contra um domínio público — depende da instância e do DNS
  estarem no ar."
- **Evidência (b — status Render)**: `charts/README.md` linha 8: "Render (`render.yaml`) foi a
  última arquitetura de produção real, mas está **congelado** (`autoDeployTrigger: off`..."; mesma
  frase em `argocd/README.md` linha 9. Porém `render.yaml` linha 12 atual:
  `autoDeployTrigger: commit` (não `off`), e `docs/deploy/README.md` linha 27 / `producao.md` linha
  6-7 confirmam: "`render.yaml` voltou a ter deploy automático (`autoDeployTrigger: commit`)" desde
  2026-09-02.
- **Cenário de falha**: um operador que leia só `charts/README.md`/`argocd/README.md` (ambos citam
  "ITEM-12, 2026-08-25" como a última atualização) concluiria erroneamente que um push em `main` não
  aciona deploy automático no Render — quando na verdade aciona. E um operador que leia só
  `docs/deploy/README.md` sobre a Oracle concluiria que já há tráfego real de produção lá, quando o
  próprio guia operacional da Oracle diz o oposto.
- **Resolução sugerida**: atualizar `charts/README.md`/`argocd/README.md` para remover a alegação de
  `autoDeployTrigger: off` (ou linkar para `docs/deploy/README.md` como fonte de verdade sem repetir
  o dado desatualizado); revisar a frase sobre "recebendo tráfego" em `docs/deploy/README.md` linha
  39 para bater com `oracle-cloud.md`.

### DEVOPS-005 — Policy OPA de tenancy carregada mas nunca consultada
- **Categoria**: TD-ARCH / TD-TENANT
- **Severidade**: MEDIUM — **Prioridade**: P2 — **Esforço**: S
- **Confiança**: HIGH — **Status**: CONFIRMED (achado já rastreado em handoff aberto, não corrigido)
- **Evidência**: `infrastructure/opa/policies/tenancy.rego` (package `atlasgr.tenancy`, regras
  `brand_allowed`/`cross_brand_violation`) é montado em `docker-compose.services.yml` linhas
  283-298 (`volumes: ./infrastructure/opa/policies:/policies:ro`); handoff
  `.agents/handoffs/onda-c0/11-para-15-opa-tenancy-policy-morta.md` confirma via grep em `src/` que
  nenhuma rota consulta `atlasgr/tenancy` — só `atlasgr/rbac` é chamado por
  `src/middleware/opa.ts`/`src/lib/auth/authorization.ts`. Handoff está com `Status: aberto`.
- **Cenário de falha**: alguém revisando segurança lê o comentário do próprio `tenancy.rego` (citado
  no handoff como "a prova técnica" de isolamento por marca) e conclui que existe uma camada de
  isolamento de tenant por marca ativa — quando nenhum request real passa por ela.
- **Resolução sugerida**: já formulada no próprio handoff — decidir entre remover o arquivo ou
  conectar de fato o middleware a essa policy.

### DEVOPS-006 — Download não fixado de `yq` com sudo em pipeline CD
- **Categoria**: TD-DEVOPS / TD-SEC
- **Severidade**: MEDIUM — **Prioridade**: P2 — **Esforço**: XS
- **Confiança**: HIGH — **Status**: CONFIRMED
- **Evidência**: `.github/workflows/cd-homolog.yml` linhas 244-245: `sudo wget -qO
  /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64` seguido
  de `sudo chmod a+x /usr/local/bin/yq`, sem verificação de checksum/assinatura, dentro do job
  `build-and-push` que já tem `permissions: contents: write, packages: write`.
- **Cenário de falha**: comprometimento do binário `yq` "latest" (supply-chain) executaria código
  arbitrário com privilégio de root no runner, com acesso ao `GITHUB_TOKEN` de escrita do próprio
  job. Impacto prático reduzido hoje porque este workflow é `workflow_dispatch`-only e o resultado
  (commit em `charts/.../values.yaml`) não é consumido por nenhum cluster real.
- **Resolução sugerida**: fixar uma versão/tag específica de `yq` e validar o checksum publicado
  pelo projeto antes de instalar; considerar usar a action oficial em vez de `wget` cru.

### DEVOPS-007 — TLS autoassinado sem validação de CA no Postgres OCI
- **Categoria**: TD-SEC
- **Severidade**: MEDIUM — **Prioridade**: P3 — **Esforço**: M
- **Confiança**: MEDIUM — **Status**: CONFIRMED (comportamento), risco residual é julgamento
- **Evidência**: `docker/postgres/Dockerfile` gera certificado autoassinado (`openssl req -x509 ...
  -days 3650`); `docker-compose.oci.yml` comentário linha 116: "cliente usa
  `?sslmode=require&uselibpqcompat=true`" — `sslmode=require` cifra mas não valida identidade do
  servidor.
- **Cenário de falha**: se um IP autorizado na Security List/CIDR do host for comprometido (ex.:
  laptop de desenvolvedor roubado com VPN ativa, ou erro de configuração de NSG liberando uma faixa
  mais ampla do que pretendido), um atacante nessa posição de rede poderia interceptar/alterar
  tráfego para o Postgres sem que o cliente detecte, porque não há validação de certificado.
- **Resolução sugerida**: considerar `sslmode=verify-full` com a CA autoassinada distribuída aos
  clientes de desenvolvimento (fixa, sem custo de CA pública), ou restringir ainda mais o acesso
  direto (ex.: sempre via túnel SSH/bastion em vez de porta 5432 pública mesmo que filtrada).

### DEVOPS-008 — Redis do manifest k8s local sem senha/persistência
- **Categoria**: TD-DEVOPS
- **Severidade**: LOW — **Prioridade**: P3 — **Esforço**: XS
- **Confiança**: HIGH — **Status**: CONFIRMED
- **Evidência**: `k8s/redis-deployment.yaml` — nenhum `command`/`args` com `--requirepass`, nenhum
  `volumeMounts`/`PersistentVolumeClaim` — comparar com `docker-compose.yml`/`docker-compose.oci.yml`
  que sempre exigem senha e persistem em volume nomeado.
- **Resolução sugerida**: alinhar com o padrão já usado nos outros composes antes deste manifest ser
  usado para além de minikube local (`k8s/README.md` já rotula este caminho como não-ativo).

### DEVOPS-009 — Serviços de dev expostos em todas as interfaces vs. loopback
- **Categoria**: TD-DEVOPS
- **Severidade**: LOW — **Prioridade**: P4 — **Esforço**: XS
- **Confiança**: HIGH — **Status**: CONFIRMED
- **Evidência**: `docker-compose.yml` linhas 13-14 (`'6379:6379'`), 33-34 (`'7700:7700'`), 61-63
  (`'9000:9000'`, `'9001:9001'`) — todos sem prefixo `127.0.0.1:`, diferente de
  `docker-compose.oci.yml` (`'127.0.0.1:3000:3000'`, `'127.0.0.1:6379:6379'`).
- **Resolução sugerida**: bind em loopback por padrão no compose de desenvolvimento também, com
  documentação de como expor externamente quando necessário (ex.: testar de outro dispositivo na
  rede local).
