# TENANT — Auditoria de Multi-Tenancy (Birth Hub 360º)

## Agent
TENANT (especialista em isolamento multi-tenant / organizationId / RLS / cross-tenant leak paths)

## Mission
Auditar a propagação de tenant (`organizationId`) ponta a ponta: autorização de API, queries de
banco, RLS (ou sua ausência), cache, filas, workers, chamadas de IA/agentes, RAG, storage de
arquivos, integrações, webhooks, billing, audit log e analytics. Buscar ativamente qualquer caminho
plausível de vazamento cross-tenant.

## Scope
Repositório inteiro, com foco em: `prisma/schema.prisma` (112 models), `prisma/migrations/*`
(RLS), `src/lib/prisma.ts`, `src/lib/tenant-prisma.ts`, `src/lib/async-context.ts`,
`src/shared/middlewares/*`, `src/lib/ai/*` (gateway, budget, checkpointer), `src/lib/queue/*`
(BullMQ/workers), `src/lib/search`, `src/lib/qdrant`, `src/lib/storage`,
`src/features/integrations/*` (Bitrix, WhatsApp, Slack, Stripe, Omie, 3CX, Birth Voice, Google),
`src/features/job-roles/*` (Agent Runtime/Agent Bus), `src/features/copiloto-ia/*`,
`src/features/lgpd/*`, `src/shared/services/dataSubjectErasure.service.ts`.

## Areas inspected
- Schema-wide organizationId coverage (94/112 models têm `organizationId` direto; os 18 restantes
  foram inspecionados um a um quanto à forma real de isolamento — FK para pai tenant-scoped,
  catálogo global legítimo, ou lacuna real).
- RLS no Postgres: `ENABLE`/`FORCE ROW LEVEL SECURITY` + `CREATE POLICY` em todas as migrations
  relevantes (`20260722020322_enable_rls`, `20260807100000_enable_rls_remaining_tables`,
  `20260801120000_tenant_scope_ai_memory_prompts_and_rls`,
  `20260825120000_scope_rls_bypass_to_bootstrap_allowlist`, `20260808183000_crm_suite_parity`,
  entre outras).
- Camada de aplicação: extensão `$allOperations` do Prisma global (`src/lib/prisma.ts`) que injeta
  `organizationId`, força `SET LOCAL app.current_tenant_id`, e a allowlist de bypass de RLS
  (`BYPASS_RLS_ALLOWED_MODELS`); e a extensão paralela `getTenantPrisma()`
  (`src/lib/tenant-prisma.ts` / `req.db`, ligada por `requireTenant`).
- Propagação de contexto: `AsyncLocalStorage` (`src/lib/async-context.ts`),
  `authenticateToken.ts` (fonte do `tenantId`/`role`), `requireRole`.
- IA/Agentes: `base.agent.ts`, `supervisor.agent.ts`, `sdrQualification.agent.ts`, `ops.agent.ts`
  (thread_id do LangGraph), `src/lib/ai/checkpointer.ts` (Postgres checkpointer sem RLS),
  `src/lib/ai/budget.ts` (circuit breaker global vs. por organização), `capabilityAuthorization
  .service.ts` e `agentBus.service.ts` (job-roles).
- Filas/Workers: `src/lib/queue/agent.worker.ts`, `swarmScheduler.worker.ts`,
  `bitrixSync.worker.ts`, `whatsappCommand.worker.ts`, `whatsappSignal.worker.ts`.
- Busca/Vetores: `src/lib/search/index.ts` (Meilisearch, filtro `organizationId`),
  `src/lib/qdrant/index.ts` (não conectado a nenhuma feature ainda).
- Storage de objetos: `src/lib/storage/index.ts` (S3-compatible) e seu único fluxo de
  write-then-read real (`copiloto-ia` — upload/transcrição de áudio).
- Integrações recém-adicionadas (commit `72f0bd40`): Slack, Stripe, Omie — rotas e services.
- Webhooks públicos sem JWT: Bitrix (`bitrix.webhook.ts`), Birth Voice
  (`birthVoice.webhook.ts`), assinatura de documento (`signatureStatus.webhook.ts`), booking
  público (`booking.routes.ts`), rastreio de proposta (`crm360Public.routes.ts`).
- LGPD: `dataSubjectErasure.service.ts` (erasure cross-model), `lgpd.routes.ts`.

