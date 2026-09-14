# RAG — Auditoria de Débito Técnico/Funcional

## Agent

RAG (Retrieval-Augmented Generation / Knowledge Base) — auditoria de domínio dentro da auditoria
multi-domínio de débito técnico do monorepo Birth Hub 360.

## Mission

Auditar toda capacidade de RAG/base de conhecimento do produto: ingestão, parsing, chunking,
embedding, indexação, banco vetorial, metadados, isolamento de tenant, busca, reranking,
citações, permissões, ciclo de vida do documento, reindexação, exclusão, versionamento, qualidade
de recuperação e montagem de contexto — traçando a cadeia real UI → API → serviço → banco/vetor →
IA, não assumindo que uma tela ou endpoint existente significa uma feature funcionando.

## Scope

Escopo real inspecionado (não limitado à pasta `src/features/knowledge/`):

- `src/features/knowledge/` — módulo real de Base de Conhecimento (ingestão, chunking, busca
  híbrida, reranking, copiloto técnico, rotas, componentes de UI).
- `src/lib/ai/gateway/embeddings.ts`, `src/lib/ai/local-embeddings.ts` — geração de embeddings
  (provedor local via `@xenova/transformers` vs. gateway legado via LiteLLM).
- `src/lib/ai/vectorStore.ts`, `src/features/intelligence/services/vector.service.ts`,
  `src/features/intelligence/services/vector-search.service.ts` — consumidores de RAG usados por
  agentes de IA (SDR outbound, ferramenta `search_playbook` do enxame, `GET
/api/intelligence/search`).
- `src/lib/qdrant/index.ts`, `src/lib/ai/memory/mem0.ts` — segunda pilha de infraestrutura
  vetorial (Qdrant) e memória de longo prazo de agente (mem0), fora do pipeline
  `Document`/`DocumentChunk`.
- `src/lib/search/index.ts`, `src/lib/queue/search.queue.ts` — Meilisearch (motor de busca
  full-text usado por `companies`/`leads`, e também referenciado — de forma diferente — pela Base
  de Conhecimento).
- `prisma/schema.prisma` (models `Document`, `DocumentChunk`) e as migrations de RLS relacionadas.
- Testes: `src/features/knowledge/**/__tests__/*`, `tests/integration/knowledge-*.test.ts`,
  `tests/unit/features/knowledge/*`, `tests/unit/lib/ai/vectorStore.test.ts`.
- `.claude/PILOTS.md` (Piloto 019 — Knowledge Base — e a "Onda — Resolução paralela" que o
  complementou) e comentários `RAG-001` já existentes no próprio código, para não redescobrir o que
  já foi corrigido.

Fora do escopo desta auditoria (mencionados só de passagem, quando tocam a mesma infraestrutura de
embedding): `lookalike-scoring.service.ts` (embedding de perfil de empresa para "negócios
parecidos", CRM/Prospecting) e `src/features/job-roles/services/memory.service.ts` (memória de
aprendizado do Agent Runtime — é 100% Prisma `findMany` estruturado, sem embedding/vetor, portanto
não é RAG).

## Areas inspected

1. Ingestão (texto colado, upload de arquivo, extração de PDF/DOCX/HTML/texto puro).
2. Chunking (estratégia hierárquica parágrafo → frase → corte bruto, overlap, limites).
3. Geração de embeddings (provedor local vs. gateway legado, dimensão, cache, fallback).
4. Armazenamento vetorial (pgvector, coluna `Unsupported("vector(768)")`, índice IVFFlat).
5. Busca híbrida (RRF entre vetorial + full-text Postgres + branch opcional Meilisearch).
6. Reranking via LLM (DEC-11) e citações verificáveis (Copiloto Técnico RAG).
7. Isolamento de tenant (RLS dupla camada + filtro explícito) em todo o pipeline.
8. Ciclo de vida do documento (criar, editar/reindexar, excluir, revetorizar, versão/freshness).
9. Consumidores de RAG fora do módulo (agentes do enxame de IA, `vectorStore`, `VectorService`).
10. Segunda pilha vetorial (Qdrant) e memória de agente (mem0) — uso real vs. declarado.
11. Cobertura de teste do pipeline de RAG (unitário, integração, isolamento de tenant).

## Files inspected

Aproximadamente 40 arquivos lidos integralmente ou em profundidade (não uma contagem de grep):
`ingestion.service.ts`, `search.service.ts`, `chunking.ts`, `vector-support.ts`,
`knowledge.routes.ts`, `knowledge.api.ts`, `knowledge.types.ts`, `services/reranker.service.ts`,
`services/knowledge-copilot.service.ts`, `components/Base.tsx` (leitura parcial dirigida por
grep), `src/lib/ai/gateway/embeddings.ts`, `src/lib/ai/local-embeddings.ts`,
`src/lib/ai/vectorStore.ts`, `src/features/intelligence/services/vector.service.ts`,
`src/features/intelligence/services/vector-search.service.ts`,
`src/features/intelligence/tools/playbookTool.ts`, `src/lib/qdrant/index.ts`,
`src/lib/ai/memory/mem0.ts`, `src/lib/search/index.ts`, `src/lib/queue/search.queue.ts`,
`src/lib/prisma.ts` (trecho de middleware de auditoria/fila de busca),
`src/features/intelligence/routes/ai-suite.routes.ts` (rota do copiloto),
`src/features/intelligence/components/AISuiteHub.tsx`, `src/features/intelligence/agents/ops.agent.ts`,
`prisma/schema.prisma` (models `Document`/`DocumentChunk`/`AgentMemory`),
`prisma/migrations/20260731170000_knowledge_base_tenant_scope/migration.sql`,
`tests/integration/knowledge-rag-tenant-isolation.test.ts`,
`tests/integration/knowledge-copilot-citation.test.ts`, `.env.example`, `.claude/PILOTS.md`
(trechos do Piloto 019 e da "Onda — Resolução paralela"), `charts/prospector-atlas/values.yaml`,
`litellm-config.yaml`, `package.json`. Grep sistemático em `src/` inteiro por
`qdrant|embedding|rag|vector|chunk|meilisearch|knowledge_chunks`.

