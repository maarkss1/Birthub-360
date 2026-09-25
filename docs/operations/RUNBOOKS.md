# Runbooks de Operação

## Matriz de Responsabilidade
- **Incident Commander**: Coordenador (Agente 00 / Dev Leader)
- **Deploy Owner**: Operações / SRE
- **Rollback Authority**: Tech Lead
- **Database Owner**: Agente 01 / DBA
- **Security Owner**: Agente 15 / SecOps

## Incidentes Comuns

### 1. Deploy
**Ação**: `docker compose up -d --build` (Modo Local-First).
**Validação**: `curl -f http://localhost:3000/health/live`

### 2. Rollback
**Ação**: 
1. `git checkout <SHA_ANTERIOR>`
2. `docker compose up -d --build`
3. (Se houver migration): Executar migration down manualmente (requer intervenção DB Owner).

### 3. Migration Failure
**Ação**: 
1. Analisar logs: `docker compose logs postgres`
2. Restaurar backup do dia se os dados foram corrompidos.
3. Marcar migration como resolvida `prisma migrate resolve --rolled-back`.

### 4. Database Incident / Backup Failure
**Ação**: Verificar integridade do disco. Testar restore do `.sql.gz` criptografado local.

### 5. Redis Incident
**Ação**: `docker compose restart redis`. O Redis neste ambiente é transiente e recupera-se limpo.

### 6. Authentication/Integration/Security
**Ação**: Rotacionar secretes (`.env`), acionar SecOps, revogar sessão (lockout).

