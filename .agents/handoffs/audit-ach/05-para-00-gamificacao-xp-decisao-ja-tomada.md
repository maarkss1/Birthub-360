- De: 05 (auditoria ACH-05-02)
- Para: 00
- Onda: audit-ach
- Status: resolvido
- Prioridade: normal

## Problema

O item ACH-05-02 do relatório de auditoria (`report-atualizado.html`) afirma: "GamificationWidget
de XP em ProspectingHub continua estado local puro — xp/missions são só `useState` local, sem
`apiFetch`. Progresso desaparece em qualquer reload." O `prompt` do item pede para decidir com o
dono de produto entre (a) remover/substituir por indicador real vindo do backend, ou (b) criar
model Prisma novo com rotas de leitura/gravação — e instrui a não implementar (b) sem essa decisão,
por ser mudança de schema (propriedade exclusiva do Agente 01).

## Investigação

Confirmado no HEAD de `origin/main`: `src/components/ui/GamificationWidget.tsx` ainda usa `xp` e
`missions` só em `useState` (linhas 25-32), sem chamada a `apiFetch`/backend. Tecnicamente a
premissa factual do item está correta — o widget continua efêmero.

Porém a decisão de produto que o `prompt` pede **já foi tomada e documentada**, numa onda anterior
não relacionada a esta auditoria: `.agents/handoffs/onda-8/02-para-00-decisao-gamificacao-xp.md`
(De: Agente 02 — Produto e UX; Status: **resolvido**). Resumo da decisão:

> **Opção (a) — manter como decoração efêmera, sem abrir handoff de schema para o Agente 01A.**

Razões registradas lá (não repito por completo, ver arquivo):
- As "missões" são um checklist **auto-reportado** pelo próprio usuário (ex.: "Qualificar 5 novos
  leads hoje"), não uma leitura de atividade real do CRM. Persistir isso em banco como se fosse
  histórico oficial de performance criaria uma fonte de "verdade" paralela e não verificável.
- Não há, hoje, nenhum texto na UI prometendo persistência — "Missões **Diárias**" já comunica
  ciclo curto por natureza.
- Se o produto quiser recompensar engajamento real no futuro, isso seria um recorte de produto
  diferente (XP derivado de `Activity`/`Lead` reais), não persistir o checklist atual.

Esse mesmo handoff da Onda 8 também já confirma que a parte de "verdade cenográfica" anterior
(defaults fixos tipo Level 12/12.480 XP/5 dias seguidos aparecendo para qualquer usuário) foi
corrigida antes — visível hoje no comentário das linhas 12-18 do próprio arquivo. Portanto a
lacuna que sobra é só técnica (não persistir), e essa lacuna é intencional, não descoberta.

## Ação tomada nesta execução

Nenhuma mudança de código. Não implementei a opção (b) (schema novo) — seria contrariar uma
decisão de produto já tomada e registrada, além de ferir a propriedade exclusiva de schema do
Agente 01 sem necessidade, já que a decisão de produto foi "não persistir". Também não teria
sentido reabrir a decisão sozinho: a Onda 8 já avaliou as duas opções do mesmo dilema que ACH-05-02
descreve e escolheu (a) com justificativa escrita.

## Ação recomendada para o Coordenador

Marcar ACH-05-02 como **decidido, sem ação de código pendente** — a auditoria redescobriu um
comportamento que já tem decisão de produto documentada (Onda 8, opção a: efêmero por design, não
por omissão). Se o dono de produto quiser reabrir a decisão (ex.: calcular XP a partir de dados
reais de `Activity`/`Lead`), é um novo recorte de produto, não uma correção técnica objetiva — não
implementado aqui.

## Contexto adicional

Item de auditoria ACH-05-02 (P2) do relatório `report-atualizado.html`. Levantado numa worktree
isolada (`fix/ach-05-02`), sem alteração em `src/components/ui/GamificationWidget.tsx`.
