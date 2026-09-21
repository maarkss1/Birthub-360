# Central Birth Hub 360 — modo local-first

> **Estado Operacional Atual (2026-09-20): 100% LOCAL-FIRST ATIVO E CANÔNICO.**
> Todos os caminhos de produção em nuvem (Render, Neon, Cloudflare, Kubernetes/ArgoCD, OCI) estão
> **desativados por enquanto**. O repositório e os serviços locais (`docker-compose.yml`) são a
> única fonte de execução ativa da plataforma, sem qualquer dependência ou deploy para provedores cloud.
> Ver `docs/deploy/README.md`.


## Estado desta fase

Durante o desenvolvimento e o redesenho da Central, o repositório GitHub é a fonte de verdade. A aplicação não deve depender de Render, Vercel, Supabase, Neon ou Railway para funcionar no dia a dia de desenvolvimento.

A infraestrutura cloud existente fica preservada temporariamente somente para rollback e migração segura de dados. Ela não deve receber novas decisões arquiteturais nem novos acoplamentos.

## Arquitetura de desenvolvimento

```text
Navegador
   |
   v
Node/Express + Vite (localhost:3005)
   |
   +--> PostgreSQL local (localhost:5434 via docker-compose.postgres-local.yml)
   +--> Redis local (localhost:6379)
   +--> Meilisearch local (localhost:7700)
   +--> MinIO local / S3 (localhost:9000)
   +--> Ollama local (localhost:11434)
   +--> LiteLLM local (localhost:4000)
```

O `docker-compose.yml` é a base da infraestrutura local de apoio (Redis, Meilisearch, MinIO, LiteLLM, Ollama). O storage MinIO cria automaticamente o bucket `prospector-assets`.

**Banco de dados Local-First:** a aplicação utiliza PostgreSQL local com extensão pgvector (porta 5434, serviço `postgres` em `docker-compose.postgres-local.yml`), garantindo ambiente 100% autônomo sem dependência externa.

## Subida local

1. Copie `.env.example` para `.env`.
2. Configure `DATABASE_URL=postgresql://prospector:prospector_pass@localhost:5434/prospectordb`.
3. Para storage local, configure:

```env
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_REGION=us-east-1
STORAGE_BUCKET=prospector-assets
STORAGE_ACCESS_KEY_ID=birthhub
STORAGE_SECRET_ACCESS_KEY=birthhub_minio_dev_only
```

4. Para Redis local, quando as filas forem necessárias:

```env
REDIS_URL=redis://:prospector_redis_pass@localhost:6379
ENABLE_QUEUES=true
```

5. Para Meilisearch local, quando a busca for necessária:

```env
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=birthhub_meili_master_key
ENABLE_SEARCH=true
```

6. Suba a infraestrutura:

```bash
docker compose up -d
```

7. Instale as dependências e aplique as migrations:

```bash
npm ci
npx prisma migrate deploy
```

8. Rode o verificador local-first:

```bash
node scripts/local-first/doctor.mjs
```

9. Inicie a aplicação:

```bash
npm run dev
```

O doctor falha se os principais endpoints de runtime ainda apontarem para Supabase, Neon, Render, Railway ou Vercel.

## Migração do Supabase

O projeto Supabase usado pela Central contém dados de autenticação e organização. Portanto, ele não pode ser pausado ou excluído antes de existir uma cópia local validada.

No Windows PowerShell, gere o backup do schema `public` com:

```powershell
.\scripts\local-first\backup-supabase.ps1 -SourceDatabaseUrl "<CONNECTION_STRING_DO_SUPABASE>"
```

O dump é salvo em `backups/`, diretório protegido pelo `.gitignore`. O script também calcula SHA-256 para permitir verificar a integridade do arquivo.

### Regra de corte

O Supabase só pode ser pausado depois de todos estes itens estarem comprovados no PostgreSQL local:

- usuários e contas de credencial importados;
- organizações importadas;
- login local funcionando;
- troca de senha funcionando;
- migrations atualizadas;
- contagens essenciais reconciliadas;
- nenhuma rota da aplicação usando URL do Supabase;
- backup íntegro mantido fora do Git.

## Situação dos Provedores Legados (100% Desativados)

### Render
Desativado formalmente. Não há deploys automáticos, serviços ativos ou dependências de webhooks do Render.

### Supabase e Neon
Desativados formalmente. O banco de dados canônico é o PostgreSQL 16 local (`birthhub_postgres`, porta 5434), gerenciado pelo Docker Compose e respaldado pela suíte de backup/restore drill (`npm run backup:drill`).

### Cloudflare R2
Desativado formalmente. O armazenamento de arquivos e áudios é 100% gerenciado pelo MinIO local (`birthhub_minio`, porta 9000).

### Vercel e Railway
Desativados. Não há dependências funcionais de runtime.

## Diretrizes de Governança Local-First

- Não adicionar provedores de banco de dados em nuvem.
- Manter `.env` apontado para a infraestrutura local em Docker Compose.
- Não reintroduzir pipelines automáticos de deploy em nuvem externa sem decisão deliberada do dono do produto.
- Garantir que todos os backups e restores sejam validados localmente sem depender de serviços externos.

