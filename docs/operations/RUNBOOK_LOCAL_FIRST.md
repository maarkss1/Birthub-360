# Runbook Operacional — Birth Hub 360° (Local-First)

Este runbook consolida os procedimentos operacionais para inicialização (boot), aplicação de migrações, rollback, rotina de backup, recuperação (restore) e resposta a incidentes na arquitetura **100% Local-First** da Birth Hub 360°.

---

## 1. Procedimento de Inicialização (Boot)

### 1.1 Pré-requisitos
- Docker Engine / Docker Desktop em execução.
- Node.js >= 20 LTS e npm >= 10.
- Arquivo `.env` configurado com base no `.env.example`.

### 1.2 Inicialização dos Serviços de Infraestrutura
```powershell
# Subir todos os containers essenciais (PostgreSQL, Redis, MinIO, Meilisearch, LiteLLM, Ollama)
docker compose -f docker-compose.local-first.yml up -d

# Executar diagnóstico de saúde ambiental
node scripts/local-first/doctor.mjs
```

### 1.3 Aplicação Segura de Migrações do Banco
> [!IMPORTANT]
> **Auditoria de `npm start` e Migrações:**
> O comando padrão `npm start` executa `node dist/server.cjs` e **NÃO** aplica migrações automaticamente no código para evitar lock de conexão ou risco de aplicar alterações de schema não intencionais durante o boot do processo.
> 
> Em ambientes conteinerizados de produção (Dockerfile), a execução segura é garantida pelo entrypoint:
> ```bash
> npx prisma migrate deploy && node dist/server.cjs
> ```
> `npx prisma migrate deploy` aplica **apenas** migrações pendentes previamente versionadas em `prisma/migrations/`. Ele nunca executa resets interativos ou operações destrutivas não versionadas.
>
> **Nunca execute `prisma migrate reset` ou `prisma db push --force-reset` em ambientes com dados reais.**

### 1.4 Inicialização da Aplicação
```powershell
# Compilação e inicialização em modo produção
npm run build
npm start

# Ou em modo desenvolvimento
npm run dev
```

### 1.5 Validação Pós-Boot
```powershell
# Verificar endpoints de observabilidade
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
curl http://localhost:3000/health/version
```

---

## 2. Procedimento de Rollback

### 2.1 Rollback de Código / Aplicação
1. Reverter o código para o commit ou tag anterior estável:
   ```bash
   git checkout <TAG_OU_COMMIT_ESTAVEL>
   npm run build
   npm start
   ```
2. Em caso de deploy via container Docker:
   ```bash
   docker stop birthhub-app
   docker run -d --name birthhub-app birthhub-app:<TAG_ESTAVEL>
   ```

### 2.2 Rollback de Migrações de Banco de Dados
Siga rigorosamente as diretrizes de `docs/security/runbooks/MIGRATION_ROLLBACK.md`:
1. **Classificação da Migração:**
   - **Aditiva:** `ADD COLUMN` nullable, `CREATE TABLE`, `CREATE INDEX` -> Reversível via SQL inverso manual diretamente no banco (`psql` ou `npx prisma db execute`).
   - **Destrutiva:** `DROP COLUMN`, `DROP TABLE`, conversão de tipos com perda -> Reversível **apenas via restauração de backup**.
2. Após reverter a instrução no PostgreSQL, ajustar a tabela `_prisma_migrations` se necessário:
   ```sql
   DELETE FROM "_prisma_migrations" WHERE migration_name = '<NOME_DA_MIGRACAO>';
   ```

---

## 3. Rotina de Backup e Retenção

### 3.1 Execução de Backup Local
```powershell
# Execução via PowerShell (Windows)
.\scripts\local-first\backup-local.ps1

# Ou via Bash (Linux / CI / Docker)
./scripts/backup.sh
```

### 3.2 Política de Retenção
- Os backups são armazenados na pasta `./backups/` em formato SQL compactado/estruturado.
- Política de retenção canônica: **14 dias**.
- Os scripts limpam automaticamente dumps com mais de 14 dias para evitar exaustão de disco.
- O diretório `./backups/` é estritamente ignorado pelo Git (`.gitignore`) para conformidade com a LGPD e governança de dados.

---

## 4. Procedimento de Restauração (Restore)

### 4.1 Restauração Manual
```powershell
# PowerShell
.\scripts\local-first\restore-local.ps1 -BackupFile "backups\backup-2026-09-20T20-00-00.sql"

# Bash
./scripts/restore.sh backups/backup-2026-09-20T20-00-00.sql
```
O script de restore executa o `psql` com `-v ON_ERROR_STOP=1` garantindo que qualquer inconsistência de sintaxe ou violação de integridade interrompa imediatamente a restauração.

### 4.2 Exercício de Restore Automatizado (Restore Drill)
Para comprovar periodicamente a integridade dos backups sem afetar o banco principal:
```powershell
npm run backup:drill
```
O drill cria um backup real, provisiona um banco temporário isolado (`prospector_restore_drill`), restaura os dados e verifica:
- 100% de paridade na contagem de tabelas;
- 0 índices inválidos (`pg_index.indisvalid`);
- 0 registros órfãos nas foreign keys críticas;
- Comportamento de erro estrito em backups corrompidos.

---

## 5. Resposta a Incidentes e Rotação de Segredos

### 5.1 Matriz de Incidentes
Consulte `docs/security/runbooks/INCIDENT_RESPONSE.md` para o fluxo de 4 fases (Identificação, Contenção, Erradicação e Pós-Incidente).

### 5.2 Rotação de Segredos
- **Sessões Better Auth:** Atualizar `BETTER_AUTH_SECRET` e reiniciar a aplicação.
- **MinIO Storage:** Atualizar `STORAGE_ACCESS_KEY_ID` e `STORAGE_SECRET_ACCESS_KEY` no `.env` e no compose.
- **Webhooks Bitrix24:** Seguir `docs/security/runbooks/ROTATE_BITRIX24_WEBHOOKS.md`.
- **Chaves de IA:** Seguir `docs/security/runbooks/ROTATE_GEMINI_API_KEY.md` e `ROTATE_BLAND_AI_KEY.md`.

---

## 6. Diagnóstico Técnico de Avisos e Runtime

### 6.1 `MaxListenersExceededWarning`
- **Diagnóstico:** Ocorre ocasionalmente durante execuções massivas de testes com Vitest/MSW devido ao compartilhamento de event listeners em pools de workers assíncronos.
- **Runtime:** No runtime do servidor (`server.ts`), há estritamente 1 listener para encerramento gracioso e 1 listener para exceções não tratadas.
- **Mitigação:** Tratado e isolado em `tests/mocks/setup.ts` sem mascaramento de limites globais.

### 6.2 Avisos de Build PWA / Workbox
- **Diagnóstico:** Mensagens do tipo `brace-expansion` globbing geradas pelo plugin Vite PWA ao processar padrões de cache estático.
- **Status:** Avisos inofensivos de pré-processamento que não afetam o runtime ou o service worker.
