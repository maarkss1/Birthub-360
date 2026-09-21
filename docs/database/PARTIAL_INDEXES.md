# Índices Únicos Parciais no PostgreSQL (DATA-001)

> **Atenção:** O Prisma Schema DSL não suporta nativamente a criação de índices únicos parciais (`CREATE UNIQUE INDEX ... WHERE ...`). Portanto, estes índices existem exclusivamente nas migrações SQL manuais e **não são gerados** via `npx prisma db push`.

Caso um ambiente de banco seja recriado ou passe por `db push --force-reset`, estes 3 índices devem ser verificados e aplicados para manter a integridade transacional:

### 1. CadenceRun (At most one active cadence run per lead)
- **Tabela:** `CadenceRun`
- **Migration:** `prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql`
```sql
CREATE UNIQUE INDEX IF NOT EXISTS "CadenceRun_leadId_active_unique" 
ON "CadenceRun"("leadId") 
WHERE "status" = 'Active';
```

### 2. UserJobRole (At most one active primary job role per user)
- **Tabela:** `UserJobRole`
- **Migration:** `prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql`
```sql
CREATE UNIQUE INDEX IF NOT EXISTS "UserJobRole_one_active_primary_per_user" 
ON "UserJobRole"("userId") 
WHERE "isPrimary" = true AND "isActive" = true;
```

### 3. AgentVersion (At most one active version per agent definition)
- **Tabela:** `AgentVersion`
- **Migration:** `prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql`
```sql
CREATE UNIQUE INDEX IF NOT EXISTS "AgentVersion_one_active_per_agent" 
ON "AgentVersion"("agentDefinitionId") 
WHERE "status" = 'ACTIVE';
```