## Files inspected
Aproximadamente 55 arquivos lidos/grepados diretamente (schema completo de 4565 linhas, ~15
migrations de RLS, os arquivos de infraestrutura de tenant listados acima, e os services/rotas de
Stripe/Slack/Omie/Copiloto IA/job-roles/LGPD citados nos achados).

## Executive summary
O isolamento multi-tenant deste repositório é, na média, **maduro e bem documentado** — muito mais
do que o típico neste estágio de projeto. Há RLS real no Postgres (`ENABLE` + `FORCE ROW LEVEL
SECURITY` + `CREATE POLICY`) cobrindo praticamente todas as tabelas com dado de tenant, uma
extensão de aplicação que injeta `organizationId` automaticamente em creates/updates, uma allowlist
de bypass de RLS estreita e comentada linha a linha (cada exceção documenta o motivo e o raio de
exposição), thread_id de LangGraph prefixado por tenant, filtro de tenant obrigatório no
Meilisearch, e um histórico de "ondas" anteriores que já caçaram e corrigiram bugs reais de RLS
(ver comentários extensos em `async-context.ts` e `prisma.ts` sobre um bug de `AsyncLocalStorage`
com Prisma Client lazy promises).

Dito isso, a auditoria encontrou **um caminho concreto de vazamento cross-tenant não mitigado**
(upload/transcrição de áudio do Copiloto IA aceita um `objectKey` de storage vindo do cliente sem
validar que pertence ao tenant/conversa do chamador) e **uma lacuna real de isolamento de
controle** (configuração global de IA, que afeta todos os tenants, pode ser escrita por qualquer
ADMIN de qualquer organização individual — não existe um papel de "super-admin de plataforma"
separado do papel `ADMIN` por tenant). Também há um conjunto de decisões de arquitetura já
CONHECIDAS e documentadas pela própria equipe como risco aceito (checkpointer do LangGraph sem
RLS, orçamento de IA parcialmente global) que valem re-registro formal aqui para rastreabilidade,
mas não são "achados novos".

Nenhuma tabela com dado de tenant real foi encontrada sem RLS habilitado. As duas exceções restantes
sem `organizationId` e sem RLS (`MarketIntelligenceDataset`/`Company`/`Municipality`) são
catálogos de dados públicos/de mercado, não dados de cliente — não representam vazamento.

## Critical
- **TENANT-001** — Upload/transcrição de áudio do Copiloto IA aceita `objectKey` de storage
  arbitrário do cliente, sem validar que pertence ao tenant/conversa do chamador — vazamento
  cross-tenant plausível de gravação de voz e sua transcrição. Ver detalhes em "Complete findings
  list".

## High
- **TENANT-002** — `PUT /api/intelligence/ai-settings` (config de IA GLOBAL, afeta todos os
  tenants) é gravável por qualquer usuário com papel `ADMIN` — que é um papel por-organização, não
  um papel de plataforma. Qualquer tenant tem, portanto, um caminho para alterar comportamento de
  IA de todos os outros tenants.
- **TENANT-003** — `KnowledgeDocument` e `AIEvaluation` (RAG legado / avaliação de IA) foram
  deixados com policy `bypass_only` (bloqueadas para tráfego normal) por não terem
  `organizationId` — comportamento correto hoje, mas é uma bomba-relógio: se qualquer código futuro
  passar a escrever nessas tabelas dentro de uma request autenticada normal (não em bypass), a
  escrita falha silenciosamente sob RLS ou (pior, se alguém "resolver" o erro adicionando bypass
  sem adicionar `organizationId`) abre uma tabela cross-tenant sem isolamento real.

## Medium
- **TENANT-004** — Orçamento mensal de IA tem dois tetos coexistindo: um por organização (correto)
  e um GLOBAL de plataforma (`AI_MONTHLY_BUDGET_USD`) que, quando configurado, bloqueia chamadas de
  IA de TODOS os tenants assim que a soma de todos ultrapassa o teto — mesmo tenants com orçamento
  próprio (`Organization.monthlyAiBudgetUsd`) longe do limite ficam bloqueados por consumo de
  outros tenants. Já documentado pela equipe como decisão consciente (AI-011), mas é um vetor real
  de "noisy neighbor" cross-tenant (negação de serviço de um tenant causada por outro).
