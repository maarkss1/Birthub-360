# Commercial AI OS — Onda B1 (Action Bar + Timeline visual)

Data: 2026-09-09
SHA de entrada: `a271b1d` (`origin/main`, já inclui a Onda A mergeada em `#396`)
Coordenador: Agente 00, atuando também como 04 (CRM) nesta fatia.

## Escopo

Primeira fatia da Onda B (CRM operacional). Cobre parte de P0-3 (Action Bar completa dentro da
oportunidade) e P0-4 (Timeline/histórico operacional por entidade), restrita ao que era possível
sem migration nova — a fatia com schema novo (Saved Views, P0-8) fica para uma Onda B2 separada,
para não misturar mudanças sem relação num mesmo commit.

## Achado que mudou o escopo real do trabalho

Antes de implementar, segui a skill `frontend-design` ("procure dado já computado antes de inventar
feature nova"): `GET /api/leads/:id` (`PrismaLeadRepository.ts:99`, `findById`) **já inclui**
`timeline: { orderBy: { createdAt: 'desc' } }` na resposta há muito tempo, e o tipo `Lead.timeline?:
TimelineEvent[]` já existe em `src/types/index.ts:207`. A UI nunca renderizava esse campo — só as
notas manuais. Resultado: a "Linha do Tempo" desta onda não precisou de rota, campo ou migration
nova — é puramente frontend, usando um dado que a API já retornava.

## O que foi implementado

- **`src/features/crm/components/LeadActionBar.tsx`** (novo componente): consolida em uma única
  barra visível (logo abaixo do cabeçalho do drawer, sem precisar rolar) as ações que já existiam
  mas estavam espalhadas em 3 lugares do `LeadDetailDrawer.tsx` — ícones soltos no cabeçalho
  (Enriquecer/Excluir), botões no rodapé (Qualificar via Voz/WhatsApp) e um botão de envio Bitrix
  enterrado dentro da seção "Integração Bitrix24". Nenhuma ação nova foi criada; só reorganizada e
  rotulada. Composto a partir de `ui/Button` (variantes `secondary`/`destructive` já existentes no
  design system, não classes soltas).
- **Seção "Linha do Tempo"** em `LeadDetailDrawer.tsx`: reusa o primitivo `ui/Timeline.tsx` (já
  existente, usado hoje só pelo Copiloto IA) com os eventos de `lead.timeline`
  (`creation`/`edition`/`movement`/`activity`/`comment`/`generic`, rotulados em português).
- Seção "Integração Bitrix24" mantida, mas só como status/erro (a ação de enviar/reenviar migrou
  para a Action Bar) — conteúdo preservado, não removido (regra da seção 6 do `CLAUDE.md`).
- Rodapé do drawer removido (só continha "Fechar", agora redundante com o X do cabeçalho + Escape,
  ambos já cobertos por teste E2E existente).
- **Resultado líquido**: `LeadDetailDrawer.tsx` foi de 897 para 859 linhas (redução, mesmo somando a
  seção nova de Timeline) — mesma tela já estava acima do limite de aviso de tamanho (700 linhas,
  não-bloqueante) antes desta onda; a extração ajuda, não piora.

## Decisões de design (seção 7 do CLAUDE.md)

- `role="group"` (não `role="toolbar"`) no wrapper da Action Bar: `toolbar` implica navegação por
  seta no padrão ARIA APG, que não foi implementada — `group` é o padrão já usado no toggle
  Lead/Negócio de `CrmBoard.tsx`, mantendo consistência.
- Botão "Excluir" foi de ícone discreto no cabeçalho para `variant="destructive"` rotulado na barra
  — mais visível, mas a confirmação (`useConfirmDialog`) já existente continua sendo a proteção
  real contra clique acidental, não a discrição visual.
- Cores/variantes vêm 100% de tokens/`cva` do design system (`Button` variants), zero hex cru.

## Testes escritos e EXECUTADOS de verdade

Ambiente precisou de nova rodada de setup (Docker/Postgres tinham caído entre a Onda A e esta onda,
horas de inatividade real da sessão) — reiniciei `dockerd`, `npm run infra:up`, confirmei Postgres
`healthy` antes de rodar qualquer teste. Um primeiro lote de testes falhou com "database system is
in recovery mode" (Postgres ainda em replay de WAL logo após o daemon subir) — não é regressão de
código; confirmado re-rodando do zero com o Postgres já `healthy`.

Testes novos em `tests/e2e/crm-kanban.spec.ts` (describe `LeadDetailDrawer`):
- `barra de ações mostra as ações da oportunidade agrupadas` — abre o drawer, confirma o grupo
  "Ações da oportunidade" e os 5 botões (Enriquecer/Qualificar via Voz/WhatsApp/Enviar ao
  Bitrix24/Excluir).
- `linha do tempo mostra o evento de criação do lead` — todo lead novo já nasce com 1 `TimelineEvent`
  tipo `creation` (gravado por `PrismaLeadRepository.create()`); o teste confirma que a seção
  "Linha do Tempo" mostra "Lead criado".

Resultado real (Chromium, banco de teste isolado, migrations aplicadas — incluindo as 2 migrations
novas que chegaram ao `main` depois da Onda A):
- `npx tsc --noEmit` → limpo.
- `npm run lint` → exit 0 (1 warning pré-existente em arquivo não tocado por esta onda).
- `npm run format:check` → limpo.
- `npm run test:architecture` → 0 violações de dependência; hotspots só avisos não-bloqueantes
  pré-existentes.
- `npm run build` → build de produção ok.
- `test:e2e` (Chromium real) — **25/25 passando**: `crm-kanban.spec.ts` (14, incluindo os 2 novos),
  `crm.spec.ts` (9), `crm-board.spec.ts` (2).

**Não executado nesta fatia** (fora do escopo): suíte E2E completa, `test:unit`/`test:integration`,
`accessibility.spec.ts` completo (só rodei o caso "Pipeline CRM", que cobre o board mas não abre o
drawer — não roda axe-core especificamente sobre a Action Bar/Timeline nesta rodada).

## Rebase necessário

O branch `claude/commercial-ai-os-coordination-t6tumf` já tinha sido squash-mergeado no `main` via
PR #396 (Onda A). Como instruído, reiniciei o branch a partir do `main` atual
(`git checkout -B <branch> origin/main`) preservando o trabalho não commitado desta onda (via
`git stash`) em vez de empilhar sobre o histórico já mergeado. `main` já havia avançado com outro
trabalho no meio tempo (Agente Job-Roles/Agent Bus, ajustes de Bitrix/LDR, schema Prisma) —
nenhum conflito real com os arquivos desta onda (`LeadDetailDrawer.tsx`/`LeadActionBar.tsx` novo/
`crm-kanban.spec.ts` não foram tocados por esses outros commits).

## Definition of Done — capabilities tocadas nesta fatia

| # | Capability | Estado | Evidência |
|---|---|---|---|
| P0-3 | Action Bar completa dentro da oportunidade | **VERIFIED** (ações existentes consolidadas) | teste novo "barra de ações...", 25/25 E2E passando |
| P0-4 | Timeline/histórico operacional por entidade | **VERIFIED** (via `lead.timeline` já existente) | teste novo "linha do tempo...", 25/25 E2E passando |
| P0-8 | Saved Views | **NOT_STARTED** | fica para Onda B2 (precisa migration) |
| Batch actions, Kanban/Tabela | já existiam antes desta onda | **VERIFIED** (Onda A/pilotos anteriores) | não retocado nesta fatia |

## Próximo passo

Onda B2 — Saved Views do pipeline (schema novo: modelo `SavedView` ou extensão de `SavedSearch`,
API, UI). Envolve Agente 01/01A (schema/migration) e decisão de design (não é engenharia pura).
Recomendo tratar como PR separado desta B1, mesma disciplina de gate completo antes de fechar.