## Executive summary

O módulo de RAG real do produto (`Document`/`DocumentChunk`, `src/features/knowledge/`) é, ao
contrário do padrão comum encontrado em auditorias deste tipo, **substancialmente maduro e já
auto-corrigido em ciclos anteriores**: existe ingestão real com chunking hierárquico e overlap,
embeddings locais (modelo multilíngue, sem dependência de rede/chave), armazenamento em pgvector
com índice IVFFlat, busca híbrida real (RRF entre vetorial e full-text em português, com fallback
degradado explícito quando o provedor de embeddings ou o pgvector estão fora do ar), reranking
opcional via LLM com fail-safe, citações estruturalmente verificadas (o LLM nunca escreve o nome
de uma fonte — só aponta um índice que o servidor resolve de volta para o `SearchHit` real),
isolamento de tenant com RLS `FORCE` + filtro explícito redundante, e testes de integração
dedicados a isolamento cross-tenant e a citação verdadeira. Um achado histórico crítico de RAG
(`RAG-001` no próprio código: dois pipelines de embedding paralelos e conflitantes — um real
`Document`/`DocumentChunk` e um morto `KnowledgeChunk` sem nenhum chamador de ingestão) já foi
identificado e corrigido em ondas anteriores, com o pipeline morto removido do schema e os três
consumidores (`vectorStore`, `VectorService`, `VectorSearchService`) unificados sobre o pipeline
real — confirmado por teste de integração dedicado.

Isso não significa que o domínio esteja livre de débito. Esta auditoria encontrou um conjunto de
problemas reais, não documentados em `.claude/PILOTS.md` nem em comentário `RAG-00X` existente:

1. Um segundo caminho de busca full-text (Meilisearch, índice `knowledge_chunks`) é ativamente
   documentado no `.env.example` como uma feature real da Base de Conhecimento, mas **nenhum
   código no repositório inteiro cria esse índice ou grava um `DocumentChunk` nele** — a fila de
   indexação do Meilisearch (`searchQueue`) só é alimentada para os models `Company`/`Lead`. Ligar
   a env var documentada não ativa busca real nenhuma; na melhor hipótese é uma chamada de rede
   morta a cada busca da Base de Conhecimento, e o código de resposta desse ramo fabrica
   `similarity`/`score`/`matchedBy` (nunca calculados de verdade) que ativariam silenciosamente no
   dia em que alguém "corrigir" a indexação sem reler esse trecho.
2. Uma segunda capacidade de RAG genuína e paralela — memória de longo prazo de agente via
   `mem0`/Qdrant (`src/lib/ai/memory/mem0.ts`) — está com o lado de escrita (`agentMemory.add`)
   **sem nenhum chamador em todo o app**, tornando a única leitura real (`ops.agent.ts`, agente de
   produção do enxame) uma busca vetorial que sempre devolve vazio, a cada turno, silenciosamente.
   O próprio arquivo se descreve como a correção de um gap documentado em `PRODUCT_EXPERIENCE.md`
   ("AIDockWidget e useAssistantChat não lembram contexto entre sessões") — mas foi acoplado a um
   agente diferente (Ops, do enxame comercial) que nunca escreve memória nenhuma, então o gap
   original permanece sem solução real.
3. Um risco de configuração latente (não disparado por nenhum ambiente real deste repositório, mas
   real no código): o caminho legado de embeddings via gateway (`EMBEDDINGS_PROVIDER≠local`) não
   valida a dimensão do vetor devolvido contra a coluna `vector(768)`, e o modelo default
   documentado no `.env.example` para esse caminho (`text-embedding-3-small`) tipicamente devolve
   1536 dimensões — uma falha de INSERT no Postgres não capturada pelo tratamento de "falha de
   embedding" já existente, que abortaria a ingestão inteira em vez de degradar.
4. Não existe nenhuma ferramenta de reindexação em massa para migrar o corpus inteiro após uma
   troca de modelo de embedding — só reparo pontual de vetores nulos.
5. O cliente Qdrant é uma segunda pilha vetorial paga (custo operacional, dependência) sem nenhuma
   feature plugada — o pgvector é quem faz 100% da busca vetorial real do produto, o que contradiz
   a descrição do stack ("Qdrant para busca vetorial") usada no discovery desta auditoria.
6. Não há teste unitário dedicado ao motor de fusão (`SearchService.fuse`, RRF) nem ao ramo
   Meilisearch — só um teste de integração de isolamento de tenant que nunca configura
   `MEILISEARCH_URL`, então nunca exercitou o achado nº 1 acima.

Nenhum desses achados é uma falha de isolamento de tenant (essa parte está bem coberta) nem um caso
de "tela sem backend" — são gaps de integração/consistência entre subsistemas que compartilham a
mesma infraestrutura de IA, e uma feature de memória de agente que parece "ligada" mas nunca
recebe escrita.

## Critical

Nenhum achado desta auditoria atinge o critério de CRITICAL (vazamento cross-tenant confirmado,
perda de dado, ou funcionalidade central de RAG quebrada). O isolamento de tenant do pipeline real
foi verificado com evidência de teste de integração passando (RLS + filtro explícito).

## High

Nenhum achado atingiu HIGH nesta auditoria — os problemas reais encontrados são de consistência de
configuração e de uma feature paralela de memória de agente nunca escrita, não de quebra do
pipeline principal de RAG (que está ativo e funcional para a Base de Conhecimento).

## Medium

- **RAG-001** — Índice Meilisearch `knowledge_chunks` da Base de Conhecimento nunca é criado nem
  populado; a env var documentada para ativá-lo não ativa retrieval real nenhum.
