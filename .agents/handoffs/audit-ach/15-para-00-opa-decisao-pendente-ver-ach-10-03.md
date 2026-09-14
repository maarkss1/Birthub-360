- De: 15 (auditoria ACH-15-05)
- Para: 00 (e usuário — decisão de produto/infra pendente)
- Onda: audit-ach
- Status: aberto (duplicado de ACH-10-03 — não repetir escalonamento)
- Prioridade: normal (P2)

## Problema

O item ACH-15-05 do relatório de auditoria (`report-atualizado.html`) afirma: "nem rbac.rego nem
tenancy.rego são consultados por nenhuma rota real — src/lib/auth/authorization.ts não referencia
OPA. Um sidecar com API HTTP aberta na porta 8181 rodando sem função nenhuma." O `prompt` do item
pede uma decisão de arquitetura: (1) montar `opaMiddleware` de verdade em `server.ts` (com
aprovação do Agente 00) ou (2) remover completamente `infrastructure/opa/policies/**`,
`src/middleware/opa.ts` e o serviço `opa` de `docker-compose.services.yml`.

## Verificação nesta execução (HEAD de `origin/main`, worktree `fix/ach-15-05`)

Confirmado que o problema descrito ainda existe:

1. `grep -in opa server.ts` — nenhum resultado. `opaMiddleware` não está montado.
2. `grep -rn opaMiddleware --include=*.ts src/` — só a própria definição em
   `src/middleware/opa.ts`; nenhum consumidor real.
3. `src/lib/auth/authorization.ts` não referencia OPA.
4. `docker-compose.services.yml` define o serviço `opa` (imagem `openpolicyagent/opa:latest`,
   porta 8181, comentário "OS-5: OPA — Policy as Code"); `docker-compose.oci.yml` (produção real)
   **não** define esse serviço.
5. Os dois handoffs citados no prompt do item seguem abertos:
   `.agents/handoffs/onda-os/15-para-10-mount-opa-middleware.md` e
   `.agents/handoffs/onda-c0/11-para-15-opa-tenancy-policy-morta.md`.

## Isto é o mesmo item que ACH-10-03 — não duplicar a investigação

ACH-10-03 ("opaMiddleware ainda não montado em server.ts") já processou exatamente esta mesma
decisão nesta mesma rodada de auditoria, na worktree `fix/ach-10-03`, commit `7e33c869`
("docs(handoff): pede decisao sobre opaMiddleware nao montado - ACH-10-03"), que criou
`.agents/handoffs/audit-ach/10-para-00-opa-middleware-decisao-pendente.md` com a investigação
completa e a mesma pergunta ao usuário (fechar os dois handoffs como obsoletos + remover a
infraestrutura OPA vs. montar o middleware de verdade). Esse commit ainda não está mesclado em
`origin/main` no momento desta execução (`git merge-base --is-ancestor 7e33c869 HEAD` retorna
"not an ancestor" nesta branch) — quem for mesclar as duas branches (`fix/ach-10-03` e
`fix/ach-15-05`) deve notar que os dois arquivos de handoff (`10-para-00-...md` e este,
`15-para-00-...md`) descrevem a mesma decisão pendente e apontam um para o outro.

Como o item irmão já escalou a decisão ao usuário com a investigação completa, este handoff **não
reabre nova investigação nem propõe nova pergunta** — apenas confirma que ACH-15-05 é o mesmo
achado (mesmos arquivos: `src/middleware/opa.ts`, `infrastructure/opa/policies/rbac.rego`,
`infrastructure/opa/policies/tenancy.rego`) e registra a ligação formal entre os dois IDs de
auditoria, para que a resposta do usuário a ACH-10-03 resolva ambos.

## Ação tomada nesta execução

Nenhuma mudança de código, política OPA ou `docker-compose.services.yml`. Não montei
`opaMiddleware` em `server.ts` (arquivo de propriedade exclusiva do Agente 00) nem removi
`infrastructure/opa/policies/**` — ambas são a decisão pendente, não algo a decidir
unilateralmente. Os handoffs `onda-os/15-para-10` e `onda-c0/11-para-15` permanecem `aberto` até a
decisão do usuário.

## Teste esperado

Não aplicável nesta execução — nenhuma alteração de comportamento foi feita. Ver
`.agents/handoffs/audit-ach/10-para-00-opa-middleware-decisao-pendente.md` (ACH-10-03) para o
critério de teste em cada cenário de decisão (montar vs. remover).

## Contexto adicional

Item de auditoria ACH-15-05 (P2) do relatório `report-atualizado.html`, linha 455. Levantado numa
worktree isolada (`fix/ach-15-05`), sem alteração em código. Item irmão/duplicado: ACH-10-03 (commit
`7e33c869` em `fix/ach-10-03`).