- **TENANT-005** — Checkpointer do LangGraph (`src/lib/ai/checkpointer.ts`, tabelas
  `checkpoints`/`checkpoint_writes`/`checkpoint_blobs`) não tem RLS — o pacote fala SQL cru direto
  no pool `pg`, fora da extensão do Prisma. Isolamento depende inteiramente da disciplina de
  sempre prefixar `thread_id` com `${organizationId}:`. Confirmado que os 3 grafos que usam este
  checkpointer compartilhado (`supervisor.agent.ts`, `sdrQualification.agent.ts`, `ops.agent.ts`)
  fazem isso corretamente hoje, mas não há nenhuma trava estrutural (constraint, policy, teste de
  regressão dedicado) impedindo um quarto grafo futuro de esquecer o prefixo.
- **TENANT-006** — `AiEngineSetting` (mesma tabela do TENANT-002) tem uma RLS policy
  (`app_context_policy`) que só exige "alguma request autenticada" — não isola por tenant porque
  não há o que isolar (é config global por design). Isso é coerente com o desenho, mas significa
  que a única barreira real contra escrita cross-tenant-de-efeito é a checagem de role na rota
  (TENANT-002), não o banco.

## Low
- **TENANT-007** — `getTenantPrisma()`/`req.db` (`src/lib/tenant-prisma.ts`) é uma segunda camada
  de tenant-scoping por extensão do Prisma, paralela à extensão global já ativa em
  `src/lib/prisma.ts` (que já injeta `organizationId` e depende de RLS real). As duas camadas usam
  listas de modelos diferentes e não documentam explicitamente por que ambas existem — múltiplas
  fontes de verdade para a mesma responsabilidade aumentam a chance de uma divergir da outra no
  futuro sem que ninguém perceba (nenhum teste comparando as duas listas).
- **TENANT-008** — `EnrichmentLog`/`Note`/`TimelineEvent` (filhos sem `organizationId` próprio,
  isolados via subquery na tabela pai) dependem de a RLS policy do PAI nunca mudar sem que alguém
  lembre de revisar a policy do FILHO — é um acoplamento implícito entre migrations que só um
  comentário (já presente) previne, não uma trava de schema.

## Technical debt
- TD-TENANT: duas implementações de tenant-scoping via extensão Prisma
  (`src/lib/prisma.ts` global + `src/lib/tenant-prisma.ts`/`req.db`) coexistindo sem teste de
  paridade (TENANT-007).
- TD-TENANT: tabelas mortas/legadas mantidas em modo `bypass_only` (`AIEvaluation`,
  `KnowledgeDocument`) — corretas hoje, frágeis a mudanças futuras sem comentário forte o bastante
  para impedir reativação incorreta (TENANT-003).

## Implementation debt
- TENANT-001 é debt de implementação clássico: o contrato existe (`objectKey` gerado
  server-side com prefixo `organizationId`/`conversationId`), mas o passo seguinte
  (`completeAudioUpload`) não valida o dado contra esse contrato, quebrando a garantia que o
  próprio código já estabeleceu no passo anterior.

## Feature debt
- Nenhum achado de feature debt específico de tenancy além dos já listados (o RAG via
  Qdrant não está conectado a nenhuma feature — isso é discutido no domínio de IA/RAG, não aqui,
  mas relevante notar que enquanto Qdrant permanecer desconectado não há superfície de vazamento
  vetorial cross-tenant nesse componente específico).

## Bugs
- TENANT-001 (ver acima) é o único bug de tenancy com caminho de exploração concreto encontrado.

## Architecture
- Modelo de referência real e bem escolhido: RLS no Postgres como camada de fundo (fail-closed via
  `FORCE ROW LEVEL SECURITY`), com a extensão do Prisma como camada de conveniência/defesa em
  profundidade (injeta `organizationId`, nunca é a ÚNICA barreira). A allowlist de bypass é
  estreita e por modelo, não global — isso é uma decisão de arquitetura sólida.
  Contraponto arquitetural real: sistemas que não passam pelo Prisma (LangGraph checkpointer,
  BullMQ/Redis, Meilisearch, S3-compatible storage) não herdam RLS automaticamente — cada um foi
  auditado individualmente aqui e, com a exceção do storage do Copiloto IA (TENANT-001), a
  disciplina manual de sempre incluir `organizationId` no payload/filtro se sustenta hoje, mas é um
  padrão que depende de disciplina humana contínua, não de uma trava estrutural única.

## Security
- TENANT-001: vazamento cross-tenant de gravação de voz + transcrição via `objectKey` não validado.
- TENANT-002: escrita cross-tenant de efeito (config global de IA) por um papel que deveria ser
  local ao tenant.
