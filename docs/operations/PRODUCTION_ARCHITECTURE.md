# Arquitetura de Produção: Birth Hub 360

Este documento define a única arquitetura canônica e suportada para a plataforma Birth Hub 360 em produção.

## 1. Topologia Oficial: 100% Local-First / Single-Node

A aplicação opera em modo **Local-First / Single Node (Self-Hosted)**. Provedores em nuvem (Render, Neon, Vercel, Railway, Cloudflare R2) e orquestradores distribuídos (Kubernetes) estão **oficialmente desativados e obsoletos**.

A plataforma inteira é implantada via Docker Compose em uma única máquina (VM/Bare Metal) sob controle total do usuário.

## 2. Componentes

| Papel | Tecnologia / Serviço | Origem |
| --- | --- | --- |
| **Runtime da Aplicação** | Node.js (Express + Vite) | `server.ts` e `worker.ts` |
| **Banco de Dados** | PostgreSQL 16 + pgvector | `docker-compose.postgres-local.yml` |
| **Cache & Filas** | Redis | `docker-compose.yml` (`redis`) |
| **Storage de Arquivos** | MinIO (Compatível S3) | `docker-compose.yml` (`minio`) |
| **Motor de Busca** | Meilisearch | `docker-compose.yml` (`meilisearch`) |
| **Modelos de IA** | Ollama + LiteLLM | `docker-compose.yml` (`ollama`, `litellm`) |
| **Observabilidade** | Prometheus, Grafana, Loki, Tempo | `docker-compose.opensource.yml` / `infrastructure/observability/` |
| **Deploy** | Docker Compose UP | via CI/CD ou manual |

## 3. Reverse Proxy, TLS e Domínio

- A aplicação Node.js e os contêineres Docker expõem portas localmente.
- O roteamento e TLS devem ser feitos por um Reverse Proxy externo na própria máquina (ex: Nginx, Caddy ou Traefik) ou via túnel Cloudflare Zero Trust (se opt-in, não dependência de core).
- A aplicação escuta as configurações de ambiente `PUBLIC_BASE_URL` para montar links e webhooks.

## 4. Backup e Disaster Recovery

- **Banco de Dados**: O backup é realizado exportando um `.dump` ou `.sql` via script `backup-production.yml` ou rotina de cron local, armazenado fora do contêiner.
- **Storage**: O volume do MinIO deve ter backup no nível do disco.
- O Recovery é testado e documentado através de runbooks (`docs/operations/RUNBOOKS.md`).

## 5. Histórico e Depreciação

*   **`docs/deploy/producao.md`**: ARCHIVED / LEGACY
*   **`docs/deploy/render.md`**: ARCHIVED / LEGACY
*   **`k8s/` e `charts/`**: ARCHIVED / LEGACY

