# Onda Freeze Sprint13 — Segurança, Gate e Alinhamento Go-Live

- Prioridade: **P0/P1** — débitos de segurança e gate do Freeze de Escopo
- Branch de integração: `integracao/onda-freeze-sprint13`
- Data de início: 2026-09-19
- Coordenador: 00 (Antigravity)

---

## Baseline pré-onda (verificada em 2026-09-19)

| Gate | Resultado |
|------|-----------|
| `npx tsc --noEmit` | ✅ PASS — 0 erros |
| `npm run lint` | ✅ PASS — 0 erros, 2 avisos |
| `npm run test:architecture` | ✅ PASS — 0 violações; 0 hotspot acima de 1000 linhas |
| `npm run test:unit` | ✅ PASS — 404 suítes, 3368 testes |

---

## Matriz de propriedade (verificada antes do disparo)

| Agente | Branch | Arquivos exclusivos desta missão |
|--------|--------|----------------------------------|
| 01 | `agente/01-oauth-tokens-cifra` | `src/lib/prisma.ts`, testes em `src/lib/__tests__/` |
| 01A | `agente/01a-ailog-aigovernance-schema` | `prisma/schema.prisma`, `prisma/migrations/**` |
| 08 | `agente/08-gate-passwithouttests` | `package.json` (aprovado pelo 00 por este registro), `.github/workflows/ci.yml` |
| 15 | `agente/15-audit-middleware-montagem` | `src/features/billing/usage.routes.ts`, `src/bootstrap/routes.ts` |
| 02 | `agente/02-rbac-usage-routes` | `src/features/billing/usage.routes.ts` — **CONFLITO COM 15** (ver abaixo) |
| 16 | `agente/16-bitrix-purge-worker` | `src/lib/queue/bitrixExtractionPurge.worker.ts` (novo), `worker.ts` |
| 13 | `agente/13-ailog-slo-swarm` | `src/features/intelligence/services/swarmScheduler.service.ts`, `SwarmDashboard.tsx` |
| 18 | `agente/18-openapi-contract-drift` | `docs/openapi.yaml`, scripts de schema-drift |

**Resolução de conflito 02 x 15 (usage.routes.ts):**
- **15 cedeu** o item de RBAC (auditAccessMiddleware) para 02, que já possui expertise em `usage.routes.ts` pelo handoff `02-para-01-rbac-ausente-usage-routes.md`.
- **15 redireciona** foco para `src/lib/security/auditLog.middleware.ts` — decidindo (opção 2) remover ou manter com documentação clara sobre a lacuna.

---

## Levas de execução

### Leva 1 (disparada em 2026-09-19) — Segurança & Gate
- 01 — OAuth tokens Account cifra (`agente/01-oauth-tokens-cifra`)
- 01A — Schema AILog.agentRole + comentário AIGovernancePolicy (`agente/01a-ailog-aigovernance-schema`)
- 08 — Remover `--passWithNoTests` + reforçar script `ship` (`agente/08-gate-passwithouttests`)
- 15 — Documentar lacuna do `auditAccessMiddleware` (`agente/15-audit-middleware-montagem`)

### Leva 2 (após gate da Leva 1) — RBAC, Workers & Contratos
- 02 — `requireRole` em `GET /api/usage` (`agente/02-rbac-usage-routes`)
- 16 — Worker BullMQ `bitrixExtractionPurge` (`agente/16-bitrix-purge-worker`)
- 13 — `getSwarmSloSnapshot` por `agentRole` depois que 01A criar coluna (`agente/13-ailog-slo-swarm`)
- 18 — Drift OpenAPI vs tipos TypeScript (`agente/18-openapi-contract-drift`)

---

## Status dos gates por leva

| Leva | Gate `integracao/` | Veredito |
|------|--------------------|----------|
| 1 | `tsc`, `lint`, `test:architecture` verdes | PASS |
| 2 | pendente | — |

---

## Handoffs resolvidos por esta onda

- [x] `roadmap-v2-onda-1/01-para-00-account-oauth-tokens-sem-cifra.md` (44cb5e0b)
- [x] `onda-41/13-para-01-aigovernancepolicy-schema-morto.md` (40ec3ce4)
- [x] `onda-44/13-para-01-ailog-coluna-agentrole.md` (40ec3ce4)
- [x] `roadmap-v2-transversais/14-para-00-passwithnotests.md` (9a8e8103)
- [x] `audit-ach/08-para-00-ship-script-bypass.md` (9a8e8103)
- [x] `roadmap-v2-transversais/15-para-00-auditaccessmiddleware-nao-utilizado.md` (78aba484)
- [ ] `roadmap-v2-onda-1/02-para-01-rbac-ausente-usage-routes.md`
- [ ] `onda-40/06-para-16-bitrix-extraction-purge-worker-ausente.md`