- **RAG-002** — Memória de longo prazo de agente via mem0/Qdrant tem escrita (`add`) sem nenhum
  chamador; a única leitura de produção (`ops.agent.ts`) sempre recebe lista vazia.

## Low

- **RAG-003** — Caminho legado de embeddings via gateway sem validação de dimensão contra
  `vector(768)`; risco latente, não disparado por nenhuma configuração real do repositório
  (NEEDS_VERIFICATION quanto a impacto em produção, já que nenhum ambiente configurado usa esse
  caminho hoje).
- **RAG-004** — Sem ferramenta de reindexação em massa para migração de modelo de embedding.
- **RAG-006** — Sem teste unitário dedicado ao motor de fusão RRF/branch Meilisearch de
  `SearchService`.
- **RAG-007** — Citações do Copiloto Técnico RAG só são visíveis como JSON cru no console de teste
  "AI Suite Hub", sem ponto de entrada a partir da própria tela da Base de Conhecimento (achado já
  registrado como "fora de escopo" no Piloto 019 — reafirmado aqui com o estado atual, não é
  descoberta nova).
- **RAG-008** — `GET /api/knowledge` (listagem de documentos) não pagina; devolve o tenant inteiro
  de uma vez.

## Technical debt

- **RAG-001**, **RAG-003**, **RAG-004**, **RAG-005** (ver Mock/Fake/Placeholder e Dead/Orphan code
  abaixo para o detalhe de cada um).

## Implementation debt

- **RAG-002**: a implementação existe (client mem0, `add`/`search`/`formatForPrompt`/`deleteUser`,
  integração real dentro do prompt do Ops agent) mas está estruturalmente incompleta — falta o
  lado de escrita em qualquer ponto do produto.
- **RAG-003**: a validação de dimensão de embedding existe no caminho local
  (`local-embeddings.ts:EMBEDDING_DIMENSIONS`) mas não foi replicada no caminho gateway
  (`gateway/embeddings.ts`), uma assimetria de implementação entre os dois provedores do mesmo
  contrato.

## Feature debt

