- De: 08 (auditoria ACH-08-04)
- Para: 00
- Onda: audit-ach
- Status: aberto
- Prioridade: alto

## Problema

O script `ship` em `package.json` (linha 26) é um bypass total de lint/teste/review/CI para
push direto em `main`:

```json
"ship": "tsc --noEmit && npm run build && git add . && git commit -m \"update: melhorias e ajustes\" && git push origin main",
```

Ele roda só `tsc --noEmit` + `build`, faz `git add .` amplo (risco de commitar arquivo não
revisado/segredo), usa mensagem de commit fixa (`"update: melhorias e ajustes"`, sem
rastreabilidade do que foi de fato alterado) e dá push direto em `main` — funciona porque
`enforce_admins` está desligado na proteção de branch. É o mesmo risco de ACH-08-01/02
(push/CI em main), sem nem o benefício de um gate de PR individual.

Confirmado ainda presente em `origin/main` nesta data (2026-09-11): script inalterado desde a
introdução, nenhum handoff anterior trata deste item especificamente.

## Arquivo(s) envolvido(s)

- `/package.json`

## Alteração necessária

`package.json` (script + lockfile) é propriedade exclusiva do Agente 00 por `AGENTS.md` §
"Propriedade exclusiva de arquivos" — este handoff é um pedido de aprovação, não uma edição
direta. Duas opções propostas pela auditoria (ACH-08-04), a decidir por 00:

1. **Remover o script `ship`** de `package.json` — nenhum atalho de push direto em `main`
   deveria existir fora do fluxo de PR/CI padrão.
2. **Manter para emergência deliberada**, mas só se documentado explicitamente em
   `docs/release/` como bypass intencional de emergência (nunca uso rotineiro), e com a
   mensagem de commit fixa substituída por um parâmetro obrigatório (ex.:
   `npm run ship -- "mensagem real do que mudou"`, falhando se omitida), para preservar
   rastreabilidade mínima do que foi enviado direto a `main`.

## Teste esperado

- Se opção 1: confirmar que `ship` não aparece mais em `package.json` → `scripts` e que
  nenhum outro script/CI referencia `npm run ship`.
- Se opção 2: confirmar que existe `docs/release/*.md` documentando o bypass, que o script
  falha sem mensagem de commit explícita (não usa mais a string fixa), e citar o novo uso em
  `docs/release/PRODUCTION-READINESS.md` se fizer sentido.

## Contexto adicional

Item de auditoria ACH-08-04 (P1) do relatório
`report-atualizado.html`. Levantado numa worktree isolada (`fix/ach-08-04`), sem alteração
direta em `package.json` conforme a regra de propriedade exclusiva de arquivo.
