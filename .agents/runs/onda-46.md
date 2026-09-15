# Onda 46 — Objeções geradas de negócios perdidos reais

Data: 2026-09-15

## Escopo

Item 7 de "IA Agêntica de Vendas": `ObjectionMatrixItem` (Matriz de Objeções do playbook
comercial) era 100% CRUD manual — nenhuma geração automática a partir de dados reais de negócios
perdidos. Confirmado por auditoria de código antes de implementar (ver onda-45.md para o
levantamento completo dos 7 itens do roadmap e o que já existia vs. lacuna real).

## Resultado

- `objectionGenerator.service.ts` — agrupa negócios com `status: 'Negocios_Perdidos'` e
  `lossReason` preenchido, por `(company.segment, contact.role)`; descarta grupos com menos de 2
  casos reais (nunca gera a partir de um caso anedótico isolado). Para cada grupo com evidência
  suficiente, uma única chamada de IA (`toolKey: 'objection-generator'`, mesmo padrão de
  `playbook-ai.service.ts`) gera a entrada de matriz, com instrução explícita de nunca inventar
  motivo de perda fora do que foi fornecido.
- `evidenceCount`/`sourceLossReasons` de cada sugestão vêm da própria consulta ao banco, nunca do
  texto que a IA devolveu — proveniência real, não confiada ao modelo.
- Se a IA devolver um array de tamanho diferente do número de grupos enviados, a rodada inteira é
  descartada (nunca casa sugestão com grupo errado). Se a chamada falhar, retorna vazio com motivo
  explícito — sem fallback genérico fingindo ser grounded em dado real (diferente do fallback de
  `playbook-ai.service.ts`, que é aceitável para conteúdo genérico de capítulo, mas seria
  desonesto aqui).
- `POST /api/playbook/objection-matrix/generate-suggestions` (mesma permissão de `POST /`, role
  `ADMIN/GESTOR/CLOSER/SDR`) — retorna sugestões, NUNCA persiste sozinho.
- UI: botão "Gerar sugestões de IA" em `ObjectionsMatrixPage.tsx` + novo
  `ObjectionSuggestionsReview.tsx` (Dialog) — cada sugestão só vira um `ObjectionMatrixItem` real
  com um clique explícito em "Adicionar à matriz" por item (mesmo princípio de aprovação humana
  usado em `AIPendingActions.tsx`, aplicado aqui a conteúdo em vez de comunicação externa).
- Zero migration: nenhuma coluna nova em `ObjectionMatrixItem` (schema é propriedade exclusiva do
  Agente 01) — o fluxo de revisão/aprovação vive inteiramente no lado da aplicação, reusando o
  `POST /` de criação já existente sem alterar seu contrato.

## Validação

```
npx tsc --noEmit                → 0 erros
npm run lint                     → 1 warning pré-existente, não relacionado
npm run lint:architecture         → 0 violações novas
npx vitest run objectionGenerator.service.test.ts → 5 passed
```
`test:integration`/`test:e2e`/`build` não executados (mesma limitação de ambiente do onda-45).
Verificação visual da nova tela não executada (sem navegador com sessão autenticada disponível
nesta sessão) — pendência explícita, não sucesso assumido.

Branch: `feature/objecoes-deals-perdidos` (a partir de `origin/main`), worktree dedicado
`.claude/worktrees/objecoes-deals-perdidos`.

## Pendência conhecida

Verificação visual/E2E da nova tela (`ObjectionSuggestionsReview.tsx`) ainda não foi feita num
navegador real — os componentes reusam primitivos e classes já auditadas (`Dialog`, tokens de
cor), mas isso não substitui checar contraste/responsividade real antes do merge.