- **RAG-002**: o gap de produto que `mem0.ts` afirma resolver ("IA não lembra contexto entre
  sessões", `AIDockWidget`/`useAssistantChat`) continua sem solução real — a feature foi construída
  para o consumidor errado.
- **RAG-001**: busca full-text dedicada da Base de Conhecimento (mais rápida que o full-text do
  Postgres, conforme o próprio comentário do código: "engine open-source ultrarrápida <10ms") nunca
  chega a existir de fato, apesar de estar documentada como configurável.

## Bugs

- **RAG-003** (latente/condicional): dimensão de embedding não validada no caminho gateway poderia
  quebrar `INSERT ... ::vector` com erro não tratado como "falha de embedding", abortando a
  ingestão inteira em vez de degradar — comportamento inconsistente com o resto do módulo, que é
  desenhado para nunca falhar a ingestão por causa do provedor de embeddings.

## Architecture

- Três consumidores de RAG fora do módulo (`vectorStore`, `VectorService`, `VectorSearchService`)
  já foram corretamente unificados sobre `searchService.hybridSearch` (achado histórico `RAG-001`
  do próprio repositório, confirmado corrigido — ver Dead/Orphan code para o que ainda resta como
  código morto documentado dessa correção).
- Duas pilhas de busca full-text coexistem para a mesma preocupação (Meilisearch para
  `companies`/`leads` via `src/lib/search/index.ts` + `MEILI_HOST`/`MEILI_MASTER_KEY` validados
  por `env.ts`; e um segundo acesso direto via `fetch` cru para `knowledge_chunks` usando
  `process.env.MEILISEARCH_URL`/`MEILISEARCH_KEY`, não validados por `env.ts`) — mesma
  infraestrutura, duas superfícies de configuração desconectadas (RAG-001).
- Duas pilhas de banco vetorial coexistem: pgvector (real, único caminho que qualquer feature de
  RAG do produto usa) e Qdrant (client completo, zero features conectadas — RAG-005), mais uma
  terceira instância lógica de Qdrant usada só pelo mem0 (RAG-002), desconectada do client Qdrant
  da aplicação.

## Security

- Isolamento de tenant no pipeline real (`Document`/`DocumentChunk`) está bem implementado: RLS
  `ENABLE` + `FORCE` nas duas tabelas, política que já nega tudo por padrão sem
  `app.current_tenant_id`, e filtro explícito de `organizationId` redundante em cada query crua de
  `search.service.ts`/`ingestion.service.ts` — documentado no próprio código como defesa em
  profundidade deliberada. Confirmado por teste de integração real (Postgres + RLS) em
  `tests/integration/knowledge-rag-tenant-isolation.test.ts` (4/4 casos, incluindo os dois
  consumidores externos ao módulo).
- Conteúdo de terceiro (trecho de `DocumentChunk` vindo de upload) é tratado como não confiável
  ponta a ponta: `wrapUntrustedContent` envolve cada trecho individualmente (não o bloco inteiro)
  tanto no reranker quanto no Copiloto Técnico, mitigando prompt injection disfarçada de
  delimitador de fechamento forjado.
- Citações são estruturalmente verificadas: o LLM nunca escreve o nome de uma fonte — só aponta um
  índice numérico que o servidor resolve de volta para o `SearchHit` real; índice alucinado, fora
  de faixa ou duplicado é descartado, nunca vira citação. Confirmado por
  `tests/integration/knowledge-copilot-citation.test.ts`.
- `MEILI_MASTER_KEY` tem trava fail-closed em produção (lança erro em vez de usar chave de dev
  hardcoded) em `src/lib/search/index.ts` — mas essa trava **não se aplica** ao ramo
  `MEILISEARCH_URL`/`MEILISEARCH_KEY` de `search.service.ts`, que aceita `MEILISEARCH_KEY` vazio
  silenciosamente (`apiKey = process.env.MEILISEARCH_KEY || ''`) mesmo em produção. Como o índice
  nunca existe de fato (RAG-001), o risco prático hoje é zero, mas a assimetria de postura de
  segurança entre os dois ramos de Meilisearch é real e ficaria ativa no dia em que alguém
  implementasse a indexação que falta.

## Tests

- Cobertura real e específica de RAG: `chunking.test.ts` (estratégia de corte), `vector-support.test.ts`
  (detecção de pgvector), `reranker.service.test.ts` (233 linhas — fail-safe, aplicação de scores,
  índices inválidos), `knowledge-copilot.service.test.ts` (263 linhas — geração de resposta,
  resolução de citação), `knowledge.routes.extractText.test.ts`/`.fixtures.test.ts` (extração de
  PDF/DOCX/HTML), `tests/integration/knowledge-rag-tenant-isolation.test.ts` (isolamento de tenant
  ponta a ponta com Postgres/RLS reais, cobrindo os 3 consumidores externos também),
  `tests/integration/knowledge-copilot-citation.test.ts` (citação verdadeira ponta a ponta).
- **Gap real (RAG-006)**: nenhum teste unitário isolado para `SearchService` em si — nem a lógica
  de fusão RRF (`fuse`), nem o fallback full-text → ILIKE, nem (o mais relevante) o ramo
  `searchMeilisearch`. O teste de integração de isolamento de tenant nunca define
  `MEILISEARCH_URL`, então nunca passou pelo ramo Meilisearch — é por isso que o achado RAG-001
  (índice inexistente + scores fabricados) nunca foi pego por CI.
- `tests/e2e/accessibility.spec.ts` cobre a tela `/app/knowledge` (Piloto 019, confirmado presente
  e não alterado por esta auditoria — auditoria não fez nenhuma mudança de código).

## Integration

- Meilisearch: integração real e funcional para `companies`/`leads` (índices criados, atributos
  filtráveis/pesquisáveis definidos, fila BullMQ idempotente alimentada pelo middleware do Prisma).
  Para a Base de Conhecimento (`knowledge_chunks`), a integração é apenas declarada, não
  implementada (RAG-001).
- Qdrant: client de infraestrutura pronto e com health check, mas **zero integrações reais** no
  pipeline de RAG do produto (RAG-005). A única biblioteca do repositório que efetivamente fala com
  Qdrant é o `mem0ai` (RAG-002), por conta própria, sem usar o client `src/lib/qdrant/index.ts`.
- LiteLLM: caminho legado de embeddings (`EMBEDDINGS_PROVIDER≠local`) aponta para um modelo
  (`text-embedding-3-small`) que não está sequer declarado em `litellm-config.yaml` — se algum dia
  ativado sem configuração adicional, falharia por modelo desconhecido antes mesmo do problema de
  dimensão (RAG-003) se manifestar.

## Product

- A Base de Conhecimento (`Base.tsx`) é uma feature de produto real, usada por SDR/Closer/Gestor,
  com RBAC correto na UI (Piloto 019), edição in-place com reindexação, e badge de reranking já
  exposto. Não há achado de produto novo aqui além dos já listados.
- O Copiloto Técnico RAG (`#15` do AI Suite Hub) é funcional ponta a ponta (retrieval real no
  servidor, citação verificável) mas só é alcançável por um console de teste de desenvolvedor
  (JSON cru), não por uma experiência de produto dedicada — gap de produto já conhecido (Piloto
  019), reafirmado (RAG-007).
- A promessa de "IA que lembra o usuário entre sessões" (`PRODUCT_EXPERIENCE.md`) permanece não
  entregue apesar de existir uma tentativa de implementação (RAG-002) — é um gap de produto real
  para quem lê a documentação e assume que já foi resolvido.

## Mock/Fake/Placeholder

- **RAG-001 (achado principal, TD-MOCK)**: `search.service.ts#searchMeilisearch` fabrica
  `similarity: 0.95 - i * 0.05` e `score: 1 / (RRF_K + i + 1)` — nenhum dos dois é calculado a
  partir de uma pontuação real do Meilisearch (BM25), é uma progressão decrescente arbitrária.
  Também marca todo hit desse ramo como `matchedBy: ['semantic', 'keyword']` incondicionalmente,
  mesmo o Meilisearch sendo busca full-text tolerante a erro de digitação (equivalente a
  `keyword`), nunca semântica de verdade. Hoje isso nunca executa em produção porque o índice
  nunca tem documentos (retorna vazio antes de chegar a este código) — mas é uma bomba-relógio: o
  dia em que alguém ligar a indexação que falta, os `SearchHit`s daí em diante mentem sobre como
  foram encontrados e com que confiança.

## Dead/Orphan code

- **RAG-001**: toda a filial `if (process.env.MEILISEARCH_URL) { ... }` de
  `search.service.ts#hybridSearch`, e o índice `knowledge_chunks` que ela assume existir, é código
  morto em qualquer ambiente real hoje (nenhum indexador o alimenta).
- **RAG-002**: `agentMemory.add()`/`agentMemory.deleteUser()` (`src/lib/ai/memory/mem0.ts`) — zero
  chamadores em todo o repositório; `deleteUser` em particular é a rotina de "direito ao
  esquecimento" LGPD para essa memória, também órfã.
- **RAG-005**: `src/lib/qdrant/index.ts` inteiro (client, `isQdrantConfigured`,
  `checkQdrantHealth`) sem nenhum consumidor de feature real — só infraestrutura de espera,
  documentada como tal no próprio arquivo.
- Já corrigido, não é achado novo, mas relevante como contexto: `VectorSearchService.updateChunkEmbedding`
  e `VectorService.ingestDocument`/`vectorStore.addDocumentChunk` são stubs `@deprecated`
  mantidos deliberadamente (lançam erro ou retornam `false`) para não quebrar um import externo
  eventual — resíduo intencional e documentado do achado histórico `RAG-001` do próprio repo, não
  uma nova ocorrência.

## Quick wins

- Adicionar ao `.env.example` (linha do `MEILISEARCH_URL`) uma nota explícita de que a Base de
  Conhecimento não indexa `DocumentChunk` no Meilisearch hoje — ou implementar o indexador
  (enfileirar no `searchQueue` a partir de `ingestion.service.ts`, mesmo padrão já usado para
  `Company`/`Lead`) e criar o índice `knowledge_chunks` em `initMeiliIndexes`. Sem isso, o ramo
  inteiro deveria ser removido até existir um indexador real — manter um ramo "quase funcional"
  que fabrica confiança de score é pior do que não ter Meilisearch na Base de Conhecimento.
- Adicionar a mesma validação de dimensão (`EMBEDDING_DIMENSIONS`/`vetor.length !== 768`) já
  existente em `local-embeddings.ts` ao caminho gateway de `gateway/embeddings.ts` — poucas linhas,
  mesmo padrão, fecha o risco RAG-003 por completo independente de qualquer decisão de produto.
- Remover (ou implementar de fato) a chamada `agentMemory.search()` em `ops.agent.ts` — hoje ela só
  adiciona uma chamada de rede ao Qdrant/mem0 por turno do agente sem nenhum efeito, já que nunca
  há nada para encontrar.

## Structural problems

- Duas superfícies de configuração para a mesma dependência externa (Meilisearch) sem nenhuma
  validação central compartilhada — um padrão que tende a se repetir se uma terceira feature
  decidir falar com Meilisearch no futuro sem descobrir `src/lib/search/index.ts` primeiro.
- Ausência de uma convenção única de "onde vive a memória/contexto de longo prazo de um agente de
  IA neste produto": hoje há pelo menos três noções sobrepostas e não unificadas — `AgentMemory`
  (Prisma, estado da sessão mais recente do enxame), memória de aprendizado governada do Agent
  Runtime (`memory.service.ts`, Prisma estruturado) e mem0/Qdrant (RAG-002, vetorial, órfão). Não é
  um bug isolado, é a mesma classe de "múltiplos pipelines conflitantes" que a Onda 2/Onda 7 já
  proibiu para RAG de documentos — aqui reaparecendo one nível acima, para memória de agente.

## Needs verification

- **RAG-003**: nenhum ambiente configurado neste repositório (dev, `.env.example`, Docker Compose,
  Helm chart) define `EMBEDDINGS_PROVIDER` diferente de `local`, então o caminho afetado nunca
  executa hoje. Confirmar com o time se esse caminho gateway ainda tem algum consumidor real
  planejado antes de decidir entre corrigir a validação de dimensão ou remover o caminho.
- Impacto de latência real do ramo Meilisearch morto (RAG-001) quando `MEILISEARCH_URL` está
  configurado mas o serviço está fora do ar (timeout de 3s por busca) não foi medido em produção —
  a análise acima é baseada em leitura de código (`fetchWithTimeout(..., 3_000, ...)`), não em
  medição real.

## Complete findings list

### RAG-001 — Índice Meilisearch da Base de Conhecimento nunca é criado nem populado; scores fabricados no ramo morto

- **Category**: TD-RAG, TD-MOCK, TD-DEAD, TD-CONFIG
- **Severity**: MEDIUM · **Priority**: P2 · **Confidence**: HIGH · **Status**: CONFIRMED
- **Effort**: M (implementar o indexador real) ou XS (remover o ramo até existir um indexador)
- **Files**: `src/features/knowledge/search.service.ts` (linhas do método `searchMeilisearch`,
  ~101-149), `src/lib/search/index.ts` (`initMeiliIndexes`, só cria `companies`/`leads`),
  `src/lib/prisma.ts` (~L616: `searchQueue` só enfileira para `model === 'Company' || 'Lead'`),
  `.env.example` (L156-159)
- **Evidence**: `grep -rn "knowledge_chunks"` no repositório inteiro só encontra a própria
  referência de leitura em `search.service.ts:111`; nenhum `createIndex('knowledge_chunks', ...)`
  nem `searchQueue.add(...)` com esse índice existe em lugar nenhum. `.env.example:156-158`
  documenta `MEILISEARCH_URL` como o interruptor real da "Busca full-text da Base de Conhecimento".
- **Root cause**: a feature foi parcialmente implementada (o consumidor de leitura existe, com
  timeout, escape de filtro e resposta tipada) mas o produtor (indexação de `DocumentChunk` no
  Meilisearch) nunca foi escrito — diferente de `companies`/`leads`, que têm indexação real via
  middleware do Prisma.
- **Expected**: definir `MEILISEARCH_URL` deveria ativar busca full-text real e mais rápida sobre
  os documentos da Base de Conhecimento do tenant.
- **Actual**: definir `MEILISEARCH_URL` faz `hybridSearch` tentar (e falhar silenciosamente,
  caindo para o pipeline real pgvector+Postgres) uma consulta contra um índice que nunca existe;
  se o índice um dia passar a existir com dados sem que o código de resposta seja revisto, cada hit
  fabrica `similarity`/`score` (progressão aritmética arbitrária) e marca `matchedBy` como
  `['semantic', 'keyword']` mesmo sendo busca só léxica.
- **Business impact**: hoje, nenhum (o pipeline real pgvector+Postgres já cobre a busca). O risco é
  para o futuro: alguém liga a env var documentada esperando uma feature e não ganha nada, ou
  alguém implementa a indexação sem notar o código de resposta fabricado e passa a exibir
  confiança de busca falsa na UI/Copiloto.
- **User impact**: nenhum hoje; potencial confusão futura de operador/desenvolvedor.
- **Suggested resolution**: opção A (recomendada, esforço M) — implementar o indexador real:
  enfileirar `DocumentChunk` no `searchQueue` a partir de `ingestion.service.ts` (mesmo padrão de
  `Company`/`Lead` em `src/lib/prisma.ts`), criar o índice `knowledge_chunks` com atributo
  filtrável `organizationId` em `initMeiliIndexes`, e substituir os valores fabricados de
  `similarity`/`score`/`matchedBy` pelos campos reais do Meilisearch (`_rankingScore`). Opção B
  (esforço XS) — remover o ramo `searchMeilisearch` inteiro até que exista demanda real e um
  indexador seja construído junto.

### RAG-002 — Memória de longo prazo de agente (mem0/Qdrant) sem nenhum caminho de escrita; o gap de produto que a feature deveria resolver continua aberto

- **Category**: TD-AI, TD-RAG, TD-FEAT, TD-COMPLIANCE
- **Severity**: MEDIUM · **Priority**: P2 · **Confidence**: HIGH · **Status**: CONFIRMED
- **Effort**: M
- **Files**: `src/lib/ai/memory/mem0.ts` (classe inteira), `src/features/intelligence/agents/ops.agent.ts`
  (L76-81, único chamador de `agentMemory.search`/`formatForPrompt`)
- **Evidence**: `grep -rn "agentMemory\.add(\|agentMemory\.deleteUser("` em todo `src/` só encontra
  a ocorrência dentro do comentário JSDoc de exemplo do próprio `mem0.ts` — zero chamadores reais.
  `grep -rn "from.*memory/mem0"` mostra um único consumidor real (`ops.agent.ts`), e só do método
  `search`.
- **Root cause**: a feature foi implementada de "dentro para fora" (o wrapper mem0 completo, com
  `add`/`search`/`formatForPrompt`/`deleteUser`) e conectada à leitura de um único agente do enxame
  comercial (Ops), mas nunca ao ponto de entrada que o próprio arquivo cita como motivação
  (`AIDockWidget`/`useAssistantChat`, o copiloto conversacional do usuário) — e nenhum ponto do
  produto (nem o Ops, nem o copiloto, nem nenhum outro agente) chama `add()` para de fato gravar
  algo.
- **Expected**: segundo o próprio docstring do arquivo, resolver "AIDockWidget e
  useAssistantChat não lembram contexto entre sessões" — o usuário diz uma preferência, o sistema
  lembra em conversas futuras.
- **Actual**: `ops.agent.ts` chama `agentMemory.search(query, {...})` a cada turno de execução do
  Agente de Operações (agente de produção, `ACTIVE`) — como nada nunca escreveu em `atlasgr_agent_memories`
  (a collection do Qdrant configurada em `MEM0_CONFIG`), essa busca sempre devolve `[]`,
  `memoryContext` é sempre string vazia, e o prompt do Ops nunca de fato carrega nenhuma memória.
  O gap original (Chat/Copiloto do usuário sem memória entre sessões) nunca foi tocado.
- **Business impact**: um agente de produção paga uma chamada de rede real (mem0 → Qdrant) por
  turno sem nenhum retorno de valor; o problema de produto documentado como resolvido continua sem
  solução, o que pode levar a decisões de roadmap equivocadas se alguém consultar
  `PRODUCT_EXPERIENCE.md`/o docstring e assumir que já está corrigido.
- **User impact**: nenhuma IA do produto de fato lembra preferências do usuário entre sessões, ao
  contrário do que a documentação interna sugere.
- **Suggested resolution**: decidir explicitamente entre (a) implementar o lado de escrita onde o
  gap real está — hooks de `add()` a partir de `useAssistantChat`/rota do copiloto sempre que o
  usuário expressar uma preferência reutilizável — e também ligar `deleteUser` a um fluxo real de
  exclusão LGPD; ou (b) remover a chamada `agentMemory.search` de `ops.agent.ts` e o wrapper
  inteiro até que exista um plano de produto para o consumo correto, documentando a decisão em
  `PRODUCT_EXPERIENCE.md` para não reabrir a mesma investigação depois.

### RAG-003 — Caminho legado de embeddings (gateway/LiteLLM) sem validação de dimensão contra a coluna `vector(768)`

- **Category**: TD-RAG, TD-CONFIG, TD-BUG
- **Severity**: LOW (produção não usa este caminho hoje) · **Priority**: P3 · **Confidence**: MEDIUM
- **Status**: NEEDS_VERIFICATION (quanto a impacto real; o código em si está confirmado)
- **Effort**: XS
- **Files**: `src/lib/ai/gateway/embeddings.ts` (branch `EMBEDDINGS_PROVIDER !== 'local'`, sem
  checagem de tamanho do array `embedding`), `src/lib/ai/local-embeddings.ts` (L21-22, L111-115 —
  a mesma checagem existe aqui, assimetricamente), `prisma/schema.prisma:1589`
  (`vector Unsupported("vector(768)")?`), `.env.example:148` (`LITELLM_EMBEDDING_MODEL=text-embedding-3-small`)
- **Evidence**: `gateway/embeddings.ts` valida só `Array.isArray(embedding) && embedding.length > 0
&& embedding.every(Number.isFinite)` — nunca compara `embedding.length` contra 768.
  `text-embedding-3-small` da OpenAI devolve 1536 dimensões por padrão (sem parâmetro
  `dimensions` explícito, que este código não envia). `litellm-config.yaml` não declara nenhuma
  rota para `text-embedding-3-small` (`grep -n -A5 "embedding" litellm-config.yaml` não retornou
  nada), então mesmo a chamada ao LiteLLM falharia antes — mas se um operador apontar
  `LITELLM_URL` direto para um proxy compatível que sirva esse modelo, o mismatch de dimensão
  aconteceria no INSERT.
- **Root cause**: a validação de dimensão foi implementada só no caminho que se tornou o padrão
  (local), não replicada no caminho legado quando ele deixou de ser o default.
- **Expected**: qualquer provedor de embedding usado pela aplicação deveria falhar alto e cedo (como
  o caminho local faz) se a dimensão não bater com a coluna do banco.
- **Actual**: o caminho gateway aceita silenciosamente um vetor de dimensão errada; o erro só
  aparece no `INSERT ... ${embedding}::vector` dentro de `withRlsContext` em `ingestion.service.ts`,
  que **não está** dentro do `try/catch` que trata "falha de embedding" (esse try/catch só envolve
  a chamada a `generateEmbedding`, não o INSERT subsequente) — um erro de dimensão nesse ponto
  propaga e aborta toda a transação de ingestão, ao contrário do comportamento degradado
  documentado como intencional no resto do arquivo ("Falha de embedding NÃO aborta a ingestão").
- **Business impact**: se algum dia reativado, quebraria 100% das ingestões da Base de Conhecimento
  com um erro de banco pouco óbvio, não uma mensagem de erro tratada.
- **User impact**: nenhum hoje (caminho não usado por nenhuma configuração do repositório).
- **Suggested resolution**: replicar a guarda de `local-embeddings.ts`
  (`if (vetor.length !== EMBEDDING_DIMENSIONS) throw ...`) dentro de `gateway/embeddings.ts` antes
  de devolver o vetor — poucas linhas, fecha o risco independentemente de quando/se o caminho
  gateway voltar a ser usado.

### RAG-004 — Sem ferramenta de reindexação em massa após troca de modelo de embedding

- **Category**: TD-RAG, TD-DATA
- **Severity**: LOW · **Priority**: P3 · **Confidence**: HIGH · **Status**: CONFIRMED
- **Effort**: S
- **Files**: `src/features/knowledge/ingestion.service.ts` (`reembedDocument`, só repara vetores
  `NULL`), ausência confirmada em `scripts/` (`find scripts -iname "*embed*" -o -iname
"*reindex*"` não retornou nada)
- **Evidence**: `reembedDocument` filtra explicitamente `WHERE "vector" IS NULL` — nunca
  revetoriza um chunk que já tem vetor, mesmo que tenha sido gerado por um modelo diferente do
  atual (`LOCAL_EMBEDDING_MODEL`).
- **Root cause**: a funcionalidade existente resolve o caso "provedor caiu durante a ingestão", não
  o caso "trocamos de modelo de embedding e o corpus antigo ficou num espaço vetorial diferente".
- **Expected**: existir um caminho (script ou rota administrativa) para forçar a revetorização de
  todo o corpus de um tenant (ou de todos) após uma mudança de `LOCAL_EMBEDDING_MODEL`.
- **Actual**: a única forma de recalcular vetores válidos existentes hoje é editar cada documento
  manualmente (o que dispara `updateDocument`, que sim revetoriza tudo) ou excluir e reingerir.
- **Business impact**: se o modelo de embedding local for atualizado no futuro (nova versão do
  `multilingual-e5-base`, ou troca de modelo), documentos antigos e novos passam a coexistir em
  espaços vetoriais diferentes, degradando silenciosamente a qualidade da busca semântica sem
  nenhum sinal visível ao operador.
- **User impact**: buscas podem parecer "piorar" após uma manutenção de infraestrutura, sem causa
  óbvia.
- **Suggested resolution**: script `scripts/reindex-knowledge-base.ts` (mesmo padrão dos demais
  scripts administrativos do projeto) que percorre `Document` por tenant e chama a lógica de
  revetorização completa (a mesma de `updateDocument`, sem exigir mudança de conteúdo).

### RAG-005 — Cliente Qdrant configurado, sem nenhuma feature real conectada

- **Category**: TD-DEAD, TD-DOC
- **Severity**: LOW (documentado como decisão deliberada no próprio código) · **Priority**: P4
- **Confidence**: HIGH · **Status**: CONFIRMED
- **Effort**: XS (documentação) / não aplicável (remoção, é decisão de produto)
- **Files**: `src/lib/qdrant/index.ts` (arquivo inteiro)
- **Evidence**: o próprio comentário do arquivo (L5-17) declara "deliberadamente SEM nenhuma
  feature plugada nele ainda" e justifica manter o pgvector como único banco vetorial em produção.
  `grep -rn "import.*qdrant/index"` (fora do próprio arquivo) não retorna nenhum consumidor de
  feature de produto.
- **Root cause**: decisão arquitetural deliberada, documentada — não um esquecimento.
- **Expected**: o discovery desta auditoria (contexto compartilhado) descreve o stack como usando
  "Qdrant for vector search" — o que sugere uma capacidade ativa.
- **Actual**: 100% da busca vetorial real do produto roda em pgvector; o client Qdrant da
  aplicação é infraestrutura de espera sem consumidor. (mem0, RAG-002, fala com Qdrant por conta
  própria, sem usar este client — ver Structural problems.)
- **Business impact**: nenhum problema funcional; é uma discrepância entre a descrição do stack e a
  realidade do código, que pode levar a suposições erradas em auditorias/onboarding futuros (como
  quase aconteceu nesta mesma auditoria, corrigida ao ler o arquivo).
- **Suggested resolution**: nenhuma ação de código necessária. Atualizar a descrição do stack usada
  em documentação de arquitetura/onboarding para deixar explícito que Qdrant está provisionado mas
  inerte, apontando para este arquivo como fonte da verdade — exatamente o que o comentário interno
  já faz, só falta ele ser a referência citada externamente também.

### RAG-006 — Sem teste unitário dedicado ao motor de fusão RRF / branch Meilisearch de `SearchService`

- **Category**: TD-TEST
- **Severity**: LOW · **Priority**: P3 · **Confidence**: HIGH · **Status**: CONFIRMED
- **Effort**: S
- **Files**: `src/features/knowledge/search.service.ts` (sem arquivo de teste próprio),
  `tests/integration/knowledge-rag-tenant-isolation.test.ts` (único teste que exercita
  `hybridSearch`, focado em isolamento de tenant, nunca configura `MEILISEARCH_URL`)
- **Evidence**: busca por `search.service.test.ts`/`SearchService` em todo `tests/` e
  `src/features/knowledge/` não encontra nenhum arquivo dedicado; o único teste que chama
  `hybridSearch` é o de isolamento de tenant, que não cobre `fuse()`, o fallback
  full-text→ILIKE, nem `searchMeilisearch`.
- **Root cause**: a lógica de fusão/ranking nunca recebeu teste unitário isolado, só exercício
  indireto via testes de outros módulos.
- **Expected**: lógica de ranking (RRF, pesos, desempate) é exatamente o tipo de código que
  justifica teste unitário puro (sem banco/rede) — fácil de testar, fácil de quebrar
  silenciosamente numa refatoração futura.
- **Actual**: zero cobertura direta; é também a razão pela qual RAG-001 (scores fabricados no ramo
  Meilisearch) nunca foi pego automaticamente.
- **Business impact**: risco de regressão silenciosa na qualidade de ranking da busca da Base de
  Conhecimento.
- **Suggested resolution**: `search.service.test.ts` unitário cobrindo `fuse()` isoladamente (casos:
  hit só semântico, só palavra-chave, em ambos com scores somados, ordenação), e um teste
  específico para `searchMeilisearch` com `fetchWithTimeout` mockado (index vazio → `null`; index
  com hits → forma do resultado, incluindo o achado RAG-001 uma vez corrigido).

### RAG-007 — Citações do Copiloto Técnico RAG só visíveis como JSON cru, sem ponto de entrada na Base de Conhecimento

- **Category**: TD-UX, TD-RAG
- **Severity**: LOW · **Priority**: P3 · **Confidence**: HIGH · **Status**: CONFIRMED (achado já
  registrado como "fora de escopo" no Piloto 019 — reafirmado aqui com evidência atual, não é
  descoberta nova)
- **Effort**: M (integrar um ponto de entrada do copiloto dentro de `Base.tsx` é escopo de feature
  cross-module, conforme já registrado no Piloto 019)
- **Files**: `src/features/intelligence/components/AISuiteHub.tsx` (L449-454, L689 — renderização
  via `JSON.stringify(output, null, 2)` dentro de `<pre>`), `src/features/knowledge/components/Base.tsx`
  (sem nenhum ponto de entrada para o copiloto)
- **Evidence**: `grep -rn "sourceReferences|knowledgeCopilot"` em `.tsx` só encontra a linha do
  `endpoint` dentro de `AISuiteHub.tsx`; a renderização do resultado (linha 454) é
  `JSON.stringify(output, null, 2)` genérica para as 20 capacidades do hub, sem nenhum componente
  dedicado a citação (título do documento, trecho, score) para a capacidade #15 especificamente.
- **Root cause**: o backend do Copiloto Técnico RAG foi construído e conectado a um console de
  teste interno (AI Suite Hub, pensado para QA manual das 20 capacidades de IA), nunca a uma
  experiência de produto dedicada.
- **Expected**: um consultor comercial perguntando algo técnico deveria ver a resposta com
  citações legíveis (título do documento, trecho destacado), não um bloco de JSON.
- **Actual**: a resposta (incluindo `sourceReferences`) aparece como texto JSON dentro de um
  `<pre>` no console de teste; não há nenhuma superfície de produto onde um usuário não-técnico
  interagiria com isso.
- **Business impact**: a capacidade de IA mais diretamente amarrada ao RAG do produto
  (`#15 Copiloto Técnico RAG & Manuais`) só é utilizável por quem sabe que o AI Suite Hub existe e
  consegue ler JSON.
- **User impact**: SDR/Closer não descobre nem usa essa capacidade no fluxo real de trabalho.
- **Suggested resolution**: mesma recomendação já registrada no Piloto 019 — criar um ponto de
  entrada de chat/pergunta dentro da própria tela da Base de Conhecimento (`Base.tsx`), reaproveitando
  o endpoint já funcional (`/api/intelligence/suite/knowledge/copilot`) e renderizando
  `sourceReferences` como cartões de citação clicáveis (título + trecho), não como JSON.

### RAG-008 — Listagem de documentos (`GET /api/knowledge`) sem paginação

- **Category**: TD-PERF
- **Severity**: LOW · **Priority**: P4 · **Confidence**: HIGH · **Status**: CONFIRMED
- **Effort**: S
- **Files**: `src/features/knowledge/ingestion.service.ts` (método `list`, L288-310),
  `src/features/knowledge/knowledge.routes.ts` (`GET /`, L226-234)
- **Evidence**: `prisma.document.findMany({ where: { organizationId }, orderBy: {...}, select:
{...} })` sem `take`/`skip`; a rota não aceita nem lê nenhum parâmetro de página/limite.
- **Root cause**: a listagem foi implementada assumindo um volume pequeno de documentos por tenant
  (ferramenta interna de CRM), sem paginação desde a origem.
- **Expected**: mesma convenção de paginação já usada em outras listagens do produto (`Pagination`
  de `src/components/ui/`, citado no Piloto 017 como padrão para Playbook).
- **Actual**: qualquer tenant com uma Base de Conhecimento grande (centenas de manuais/documentos)
  paga o custo de trazer todos os metadados de uma vez a cada carregamento da tela.
- **Business impact**: degradação de performance proporcional ao tamanho do corpus do tenant; hoje
  provavelmente sem impacto prático (corpora ainda pequenos), mas é a mesma classe de bug de
  paginação ausente já encontrada e corrigida no módulo de Playbook (Piloto 017/Onda 2).
- **Suggested resolution**: adicionar paginação real (`take`/`skip` + contagem) à rota e ao client,
  reusando o componente `Pagination` já padronizado no design system, mesmo padrão do Playbook.
