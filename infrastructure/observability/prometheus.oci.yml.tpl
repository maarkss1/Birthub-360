# Template de scrape config do Prometheus para a instância de produção Oracle Cloud (ADR-004).
#
# DEVOPS-003 (Onda 2, docs/audits/repository-debt-audit/agents/DEVOPS.md): até esta correção,
# nenhum dos dois ambientes com tráfego real tinha Prometheus apontado — decisão de escopo MVP
# registrada em ACH-10-01/`docs/deploy/oracle-cloud.md` §11, justificada por uma suposta barreira
# técnica real ("o scrape_config nativo do Prometheus não sabe enviar o header customizado
# x-platform-operator-token"). Essa premissa está desatualizada: o Prometheus tem um campo nativo
# `params` (parâmetros de URL) desde sempre, e `requirePlatformOperator`
# (src/shared/middlewares/requirePlatformOperator.ts) já aceita o token via querystring
# (?operator_token=...) — a mesma trava, um caminho de autenticação diferente, zero mudança de
# código de segurança. Ver `docs/deploy/oracle-cloud.md` §11 (revisado nesta onda) para o
# detalhamento completo.
#
# Este arquivo é um TEMPLATE (extensão .tpl) — nunca é montado diretamente. `scripts/deploy-oci.sh`
# o renderiza em `prometheus.oci.generated.yml` (git-ignored, nunca versionado) substituindo o
# marcador do campo `operator_token` abaixo pelo valor real de `.env.production`, só quando o
# operador optar explicitamente com `ENABLE_OBSERVABILITY=true` antes de rodar o script (mesmo
# padrão de opt-in já usado para `ENABLE_QUEUES`). Esse marcador aparece só uma vez neste arquivo
# (no campo `operator_token`) de propósito — a substituição em deploy-oci.sh é um `sed` textual
# simples, sem escopo por linha/campo, então repetir a string em qualquer outro lugar (inclusive em
# comentário) corromperia o texto renderizado ali também.
#
# O scrape roda inteiramente dentro da rede interna do Docker Compose (alvo `app:3000`, nome do
# serviço) — nunca atravessa o domínio público/Caddy, o que evita expor `/metrics` à internet e não
# depende de DNS/firewall além do que o stack OCI já tem.

global:
  scrape_interval: 15s

rule_files:
  - alert.rules.yml

scrape_configs:
  # job_name igual ao usado pelo stack local (ver prometheus.yml, job "central-comercial") de
  # propósito: alert.rules.yml (InstanceDown, HighEventLoopLag, HighHeapUsageRatio etc.) filtra por
  # `job="central-comercial"` sem rótulo de ambiente — usar um nome de job diferente aqui faria
  # esses alertas nunca corresponderem a esta instância.
  - job_name: central-comercial
    metrics_path: /metrics
    params:
      operator_token: ['__PLATFORM_OPERATOR_TOKEN__']
    static_configs:
      - targets: ['app:3000']