- Pontos positivos de segurança confirmados: credenciais de integração (Bitrix, Stripe, Slack,
  Omie, etc.) são cifradas em repouso (`ENCRYPTED_MODEL_FIELDS`, AES-256-GCM); PII de `Contact`
  (email/telefone/whatsapp) é cifrada e decifrada de forma transparente inclusive em relações
  aninhadas; Meilisearch falha explicitamente em produção sem `MEILI_MASTER_KEY` (sem fallback
  para chave padrão insegura); storage S3-compatible falha explicitamente sem credenciais
  configuradas (sem fallback para `minioadmin/minioadmin`).

## Tests
- Existe pelo menos um teste de integração dedicado a RLS/bypass
  (`tests/integration/rls-bypass-allowlist.test.ts`, referenciado em comentário de
  `src/lib/prisma.ts`, provando a nível de banco que `Company` foi deliberadamente excluído da
  allowlist de bypass) e um teste dedicado a isolamento de tenant
  (`tests/integration/tenant-isolation-db001.test.ts`, referenciado em `async-context.ts`). Não foi
  encontrado teste equivalente cobrindo especificamente o fluxo `objectKey` do Copiloto IA
  (TENANT-001) nem um teste de paridade entre as duas camadas de tenant-scoping do Prisma
  (TENANT-007) — gaps de cobertura, não simplesmente ausência total de testes de tenancy.

## Integration
- Bitrix, Birth Voice, assinatura de documento e booking público: todos usam o mesmo padrão de
  "token/id opaco não adivinhável = credencial" para resolver o tenant antes de existir uma sessão
  — padrão consistente e documentado em cada bypass da allowlist.
- Slack/Stripe/Omie (integração nova, commit `72f0bd40`): todas as rotas usam
  `organizationId` de `req.user` e todos os lookups por `connectionId` usam `findFirst({ where: {
  id, organizationId } })` — sem achado de tenancy nestas três integrações.

## Product
- O único ponto de produto onde a fronteira de tenant é intencionalmente cruzada por design (não
  por bug) é a configuração global de IA (`AiEngineSetting`) — mas o controle de quem pode cruzá-la
  (TENANT-002) não reflete essa intenção de produto.

## Mock/Fake/Placeholder
- Nenhum mock/fake de tenancy encontrado — toda a lógica de isolamento auditada é código real
  rodando contra Postgres real.

## Dead/Orphan code
- `KnowledgeDocument`/`AIEvaluation`: confirmado (por comentário do próprio time, coerente com o
  que esta auditoria também não encontrou) zero chamadas Prisma no código server-side — tabelas
  mortas, RLS bloqueando por padrão até serem migradas ou removidas (ver TENANT-003).
- Qdrant (`src/lib/qdrant/index.ts`): client registrado, zero uso em qualquer feature — não é um
  risco de tenancy hoje (nada para vazar), mas é órfão.

## Quick wins
- Validar, em `CopilotoIaUseCases.completeAudioUpload`, que `input.objectKey` começa com
  `copiloto-ia/${organizationId}/${id}/` antes de persistir — fecha TENANT-001 com uma checagem de
  string, sem mudar contrato de API nem schema.
- Trocar `requireRole(['ADMIN'])` por um novo `requirePlatformOperator`-like guard (o repositório já
  tem `src/shared/middlewares/requirePlatformOperator.ts` — verificar se serve para este caso ou se
  precisa de um papel novo) na rota `PUT /api/intelligence/ai-settings`, fechando TENANT-002 sem
  tocar em lógica de negócio.
- Adicionar um teste de integração mínimo replicando `rls-bypass-allowlist.test.ts` para o fluxo de
  `objectKey` do Copiloto IA (upload por org A, tentativa de `completeAudioUpload` com objectKey de
  org B deve falhar) — fecha o gap de cobertura do TENANT-001 permanentemente.

## Structural problems
- Nenhum problema estrutural de fundação (a base de RLS + extensão Prisma é sólida). O problema
  estrutural real é a ausência de uma "terceira via" de autorização (papel de plataforma distinto
  de papel de tenant) para as poucas superfícies de config verdadeiramente globais
  (`AiEngineSetting`, e potencialmente `FeatureFlag` — não auditado a fundo neste domínio, mas seguem
  o mesmo padrão de "catálogo global" e merecem a mesma pergunta: quem pode escrever nelas hoje?).

