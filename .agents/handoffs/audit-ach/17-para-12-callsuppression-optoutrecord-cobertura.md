- De: 17 (auditoria ACH-17-06)
- Para: 12 (Voz e Telefonia) — confirmação de cobertura pendente; e usuário/Coordenador (00),
  ciência de que o item permanece aberto por desenho
- Onda: audit-ach
- Status: aberto (bloqueado por decisão de outro agente, não por trabalho pendente meu)
- Prioridade: baixa (P3)

## Problema

O item ACH-17-06 do relatório de auditoria (`report-atualizado.html`) descreve:
"CallSuppression/OptOutRecord em dupla escrita — débito aceito, sem risco de bloqueio cruzado hoje.
O bloqueio cruzado entre os 3 canais já funciona (testes confirmam) porque a leitura combina as duas
fontes. É dívida de duplicação, não de correção."

O `prompt` do item é condicional, não uma correção objetiva:
"Quando o Agente 12 confirmar que OptOutRecord cobre 100% dos casos de CallSuppression, simplificar
`isSuppressed` para consultar só OptOutRecord. **Não é ação deste agente sozinho.**"

## Investigação (HEAD atual de `origin/main`, confirmado nesta worktree)

1. O estado descrito pelo item já é exatamente o estado do código hoje, e já está documentado no
   próprio arquivo. `src/features/integrations/birth-voice/callSuppression.service.ts` (linhas
   10-31) tem um comentário extenso explicando a decisão: `isSuppressed` consulta as duas fontes
   (`CallSuppression` via `prisma.callSuppression.findUnique` + `OptOutRecord` via `isOptedOut`,
   linhas 84-92) e `recordOptOut` grava nas duas (linhas 115-148), com o mesmo texto da auditoria:
   "Migrar a leitura de voz para depender só de `OptOutRecord` é o passo 3, e exige antes confirmar
   100% de cobertura — fora do escopo desta tarefa pontual."
2. Não é um bug nem uma inconsistência ativa — é dívida técnica intencional, já aceita e já
   documentada, exatamente como a auditoria classifica (`"status":"confirma"`, sem risco de bloqueio
   cruzado porque a leitura já combina as duas fontes).
3. A pré-condição do `prompt` ("quando o Agente 12 confirmar que OptOutRecord cobre 100% dos casos
   de CallSuppression") não foi satisfeita. Procurei confirmação do Agente 12 nos handoffs
   existentes (`.agents/handoffs/onda-7/12-para-17-optout-unificado-voz.md`,
   `.agents/handoffs/onda-7/17-para-05-06-12-contrato-optout.md`,
   `.agents/runs/optout-unificado.md`): o que existe é a proposta original (Onda 7) de criar o
   registro unificado e a decisão de que `OptOutRecord` seria criado pelo 01A (Onda 10) com a lógica
   de ponte implementada pelo 17 — não uma confirmação de que `OptOutRecord` hoje cobre 100% dos
   casos historicamente cobertos por `CallSuppression` (ex.: bloqueios manuais antigos criados antes
   da existência de `OptOutRecord`, ou por import, que nunca tiveram gravação espelhada).
4. O próprio texto do item e do `prompt` classifica explicitamente isto como fora do escopo de um
   agente agindo sozinho ("Não é ação deste agente sozinho"). Simplificar `isSuppressed` para
   consultar só `OptOutRecord` sem essa confirmação arriscaria reintroduzir exatamente o "risco de
   bloqueio cruzado" que o item diz que hoje não existe — por exemplo, um registro antigo em
   `CallSuppression` sem par em `OptOutRecord` deixaria de bloquear a discagem.

## Decisão

Não é uma correção técnica objetiva a ser implementada unilateralmente por este agente — é uma ação
condicionada a uma confirmação de cobertura que compete ao Agente 12 (dono do domínio de voz) fazer,
e o próprio prompt do item veda a implementação solo. Nenhum código de produção foi alterado.

Verificação realizada apenas para confirmar que o estado descrito no relatório de auditoria
continua batendo com `origin/main` (nenhuma regressão a corrigir):
- Leitura de `src/features/integrations/birth-voice/callSuppression.service.ts` e do teste
  correspondente (`__tests__/callSuppression.service.test.ts`) — comportamento de dupla
  leitura/escrita confirmado, sem mudança necessária.

## Próximo passo (para quem retomar)

Quando o Agente 12 (ou quem assumir o domínio de voz) auditar os registros existentes em
`CallSuppression` e confirmar que todos têm par equivalente em `OptOutRecord` (`scope: 'voice'` ou
`'global'`), simplificar `isSuppressed` para consultar só `OptOutRecord` e, só depois de um período
de observação, considerar aposentar a dupla escrita em `recordOptOut`.
