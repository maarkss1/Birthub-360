- De: 02
- Para: 00
- Onda: c0
- Status: aberto
- Prioridade: alto

## Problema
O North Star do programa BIRTHUB-BRAIN-REORG (`AGENTS.md` do pacote de missões) descreve o
destino como "plataforma modular de comando inteligente com core horizontal e **workspaces
configuráveis**". A arquitetura já implementada no produto (não construída para este programa)
define `RoleWorkspaceDefinition` explicitamente como **política fixa em código**, documentado em
comentário no próprio `prisma/schema.prisma`: *"política fixa de governança do produto, sem
necessidade real de customização por organização em runtime"* — mesmo padrão de
`ToolBinding`/`RoleSupervisorProfile`/`ApprovalPolicy`.

Essas duas afirmações apontam em direções opostas: "configurável" implica dado por tenant;
"política fixa" é uma decisão deliberada de **não** ter isso.

## Arquivo(s) envolvido(s)
`prisma/schema.prisma` (comentário perto de `RoleWorkspaceDefinition`), `AGENTS.md` do pacote de
missões (North Star), `src/features/job-roles/services/workspace.service.ts`.

## Alteração necessária
Decisão do Coordenador, necessária **antes de autorizar a Onda C2**: (a) manter workspace fixo por
papel e ajustar a redação do North Star ("configurável" → "modular, mas com definição fixa por
papel"), ou (b) tornar de fato configurável por organização — o que é uma mudança de arquitetura
de dados (novo modelo Prisma ou extensão de schema), com dono técnico no Agente 01/01A, não no 02.

## Teste esperado
Não aplicável nesta etapa — decisão de arquitetura, não implementação.

## Contexto adicional
Detalhado em `docs/architecture/BIRTHUB_PRODUCT_MODEL.md` §2 e `docs/architecture/WORKSPACE_MODEL.md`
§1-2. Este é o handoff mais importante da Onda C0: qualquer `WorkspaceDefinition` novo desenhado na
C2 sem essa decisão corre risco real de duplicar ou contradizer uma arquitetura já em produção
(violaria a regra do programa "não criar uma arquitetura paralela").