## Needs verification
- **TENANT-009 (NEEDS_VERIFICATION)** — Não foi possível, dentro do escopo desta auditoria estática,
  confirmar se `FeatureFlag` (mesmo padrão de "catálogo global sem organizationId" de
  `AiEngineSetting`) tem alguma rota de escrita e, se tiver, qual role a protege. Vale uma checagem
  dedicada análoga ao TENANT-002.
- **TENANT-010 (NEEDS_VERIFICATION)** — O catálogo normalizado de 392 agentes
  (`src/features/job-roles/catalog/agents.normalized.json`, seed via
  `scripts/seed-multi-cargo.ts`) não foi auditado quanto a se algum campo do JSON de origem poderia
  ser interpretado como dado por-tenant e acabar seedado como se fosse catálogo global (ou
  vice-versa) — fora do escopo de tempo desta rodada, mas é uma superfície grande (8000+ linhas)
  que outro domínio (AGENT ou DATA) deveria revisar.

## Complete findings list

### TENANT-001 — Upload de áudio do Copiloto IA aceita `objectKey` de storage não validado (cross-tenant leak)
- **Categoria:** TD-TENANT + TD-SEC
- **Severidade:** CRITICAL
- **Prioridade:** P0
- **Confiança:** MEDIUM (caminho de código confirmado; exploração real depende de o atacante
  conhecer/adivinhar um `objectKey` de outro tenant, que inclui um UUID aleatório — não é
  trivialmente adivinhável, mas nada no código impede a tentativa nem detecta o abuso)
- **Status:** CONFIRMED
- **Evidência:**
  - `src/features/copiloto-ia/presentation/CopilotoIaController.ts:247` gera
    `objectKey = \`copiloto-ia/${organizationId}/${conversationId}/${randomUUID()}.${extension}\``
    no endpoint `requestAudioUploadUrl` (o objectKey "correto" para aquele tenant/conversa).
  - `src/features/copiloto-ia/presentation/CopilotoIaController.ts:262-267`
    (`completeAudioUpload`) aceita `objectKey: requireString(body, 'objectKey')` — **direto do
    corpo da requisição**, sem comparar com o prefixo esperado.
  - `src/features/copiloto-ia/application/CopilotoIaUseCases.ts:207-215`
    (`completeAudioUpload`) só valida `if (!input.objectKey.trim())` — string não-vazia, nada mais
    — antes de chamar `this.repository.updateConversationAudio(organizationId, id, input)`, que
    persiste esse `objectKey` como `audioObjectKey` da conversa
    (`src/features/copiloto-ia/infra/PrismaCopilotoIaRepository.ts:230`).
  - `src/features/copiloto-ia/jobs/transcribeConversation.worker.ts:150` depois chama
    `getDownloadUrl(state.audioObjectKey)` (`src/lib/storage/index.ts:54`) — que gera uma URL
    assinada de download para **qualquer key existente no bucket**, sem checar a que tenant ela
    pertence (o storage layer é genérico por design, não tem conceito de tenant).
- **Root cause:** o contrato implícito "objectKey sempre pertence ao tenant/conversa que o gerou"
  é estabelecido só no lado que GERA a URL de upload (`requestAudioUploadUrl`), mas nunca é
  reforçado no lado que CONFIRMA o upload (`completeAudioUpload`) — quebra de simetria entre
  produtor e consumidor do mesmo dado.
- **Expected:** `completeAudioUpload` deveria rejeitar qualquer `objectKey` que não comece
  exatamente com `copiloto-ia/${organizationId}/${id}/`.
- **Actual:** qualquer string não-vazia é aceita e persistida como `audioObjectKey` da conversa,
  depois lida e transcrita como se fosse o áudio legítimo daquela conversa/tenant.
- **Impacto de negócio:** se um tenant malicioso ou comprometido descobrir/adivinhar (ou vazar por
  outro canal — log, erro, suporte) o `objectKey` de uma gravação de OUTRO tenant, pode fazer o
  worker de transcrição do Copiloto IA baixar, transcrever e anexar esse áudio/transcrição à SUA
  PRÓPRIA conversa — um vazamento de dado de voz (potencialmente contendo PII de terceiros, dado o
  contexto de LGPD já tratado extensivamente no mesmo módulo) entre organizações clientes
  distintas.
- **User impact:** cliente A pode obter conteúdo de gravação/transcrição pertencente ao cliente B
  sem autorização.
