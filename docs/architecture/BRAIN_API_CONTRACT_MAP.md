# Brain API Contract Map — BIRTHUB-BRAIN-REORG / Onda C0

- **Agente responsável:** 18 — Contratos, API e Documentação Viva.
- **Data:** 2026-09-10.
- **Escopo desta rodada (C0):** mapa **estrutural** de como as rotas de API se organizam e montam
  no processo Express (`server.ts` + `src/bootstrap/routes.ts` + `src/bootstrap/webhooks.ts`).
  **Não é** a medição de deriva contrato-vs-implementação (`docs/openapi.yaml` tem 7.454 linhas e
  30+ routers reais) — essa medição já está formalmente atribuída à **Onda 8** do programa oficial
  de agentes (`.agents/COMO-CHAMAR-OS-AGENTES.md` → "Agente 18 — Contratos, API e Documentação
  Viva", missão: "medir a deriva entre `docs/openapi.yaml` e os 30 routers reais... escrever a
  verificação que FALHA quando eles divergem"). Refazer isso aqui duplicaria uma missão já
  agendada; o que este documento faz é dar ao Coordenador o mapa de montagem para decidir a Onda C1.

## 1. Pipeline de entrada HTTP (ordem real, `server.ts`)

Já documentado em detalhe por `.agents/completion/02-mapa-plataforma.md` §6.1 — reproduzido aqui só
o suficiente para contrato:

```
helmet → cors → compression → rate limit (/api geral)
       → rate limits específicos (/api/intelligence, /api/agent, /api/knowledge, /api/auth)
       → WEBHOOKS COM CORPO CRU (antes do express.json!) — ver §2
       → express.json → /metrics → /api-docs → health/live|ready
       → Better Auth (/api/auth) → /admin/queues (ADMIN)
       → observabilityMiddleware
       → routers de negócio (authenticateToken + requireTenant + requireRole)
       → 404 de API → SPA (Vite dev | dist estático) → errorHandler
```

## 2. Webhooks com corpo cru (`src/bootstrap/webhooks.ts`) — **achado de deriva nesta rodada**

`02-mapa-plataforma.md` (2026-08-14) registrava **4** webhooks pré-`express.json`. Verificação
direta do arquivo nesta rodada encontra **7** mounts, incluindo um conector não citado em nenhuma
auditoria lida para este documento:

| Rota                            | Router                         | Já documentado em auditoria anterior?                                                                              |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `/api/integrations/birth-voice` | `birthVoiceWebhookRoutes`      | sim                                                                                                                |
| `/api/integrations/3cx/webhook` | `threecxWebhookRouter`         | sim                                                                                                                |
| `/api/webhooks/voice-result`    | `voiceResultWebhookRoutes`     | sim                                                                                                                |
| `/api/webhooks/email`           | `emailReplyWebhookRoutes`      | sim (`product-truth-wave-1.md`)                                                                                    |
| `/api/webhooks/signature`       | `signatureStatusWebhookRoutes` | sim (`product-truth-wave-1.md`)                                                                                    |
| `/api/integrations/bitrix`      | `bitrixWebhookRoutes`          | sim                                                                                                                |
| `/api/integrations/chatwoot`    | `chatwootWebhookRoutes`        | **não** — não aparece em `02-mapa-plataforma.md`, `INVENTARIO_FUNCIONAL_COMPLETO.md` nem `product-truth-wave-1.md` |
| `/api/public/proposals`         | `crm360PublicRoutes`           | sim                                                                                                                |

**Achado C0-API-1 (novo, não bloqueador):** conector **Chatwoot** existe no código
(`chatwootWebhookRoutes`, montado antes do `express.json` — logo trata corpo cru/HMAC como os
demais webhooks reais) mas não está catalogado em nenhum inventário funcional lido. Não é
seguro classificá-lo como CORE/CONNECTOR/LEGACY sem que o Agente 06 (dono de Integrações)
confirme se está ativo, planejado ou remanescente de um experimento. Handoff aberto em §4.

Todos os 7 tratam corpo cru propositalmente para validação HMAC/assinatura em tempo constante —
nenhuma mudança sugerida aqui, só o registro do contrato para a Onda C1/C3 (Agente 15 —
Segurança Aplicada — já tem missão de auditar segredos/webhooks na Onda 6 do programa oficial).

## 3. Routers de negócio — prefixos agregados (`src/bootstrap/routes.ts`)

46 prefixos únicos encontrados via leitura direta do arquivo (o número "30 routers"/"40 prefixos"
citado em auditorias anteriores mede routers-arquivo, não prefixos de string — um mesmo router pode
responder a mais de um prefixo, por isso os três números não devem ser tratados como contraditórios
sem inspecionar caso a caso; não investigado a fundo nesta rodada C0 por não ser blocker):

```
/api/access-requests        /api/agent                   /api/agent-bus
/api/agents                 /api/analytics               /api/auth-extra
/api/automations            /api/bitrix                  /api/bug-reports
/api/cadence                /api/calendar/book           /api/calendar/booking-links
/api/capabilities           /api/commercial-intelligence /api/companies
/api/companies/market-intelligence                       /api/contacts
/api/copiloto-ia            /api/crm                     /api/crm/saved-views
/api/events                 /api/feature-flags           /api/gamification
/api/google                 /api/integrations/3cx        /api/integrations/birth-voice
/api/intelligence           /api/job-roles               /api/knowledge
/api/leads                  /api/lgpd                    /api/market-intelligence
/api/memory                 /api/mesa-tratamento         /api/module-access
/api/notifications          /api/notifications/stream    /api/playbook/objection-matrix
/api/playbook/qualification-matrix                       /api/prompts
/api/prospecting            /api/prospecting/tools       /api/role-supervisor
/api/team                   /api/usage                   /api/whatsapp
/api/workspace
```

**Achado C0-API-2 (novo, não bloqueador):** `/api/workspace` existe e não está catalogado em
nenhum documento lido — é o par de backend de `src/features/workspace/workspace.api.ts`, citado
como capacidade nova BT-044 em `BRAIN_TRUTH_MAP.md`. Relevante para a Onda C2 (Workspaces): já há
um contrato real para estender, não para inventar do zero.

**Achado C0-API-3 (novo, não bloqueador):** `/api/agents` (plural) e `/api/agent` (singular) e
`/api/agent-bus` e `/api/role-supervisor` são quatro prefixos distintos, todos no domínio de
runtime de agentes (Enxame). Isso é candidato natural a ficar sob um único domínio `CORE.Agents`
(ver `BRAIN_TRUTH_MAP.md` BT-015) — não renomear/mesclar agora; registrar como decisão de contrato
da Onda C1, dona: Agente 07 + Agente 13 (Enxame/Governança de Agentes de Runtime).

## 4. Handoffs abertos por este documento

- `.agents/handoffs/onda-c0/18-para-06-chatwoot-nao-catalogado.md` (normal) — confirmar se o
  conector Chatwoot está ativo, planejado, ou deve ser removido; ele já expõe webhook com corpo
  cru em produção potencial sem estar em nenhum inventário.
- `.agents/handoffs/onda-c0/18-para-00-agent-routes-fragmentadas.md` (normal) — quatro prefixos de
  rota (`/api/agent`, `/api/agents`, `/api/agent-bus`, `/api/role-supervisor`) candidatos a
  consolidação de contrato sob `CORE.Agents` na Onda C1.

## 5. O que este documento explicitamente não faz

- Não compara `docs/openapi.yaml` campo a campo com cada router (missão formal da Onda 8).
- Não audita autenticação/autorização por rota (parcialmente coberto por
  `docs/audits/product-truth-wave-1.md`, aprofundamento é da Onda C3 — Agente 15/01A).
- Não sugere qual naming final os domínios `CORE` devem ter — isso é o **Product Model**
  (`BIRTHUB_PRODUCT_MODEL.md`), não o Contract Map.
