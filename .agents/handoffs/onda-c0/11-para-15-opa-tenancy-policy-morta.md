- De: 11
- Para: 15
- Onda: c0
- Status: aberto
- Prioridade: normal

## Problema

`infrastructure/opa/policies/tenancy.rego` (package `atlasgr.tenancy`, regras `brand_allowed`/
`cross_brand_violation`) é carregado pelo engine OPA em runtime (a pasta inteira
`infrastructure/opa/policies` é montada no container via `docker-compose.services.yml`), mas
**nenhum endpoint do código-fonte consulta `atlasgr/tenancy`** — confirmado via grep em todo
`src/`. Só `atlasgr/rbac` (`rbac.rego`) é efetivamente chamado, por `src/middleware/opa.ts` e
`src/lib/auth/authorization.ts`.

O comentário do próprio arquivo `tenancy.rego` o descreve como "a prova técnica" de isolamento de
tenant por marca — risco de má-interpretação: alguém pode concluir, numa auditoria de segurança,
que há uma camada de isolamento por `brand` ativa quando na prática ela nunca é invocada por
nenhuma rota HTTP.

## Arquivo(s) envolvido(s)

`infrastructure/opa/policies/tenancy.rego`, `infrastructure/opa/policies/rbac.rego` (este último
**é** consultado — não remover, só o namespace `atlasgr.rbac` carrega a marca antiga como nome
técnico).

## Alteração necessária

Decisão do Agente 15 (ou 01A, tenancy): (a) remover `tenancy.rego` por não ser consumido, ou
(b) conectar de fato o middleware a esse endpoint se o isolamento que ele descreve ainda for uma
necessidade real não coberta por outro mecanismo. Não decidir isso é manter uma falsa sensação de
segurança documentada no próprio repositório.

## Teste esperado

Se removido: nenhuma rota muda de comportamento (confirma que realmente não era consultado). Se
conectado: teste de acesso cruzado entre tenants/marcas deve falhar como a policy descreve.

## Contexto adicional

Detalhado em `docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` §2.4. Relevante também para a Onda C3
(Agente 01A — Confiabilidade de Dados, RLS e Retenção).