- **Files:**
  - `src/features/copiloto-ia/presentation/CopilotoIaController.ts`
  - `src/features/copiloto-ia/application/CopilotoIaUseCases.ts`
  - `src/features/copiloto-ia/jobs/transcribeConversation.worker.ts`
  - `src/lib/storage/index.ts`
- **Suggested resolution:** em `completeAudioUpload` (use case), validar
  `input.objectKey.startsWith(\`copiloto-ia/${organizationId}/${id}/\`)` e rejeitar com 400/403
  caso contrário; considerar também restringir a extensão/formato aceito (já existe uma allowlist
  implícita do lado do upload, mas não do lado da confirmação).
- **Effort:** XS

### TENANT-002 — Config global de IA (`AiEngineSetting`) gravável por ADMIN de qualquer tenant individual
- **Categoria:** TD-TENANT + TD-AUTH
- **Severidade:** HIGH
- **Prioridade:** P1
- **Confiança:** HIGH
- **Status:** CONFIRMED
- **Evidência:**
  - `src/features/intelligence/routes/intelligence.routes.ts:582-586`: comentário do próprio
    código diz *"Config global de IA (sem organizationId — afeta todos os tenants), então só ADMIN
    grava."*, protegido só por `requireRole(['ADMIN'])`.
  - `src/shared/middlewares/authenticateToken.ts:68-72`: `role` vem de `User.role`
    (`ADMIN`/`GESTOR`/`CLOSER`/`SDR`/`VISUALIZADOR`), um campo **por usuário dentro de uma
    organização** — não existe um papel de plataforma separado (o próprio
    `src/shared/middlewares/authorization.ts:5-10` documenta que um sistema anterior de
    `SUPER_ADMIN`/`TENANT_OWNER` foi removido por nunca ter sido conectado a nenhuma rota).
  - `prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql:143-164`
    (`AiEngineSetting`) confirma no schema que a tabela não tem `organizationId` e a RLS policy
    (`app_context_policy`) só exige "alguma sessão autenticada", delegando a autorização real
    inteiramente à rota.
- **Root cause:** o modelo de RBAC do produto tem só um nível de papel (por-tenant), mas existe
  pelo menos uma superfície de configuração genuinamente global — a rota reusou o papel errado
  (por-tenant) para proteger um recurso de escopo de plataforma.
- **Expected:** só um operador de plataforma (não um cliente comum, mesmo que ADMIN da própria
  organização) deveria poder alterar provider/modelo/temperatura padrão de IA para todos os
  tenants.
- **Actual:** qualquer usuário `ADMIN` de qualquer organização cliente pode alterar essa config
  para a plataforma inteira via `PUT /api/intelligence/ai-settings`.
- **Impacto de negócio:** um cliente (mal-intencionado, com uma conta comprometida, ou só por erro
  operacional) pode degradar a qualidade/custo/comportamento de IA de TODOS os outros clientes da
  plataforma.
- **Files:** `src/features/intelligence/routes/intelligence.routes.ts`,
  `src/shared/middlewares/authenticateToken.ts`, `src/shared/middlewares/authorization.ts`.
- **Suggested resolution:** usar (ou estender) `src/shared/middlewares/requirePlatformOperator.ts`
  (já existe no repo — não foi confirmado neste domínio se cobre exatamente este caso; ver
  TENANT-009-adjacent) em vez de `requireRole(['ADMIN'])` nesta rota especificamente.
- **Effort:** S

### TENANT-003 — `KnowledgeDocument`/`AIEvaluation` bloqueadas por `bypass_only`, sem trava contra reativação incorreta
- **Categoria:** TD-TENANT + TD-DEAD
- **Severidade:** HIGH
- **Prioridade:** P2
- **Confiança:** HIGH
- **Status:** CONFIRMED
- **Evidência:** `prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql:107-141`
  — ambas as tabelas têm policy `bypass_only_policy` (`USING (current_setting('app.bypass_rls',
  TRUE) = 'on')`), correta apenas enquanto ninguém escrever nelas fora de bypass.
- **Root cause:** tabelas legadas sem `organizationId`, mantidas no schema sem uso real
  (confirmado: zero chamadas Prisma no código server-side).
- **Expected:** tabela morta deveria ser removida (migration de drop) ou ganhar `organizationId`
  real antes de qualquer novo uso.
- **Actual:** permanece no schema com uma policy que só funciona corretamente enquanto o código
  nunca tentar usá-la fora de bypass — um desenvolvedor futuro que reative a feature RAG legada sem
  reler este comentário de migration pode reintroduzir uma tabela cross-tenant sem isolamento, ou
  simplesmente quebrar em produção (escrita bloqueada silenciosamente pela RLS).
