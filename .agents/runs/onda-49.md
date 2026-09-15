# Onda 49 — Playbook Vivo (item 42 do roadmap de 50 itens)

Data: 2026-09-15

## Escopo

Item 42: "quando um vendedor descobre uma abordagem que converte melhor, o sistema sugere pro time
inteiro." Atribuído por Giselle (coordenação do enxame) após o item 6 (roleplay com voz) ser
segurado por cruzar com o domínio do Agente 12/Voz, ainda em trabalho não commitado no checkout
compartilhado.

## Levantamento prévio (não pulei a auditoria)

Confirmei antes de implementar: `AIPendingAction.outcomeStatus` (POSITIVO/NEGATIVO/NEUTRO,
gravado manualmente via `recordActionOutcome`) já existe, mas é write-only — nenhuma agregação
cruza outcome positivo com vendedor e conteúdo da mensagem em lugar nenhum do código.
`learning.agent.ts` já aprende estilo por vendedor, mas é unidirecional (vendedor → próprio
agente, nunca vendedor → time). `winLossAnalysis.worker.ts` é agregado, não por vendedor. Não
existe nenhum conceito de "script vencedor"/"golden pattern" no código ou schema — greenfield.

## Resultado

- `livingPlaybook.service.ts::generateWinningPatterns`: agrupa `AIPendingAction` executadas com
  `outcomeStatus: 'POSITIVE'` (ações `send_email`/`send_whatsapp_reply`) por
  (`Lead.owner`, segmento da empresa); exige mínimo 2 outcomes reais por grupo; descarta leads sem
  `owner` real (nunca fabrica autoria). Uma chamada de IA em lote sintetiza o padrão a partir das
  mensagens REAIS que tiveram resultado positivo — nunca inventa tática fora do que foi
  fornecido. Se a IA devolver array de tamanho errado ou falhar, descarta a rodada com motivo
  explícito.
- `broadcastWinningPattern`: anuncia o padrão aprovado pro time inteiro via `notificationService`
  (exceção estrutural documentada no dependency-cruiser — serviço transversal), creditando o
  vendedor de origem pelo nome real.
- `POST /api/playbook/living-playbook/generate-suggestions` e `.../broadcast`, ambos restritos a
  ADMIN/GESTOR (gate mais restrito que a Matriz de Objeções — envolve comparar performance entre
  vendedores).
- UI: botão "Playbook Vivo" (só visível a ADMIN/GESTOR) em `ObjectionsMatrixPage.tsx` +
  `LivingPlaybookReview.tsx` (Dialog) — cada padrão só vira anúncio real com "Anunciar para o
  time" explícito por sugestão.
- **Zero migration.** Documentei a proposta de schema (`PlaybookInsight`, para persistir
  histórico/proveniência/medição de adoção no futuro) em
  `.agents/handoffs/onda-49/00-para-01-playbook-insight-schema-proposal.md`, sem aplicar — mesmo
  padrão já usado neste repo (`.agents/handoffs/onda-2/07-para-01-automation-execution-history.md`).
  A v1 funciona hoje computando sob demanda, sem depender dessa migration.
- `docs/openapi.yaml` atualizado para as 2 rotas novas — `verify:openapi-drift` confirma 0 deriva.

## Escopo deliberadamente fora desta onda

- Promoção automática de um padrão pra item real da Matriz de Objeções — o mapeamento não é
  perfeito (nem todo padrão vencedor é uma "objeção"), então deixei como ação manual (usuário usa
  o "Nova Objeção" já existente se quiser), em vez de forçar um encaixe artificial.
- Histórico/medição de adoção — depende da migration documentada no handoff.

## Validação

```
npx tsc --noEmit          → 0 erros
npm run lint               → 1 warning pré-existente, não relacionado
npm run format:check        → limpo (rodei npm run format antes de commitar)
npm run lint:architecture   → 0 violações novas
npm run verify:openapi-drift → 0 deriva estrutural
vitest livingPlaybook.service.test.ts → 7 passed
vitest src/features/playbook (módulo completo) → 2 arquivos, 12 testes, 0 falha
```

Branch: `feature/living-playbook` (a partir de `origin/main`), worktree
`.claude/worktrees/living-playbook`.

## Pendência conhecida

Verificação visual da nova UI não executada num navegador real nesta sessão (mesma limitação de
ambiente das ondas anteriores).
