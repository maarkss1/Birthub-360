- De: 10 (auditoria ACH-10-03)
- Para: 00 (e usuário — decisão de produto/infra pendente)
- Onda: audit-ach
- Status: aberto
- Prioridade: normal (P2)

## Problema

O item ACH-10-03 do relatório de auditoria (`report-atualizado.html`) afirma: "opaMiddleware ainda
não montado em server.ts. Handoff `onda-os/15-para-10-mount-opa-middleware.md` segue aberto.
Qualquer política OPA desenhada como camada adicional de autorização simplesmente não está em
vigor — código morto do ponto de vista de runtime."

O `prompt` do item pede, nesta ordem:
1. Confirmar se o serviço OPA na porta 8181 ainda é dependência real e ativa (o item irmão
   ACH-15-05 sugere que não é).
2. Se ainda for válida: abrir handoff para o Agente 00 pedindo aprovação explícita para montar
   `opaMiddleware` em `server.ts`.
3. Se o serviço não estiver mais relevante em produção real (indício citado: "OCI não parece ter
   esse serviço"): perguntar ao usuário se o handoff deve ser fechado como obsoleto em vez de
   implementado.

## Investigação (HEAD atual de `origin/main`, confirmado nesta worktree)

1. **`server.ts` não referencia OPA de forma alguma** — `grep -in opa server.ts` não retorna
   nenhuma linha. A premissa factual do item está correta: `opaMiddleware` nunca foi montado.
2. **`opaMiddleware` não é importado em lugar nenhum do código-fonte** —
   `grep -rn opaMiddleware --include=*.ts .` só encontra a própria definição em
   `src/middleware/opa.ts:4`. Nenhum router, nenhuma rota, nenhum teste o usa.
3. **`src/lib/auth/authorization.ts` não referencia OPA** — confirma o que ACH-15-05 já apontava.
   O comentário do próprio arquivo (topo) documenta que este é hoje o único sistema de RBAC
   realmente conectado às rotas (via `requireRole(...)` /
   `src/shared/middlewares/requireRole.ts`), e que um segundo sistema de permissões divergente
   (`AuthorizationService`, nunca ligado a nenhuma rota) já foi removido por não ter consumidor
   real — o mesmo padrão de "código morto de autorização" que o item ACH-10-03 descreve para OPA.
4. **`docker-compose.oci.yml` (deploy real via `.github/workflows/deploy-oci.yml`) não define
   nenhum serviço `opa`** — confirmado via `grep -in opa docker-compose.oci.yml` (zero linhas). O
   serviço `opa` (imagem `openpolicyagent/opa:latest`, porta 8181) só existe em
   `docker-compose.services.yml` (bundle de serviços locais/dev, comentário "OS-5: OPA — Policy as
   Code (sidecar de autorização)"), não no compose usado para produção OCI.
5. Os dois handoffs relacionados seguem **abertos**, nenhum resolvido:
   - `.agents/handoffs/onda-os/15-para-10-mount-opa-middleware.md` (Agente 15 → Agente 10, pede
     para montar o middleware — mas Agente 15 não tinha permissão de editar `server.ts`).
   - `.agents/handoffs/onda-c0/11-para-15-opa-tenancy-policy-morta.md` (Agente 11 → Agente 15,
     aponta que `tenancy.rego` também não é consultado por nenhuma rota).

## Conclusão da investigação

O indício citado no próprio prompt do item ("OCI não parece ter esse serviço") se confirma: o
serviço OPA existe só no compose de desenvolvimento local, não no compose de produção real (OCI).
Combinado com (2) e (3) acima — nenhum código-fonte chama o middleware ou o endpoint OPA, e o RBAC
real do produto já está centralizado e funcionando sem OPA — a leitura mais provável é que o
sidecar OPA é uma dependência não ativa em produção, exatamente como ACH-15-05 já havia sugerido.

Isto **não é uma correção técnica objetiva**: é uma decisão de arquitetura/produto com duas opções
mutuamente exclusivas (manter e montar de verdade vs. remover completamente), ambas exigindo
aprovação explícita do Agente 00 — `server.ts` é propriedade exclusiva dele por `AGENTS.md`
("Dono único para arquivo compartilhado" / linha que lista `server.ts`: "alteração exige aprovação
explícita do Agente 00"), e a decisão de infraestrutura (remover serviço do compose) afeta também
`docker-compose.services.yml` e `infrastructure/opa/policies/**`.

## Ação tomada nesta execução

Nenhuma mudança de código. Não montei `opaMiddleware` em `server.ts` (exigiria aprovação do
Agente 00 e uma decisão ainda não tomada sobre se o serviço é necessário) e não removi nada de
`infrastructure/opa/policies/**` nem do `docker-compose.services.yml` (essa é literalmente a opção
(2) que o item irmão ACH-15-05 coloca para decisão, não algo a decidir unilateralmente aqui).

## Pergunta para o usuário (conforme o próprio `prompt` do item pede)

Como o indício de que o serviço não é mais relevante em produção real se confirmou (OCI não tem o
serviço `opa`, e nada no código-fonte o consulta), a pergunta que falta responder é: **os dois
handoffs abertos (`onda-os/15-para-10-mount-opa-middleware.md` e
`onda-c0/11-para-15-opa-tenancy-policy-morta.md`) devem ser fechados como obsoletos — junto com a
remoção de `infrastructure/opa/policies/**`, `src/middleware/opa.ts` e do serviço `opa` em
`docker-compose.services.yml` — em vez de implementar o middleware de verdade?** Essa decisão
também resolveria o item irmão ACH-15-05 (mesma escolha, mesmos arquivos).

## Teste esperado

Não aplicável nesta execução — nenhuma alteração de comportamento foi feita. Se a decisão futura
for remover: confirmar que nenhuma rota muda de comportamento e que `docker-compose.services.yml`
sobe sem o serviço `opa`. Se a decisão for montar de verdade: teste de acesso cruzado confirmando
que a policy bloqueia o que descreve (mesmo critério já definido em ACH-15-05).

## Contexto adicional

Item de auditoria ACH-10-03 (P2) do relatório `report-atualizado.html`. Levantado numa worktree
isolada (`fix/ach-10-03`), sem alteração em `server.ts`, `src/middleware/opa.ts`,
`infrastructure/opa/policies/**` ou `docker-compose.services.yml`. Item irmão: ACH-15-05 (mesma
decisão pendente, arquivos sobrepostos).