- **Files:** `prisma/schema.prisma` (models `KnowledgeDocument`, `AIEvaluation`),
  `prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql`.
- **Suggested resolution:** decidir explicitamente — remover as tabelas (migration de drop) ou
  documentar em `prisma/schema.prisma` com um comentário `///` de alerta equivalente ao já presente
  na migration, para quem olha só o schema (não as migrations) também seja avisado.
- **Effort:** S

### TENANT-004 — Orçamento de IA global pode causar negação de serviço cross-tenant
- **Categoria:** TD-TENANT + TD-AI
- **Severidade:** MEDIUM
- **Prioridade:** P2
- **Confiança:** HIGH
- **Status:** CONFIRMED
- **Evidência:** `src/lib/ai/budget.ts:9-21` e `:280-297` (`assertAiBudgetNotExceeded`) — o teto
  por organização é checado primeiro, mas se não excedido, o teto GLOBAL (`AI_MONTHLY_BUDGET_USD`,
  soma de TODAS as organizações) ainda pode bloquear a chamada.
- **Root cause:** decisão de produto documentada (AI-011) mantida por compatibilidade após a
  adição do teto por-organização (DEC-09/onda 42), sem revisão de se o teto global ainda faz
  sentido coexistindo com tetos individuais.
- **Expected/Actual:** um tenant com orçamento próprio sobrando pode ser bloqueado por consumo de
  outros tenants — efeito "noisy neighbor" real, não hipotético.
- **Files:** `src/lib/ai/budget.ts`.
- **Suggested resolution:** revisar se o teto global ainda é necessário agora que existe teto por
  tenant; se for mantido (ex.: proteção de custo da própria empresa operadora da plataforma),
  documentar isso como uma escolha de negócio explícita e monitorada, não só como debt técnico.
- **Effort:** S (decisão) / M (se decidir remover e precisar de migração de config)

### TENANT-005 — Checkpointer do LangGraph sem RLS, isolamento só por convenção de prefixo
- **Categoria:** TD-TENANT + TD-AI
- **Severidade:** MEDIUM
- **Prioridade:** P2
- **Confiança:** HIGH (risco já documentado pelo próprio time; achado é o re-registro formal +
  confirmação de que a convenção é seguida hoje pelos 3 chamadores existentes)
