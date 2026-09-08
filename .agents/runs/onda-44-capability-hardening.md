# Onda 44 — Hardening do Capability & Permission Engine

## Objetivo

Fechar as inconsistências de segurança identificadas na revisão do PROMPT 3 antes de qualquer
implementação do AgentRuntime (PROMPT 4).

## Coordenador

- Agente 00 — integração, escopo e veredito de avanço.

## Especialistas e propriedade

| Agente | Missão | Arquivos sob propriedade nesta onda |
|---|---|---|
| 13 — Enxame Autônomo e Governança de Runtime | Fail-closed do Capability Engine, semântica de access level, UserRole policy e verificação de bindings | `src/features/job-roles/services/capabilityAuthorization.service.ts`, `src/features/job-roles/services/capabilityUserRolePolicy.ts`, `src/features/job-roles/catalog/verifiedToolBindings.ts` |
| 14 — Ambiente de Execução e Test Harness | Auditoria reproduzível de catálogo/grants e regressões de policy/binding | `scripts/capability-engine/audit-capability-engine.ts`, `tests/unit/capability-engine-hardening.test.ts` |
| 08 — QA e Release | Veredito PASS/BLOCKED pelos gates do PR; não edita os arquivos do 13/14 | GitHub Actions / relatório desta onda |

Não há sobreposição de propriedade entre os especialistas ativos. `prisma/schema.prisma` e
`prisma/migrations/**` ficam fora desta micro-onda; o schema do PROMPT 3 não será reaberto pelo
hardening.

## Achados confirmados antes da correção

1. `RoleAgentGrant`/`RoleCapabilityGrant` tratavam `REQUEST`, mas `READ` e `DISCOVER` não bloqueavam
   de forma completa ações `WRITE`/`EXECUTE`/`ADMIN`.
2. A policy superior de `UserRole` tratava principalmente `VISUALIZADOR`, sem traduzir de forma
   canônica todos os tipos de ação para a hierarquia real já existente.
3. `toolBindings.ts` continha bindings descritivos com `available: true` cujos métodos declarados
   não existem necessariamente com aquele nome. Exemplo confirmado: `BDRAgent` expõe `run(...)`,
   não `generateOutboundMessage`/`generateColdCallScript`.
4. `agent.execute` estava descrito como disponível apontando para a autorização, embora o
   AgentRuntime ainda não exista. Autorização não é execução.
5. `FUTURE_TOOL` era convertido em `SOURCE_REQUIRED` pela decisão final, perdendo a causa real.
6. A aparente divergência 379/391 precisava ser provada, não corrigida por suposição: 379 é o
   catálogo importado do Birth Hub; os 12 agentes da Célula Comercial são pré-existentes. O script
   de auditoria calcula união, sobreposição, faltantes e extras contra o banco.

## Correções aplicadas

- `CapabilityActionType` passa por policy de UserRole baseada em `ROLE_HIERARCHY`/`hasRequiredRole`:
  - READ -> mínimo VISUALIZADOR;
  - EXECUTE/WRITE -> mínimo SDR;
  - ADMIN -> mínimo GESTOR.
- Isso não concede capability e não cria RBAC paralelo: JobRole + RoleAgentGrant +
  AgentCapabilityGrant + RoleCapabilityGrant continuam obrigatórios até para ADMIN.
- `DISCOVER` nunca executa; `READ` só permite `CapabilityActionType.READ`; `REQUEST` sempre retorna
  `CROSS_ROLE_REQUEST_REQUIRED`; `EXECUTE` continua para os demais gates.
- `CapabilityAuthorizationService` preserva motivos distintos: `SOURCE_REQUIRED`, `FUTURE_TOOL` e
  `TOOL_UNAVAILABLE`.
- Introduzida allowlist `VERIFIED_TOOL_BINDINGS`: binding conceitual sem evidência explícita é
  rebaixado para `FUTURE_TOOL` na autorização. A lista cresce apenas quando símbolo/operação real
  for comprovado.
- `agent.execute` permanece indisponível até o PROMPT 4 implementar runtime de verdade.
- Auditoria automática confronta catálogo Birth Hub, 12 agentes preexistentes, mapa de
  capabilities, banco e grants.

## Scope guard

- NO DEPLOY.
- NO AgentRuntime.
- NO alteração em `supervisor.agent.ts` ou `SwarmOrchestrator`.
- NO workflow real de aprovação/cross-role.
- NO memória/aprendizado.
- NO mudança adicional de schema/migration nesta micro-onda.

## Gate de saída

A onda só pode ser marcada PASS quando o CI do PR executar com sucesso, no mínimo:

- lint/format;
- typecheck;
- architecture/hotspots;
- OpenAPI drift;
- unit tests, incluindo `capability-engine-hardening.test.ts`;
- integration tests do Capability Engine;
- migration gate;
- build.

Até lá: **PROMPT 4 BLOQUEADO**.
