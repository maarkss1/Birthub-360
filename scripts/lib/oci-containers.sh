#!/usr/bin/env bash
# ==============================================================================
# Fonte única dos nomes de container do stack self-hosted Oracle Cloud
# (docker-compose.oci.yml).
# ==============================================================================
#
# Por que este arquivo existe: em 09/2026 a stack foi rebatizada de AtlasGR para
# Birth Hub 360 e os `container_name` em docker-compose.oci.yml mudaram de
# `atlasgr_app`/`atlasgr_postgres` para `birthhub_app`/`birthhub_postgres`, mas
# backup-oci.sh, restore-oci.sh e deploy-oci.sh continuaram com os nomes antigos
# hardcoded cada um no seu próprio arquivo — os três quebraram ao mesmo tempo
# pelo mesmo motivo (auditoria DEVOPS-001/DEVOPS-002). Este arquivo existe para
# que uma futura renomeação de container só precise ser feita AQUI, não em N
# scripts diferentes.
#
# Uso: `source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/oci-containers.sh"`
# a partir de um script em scripts/.
#
# Os valores abaixo devem sempre corresponder a `container_name:` em
# docker-compose.oci.yml. Podem ser sobrescritos via variável de ambiente
# (ex.: em um ambiente onde o operador rodou `docker compose -p outro-nome ...`
# e por isso os nomes reais divergem do default deste repositório).

OCI_POSTGRES_CONTAINER="${OCI_POSTGRES_CONTAINER:-birthhub_postgres}"
OCI_APP_CONTAINER="${OCI_APP_CONTAINER:-birthhub_app}"
OCI_WORKER_CONTAINER="${OCI_WORKER_CONTAINER:-birthhub_worker}"
OCI_REDIS_CONTAINER="${OCI_REDIS_CONTAINER:-birthhub_redis}"
OCI_CADDY_CONTAINER="${OCI_CADDY_CONTAINER:-birthhub_caddy}"