- **Status:** CONFIRMED
- **Evidência:** `src/lib/ai/checkpointer.ts:26-31` (comentário do próprio código: *"SEM RLS: as
  tabelas do checkpointer não passam pela extensão do Prisma... Isolamento de tenant aqui é só o
  prefixo de thread_id"*); confirmado em `supervisor.agent.ts:690,728`,
  `sdrQualification.agent.ts:214`, `ops.agent.ts:182` que todos os 3 usos reais prefixam
  corretamente `${organizationId}:${sessionId}`.
- **Root cause:** o pacote `@langchain/langgraph-checkpoint-postgres` fala SQL cru fora da
  extensão do Prisma, então não herda RLS automaticamente.
- **Suggested resolution:** um teste de regressão dedicado (grep/lint customizado, ou teste de
  integração) que falhe o build se um novo grafo compilar com este `checkpointer` compartilhado sem
  usar um `thread_id` prefixado — hoje a garantia é só revisão de código humana.
- **Files:** `src/lib/ai/checkpointer.ts`.
- **Effort:** S

### TENANT-006 — `AiEngineSetting` RLS policy não isola por tenant (por design, mas vale registrar o porquê)
- **Categoria:** TD-TENANT
- **Severidade:** LOW
- **Prioridade:** P3
- **Confiança:** HIGH
- **Status:** CONFIRMED
- **Evidência:** ver TENANT-002. Registrado separadamente porque é a raiz de banco que torna
  TENANT-002 possível — mesmo corrigindo a rota, a policy de banco por si só não impediria uma
  segunda rota futura de repetir o mesmo erro.
- **Files:** `prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql`.
- **Effort:** N/A (documentação/consciência, não código)

### TENANT-007 — Duas implementações paralelas de tenant-scoping via extensão Prisma
- **Categoria:** TD-TENANT + TD-ARCH
- **Severidade:** LOW
- **Prioridade:** P3
- **Confiança:** MEDIUM
- **Status:** CONFIRMED (existência de duas implementações) / NEEDS_VERIFICATION (se já divergiram
  na prática)
- **Evidência:** `src/lib/prisma.ts` (`tenantModels` — 12 modelos) vs. `src/lib/tenant-prisma.ts`
  (`MODELS_WITH_ORGANIZATION_ID` — calculado dinamicamente do DMMF, ~94 modelos). Ambos são usados
  em produção (`req.db` setado por `requireTenant` em 25 arquivos de rota/serviço).
- **Root cause:** duas gerações de solução para o mesmo problema, a mais nova (dinâmica, via DMMF)
  não substituiu a mais antiga (lista fixa de 12 modelos).
- **Suggested resolution:** decidir uma fonte de verdade única, ou documentar explicitamente por
  que ambas continuam necessárias (ex.: a lista fixa em `prisma.ts` também dispara audit
  log/soft-delete/criptografia — responsabilidades a mais que `tenant-prisma.ts` não replica) —
  isso já pode ser a explicação real, mas não está escrito em nenhum dos dois arquivos.
- **Files:** `src/lib/prisma.ts`, `src/lib/tenant-prisma.ts`.
- **Effort:** M

### TENANT-008 — Acoplamento implícito entre RLS de tabela-filha e tabela-pai
- **Categoria:** TD-TENANT
- **Severidade:** LOW
- **Prioridade:** P4
- **Confiança:** MEDIUM
- **Status:** CONFIRMED
- **Evidência:** `Note`/`TimelineEvent` (via `Lead`), `EnrichmentLog` (via `Company`),
  `session`/`account` (via `user`) — todas usam subquery `leadId/companyId/userId IN (SELECT id
  FROM Pai WHERE organizationId = ...)`. Se a policy do pai mudar de forma incompatível (ex.: o pai
  ganhar soft-delete visível via RLS, ou trocar de nome de coluna), o filho quebra silenciosamente
  sem que a migration do filho precise mudar.
- **Suggested resolution:** nenhuma ação imediata — registrar como padrão conhecido a revisar
  sempre que uma migration tocar a policy de `Lead`, `Company` ou `user`.
- **Files:** `prisma/migrations/20260722020322_enable_rls/migration.sql`,
  `prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql`.
- **Effort:** N/A

### TENANT-009 — `FeatureFlag` (catálogo global) — autorização de escrita não verificada (NEEDS_VERIFICATION)
- **Categoria:** TD-TENANT + TD-AUTH
- **Severidade:** MEDIUM (potencial — não confirmado)
- **Prioridade:** P2
- **Confiança:** LOW
- **Status:** NEEDS_VERIFICATION
- **Evidência:** `prisma.ts:157-165` documenta `FeatureFlag` como catálogo global sem
  `organizationId`, sincronizado no boot — mesmo padrão de `AiEngineSetting` que gerou TENANT-002.
  Não foi auditada, dentro do tempo deste domínio, se existe alguma rota de escrita de
  `FeatureFlag` acessível a um usuário comum/ADMIN de tenant, e se sim, com qual guard.
- **Suggested resolution:** repetir a checagem feita para TENANT-002 especificamente em rotas de
  `FeatureFlag`.
- **Files:** a determinar — buscar por `featureFlagsService` / rotas de feature flag.
- **Effort:** XS (só verificação)

### TENANT-010 — Catálogo de 392 agentes (job-roles) — risco de dado por-tenant misturado a catálogo global (NEEDS_VERIFICATION)
- **Categoria:** TD-TENANT + TD-AGENT
- **Severidade:** LOW (potencial — não confirmado)
- **Prioridade:** P3
- **Confiança:** LOW
- **Status:** NEEDS_VERIFICATION
- **Evidência:** `AgentDefinition`/`AgentVersion`/`CapabilityDefinition`/`AgentCapabilityGrant` são
  corretamente globais (sem `organizationId`, por design — catálogo de sistema). O arquivo de
  origem do seed (`agents.normalized.json`, 8000+ linhas) não foi lido linha a linha nesta
  auditoria; não há confirmação de que nenhum campo desse JSON carregue um valor que deveria ser
  por-tenant (ex.: um `organizationId` de exemplo/teste esquecido no dado de seed).
- **Suggested resolution:** revisão pontual do JSON de seed por outro domínio (AGENT/DATA) com mais
  orçamento de tempo para isso.
- **Files:** `src/features/job-roles/catalog/agents.normalized.json`,
  `scripts/seed-multi-cargo.ts`.
- **Effort:** XS (só verificação)
