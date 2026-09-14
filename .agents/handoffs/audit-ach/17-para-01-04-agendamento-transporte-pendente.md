- De: 17 (auditoria ACH-17-04)
- Para: 01/01A (schema) e 04 (agenda/booking público) — e usuário/Coordenador (00), decisão de
  priorização e arquitetura
- Onda: audit-ach
- Status: aberto
- Prioridade: normal (P2)

## Problema

O item ACH-17-04 do relatório de auditoria (`report-atualizado.html`) afirma: "Dos 3 tipos de
evidência de agendamento (réplica de e-mail, clique em link, confirmação manual), só o manual tem
transporte implementado. A guarda contra inferência de IA é sólida, mas o produto não tem hoje
nenhum caminho automático a partir de resposta do lead."

O `prompt` do item pede, em ordem: (a) `lead-calendar-reply` — quando o classificador de intenção
detectar confirmação de horário **específico já proposto**, gerar `AvailabilityConfirmation` com
esse tipo; (b) `lead-scheduling-link-click` — "se existir página de auto-agendamento pública, o
clique gera a confirmação". Nunca aceitar "acho que o lead topou" do modelo.

## Investigação (HEAD atual de `origin/main`, confirmado nesta worktree)

1. **A premissa factual do item continua verdadeira dentro de `src/features/cadence/**`.**
   `domain/scheduling.ts` define os três `ConfirmationEvidenceType`
   (`lead-calendar-reply`/`lead-scheduling-link-click`/`manual-verified`) e o portão único
   `isVerifiableConfirmation`. O único caller real de `scheduleMeetingIfConfirmed` é
   `application/scheduleMeeting.ts::scheduleVerifiedMeeting`, que constrói a confirmação com
   `evidenceType: 'manual-verified'` fixo. Busquei `lead-calendar-reply`/`lead-scheduling-link-click`
   em todo o repositório: aparecem só na definição do tipo (`scheduling.ts`), no mapeamento de banco
   (`PrismaCalendarSchedulerPort.ts::EVIDENCE_TYPE_TO_DB`, que já sabe gravar os três) e no teste de
   domínio — nenhum caminho de produção cria uma `AvailabilityConfirmation` com esses dois tipos.

2. **Caminho (a) `lead-calendar-reply` exige uma âncora determinística que não existe hoje.**
   O próprio comentário de `scheduling.ts` é explícito: a confirmação nunca pode vir da
   "interpretação de um modelo sobre uma frase" — `evidenceRef` tem que apontar para um registro
   real e comparável. Para o classificador (`emailIntentClassifier.ts`, ou o análogo de WhatsApp em
   `conversation-intelligence.service.ts`) "detectar confirmação de horário específico **já
   proposto**", é preciso ter, em algum lugar, o horário específico que foi oferecido ao lead, para
   comparar de forma determinística com o que ele respondeu — não basta extrair uma data qualquer do
   texto da réplica. Procurei por esse registro (`proposedStart`, `ProposedMeetingSlot`,
   `MeetingProposal`, `schedulingLink`/slots enviados por toque de cadência) em todo `src/` e no
   `prisma/schema.prisma`: não existe. `ConversationSignal`/`EmailMessage`/`CadenceCalendarEvent`
   (os únicos modelos de banco tocados por este domínio) não têm coluna nenhuma para "horário
   proposto ao lead". Criar esse registro é uma mudança de schema, e
   `src/features/cadence/AGENTS.md` (dono: Agente 17, este mesmo agente) proíbe explicitamente:
   "Não editar `prisma/schema.prisma` nem migrations — propor por handoff ao 01/01A". Implementar
   (a) de forma consistente com a trava "nunca aceitar inferência de IA" exigiria, no mínimo, uma
   nova tabela/coluna persistindo o horário oferecido por toque de cadência (e-mail/WhatsApp) antes
   de qualquer comparação ser possível.

3. **Caminho (b) `lead-scheduling-link-click` — a condição do próprio prompt ("se existir página de
   auto-agendamento pública") é verdadeira, mas a página existente pertence a outro agente.** Existe
   sim uma página pública de auto-agendamento completa e funcional:
   `src/features/calendar/routes/booking.routes.ts` (`publicBookingRouter`, montada em
   `/api/book/:slug` — ver `src/bootstrap/routes.ts`) e
   `src/features/calendar/components/PublicBookingPage.tsx`. O fluxo já é real de ponta a ponta: o
   lead escolhe um slot, o backend cria `Company`/`Contact`/`Lead`/`Activity`, checa conflito de
   horário, cria o evento no Google Calendar (com Meet) e envia confirmação por e-mail. **Mas esse
   fluxo é inteiramente paralelo ao domínio de cadência** — não importa `scheduling.ts`, não chama
   `isVerifiableConfirmation`/`scheduleMeetingIfConfirmed`, não grava `CadenceCalendarEvent`, e não
   sabe se o lead que está agendando tem uma `CadenceRun` ativa para encerrar/registrar. `src/features
   /calendar/AGENTS.md` diz claramente: "Dono: Agente 04 — CRM e BI... Este arquivo governa esta
   pasta e todas as subpastas." O Agente 17 não pode editar `booking.routes.ts`/
   `PublicBookingPage.tsx` unilateralmente para plugar a emissão de uma
   `AvailabilityConfirmation{evidenceType:'lead-scheduling-link-click'}` ali dentro.

4. **Freeze de escopo (GOV-003, `/AGENTS.md`, vigente até a Sprint 13) reforça não implementar por
   conta própria.** Ligar dois fluxos de agendamento hoje independentes (cadência vs. booking
   público) — decidindo, por exemplo, se todo agendamento público passa a fechar/pausar a
   `CadenceRun` do lead, e se isso deveria criar também um `CadenceCalendarEvent` redundante ao
   `Activity` que `booking.routes.ts` já cria — é uma decisão de arquitetura/produto (qual dos dois
   registros vira a fonte da verdade do agendamento, e como evitar duplicidade), não uma remediação
   pontual de bug.

## Conclusão da investigação

Não é uma correção técnica objetiva de escopo do Agente 17 sozinho. Os dois transportes pedidos pelo
`prompt` do item esbarram em barreiras diferentes:

- (a) precisa de schema novo (dono: 01/01A) para ter uma âncora determinística de "horário já
  proposto" antes de qualquer comparação ser segura;
- (b) já existe como funcionalidade completa, mas em código de propriedade exclusiva do Agente 04
  (`src/features/calendar/**`), e ligá-la ao contrato de `AvailabilityConfirmation` da cadência é uma
  decisão de arquitetura sobre qual fluxo deve ser a fonte da verdade do agendamento — não uma edição
  isolada.

## Ação tomada nesta execução

- Nenhuma mudança em `src/features/cadence/domain/scheduling.ts`,
  `src/features/cadence/application/scheduleMeeting.ts`,
  `src/features/cadence/infra/PrismaCalendarSchedulerPort.ts`, `src/features/calendar/**` ou
  `prisma/schema.prisma`.
- Registrada a limitação conhecida em `AUTONOMIA_COMERCIAL_24X7.md` (seção "Limitações conhecidas").
- Aberto este handoff com as duas decisões pendentes, uma para cada dono.

## Pergunta para o Coordenador/usuário

1. **Prioridade real**: vale a pena investir em (a) reply de e-mail/WhatsApp como confirmação
   verificável (exige schema novo — handoff a 01), ou o produto prefere consolidar em (b) — usar o
   link público de agendamento (`booking.routes.ts`, já 100% funcional) como o único caminho
   automático, e só então decidir como fazê-lo também encerrar/registrar a `CadenceRun` do lead
   quando existir uma ativa?
2. Se a resposta for (b): quem deve fazer essa ponte — o Agente 04 estende `booking.routes.ts` para
   chamar uma porta exposta pelo domínio de cadência (mantendo a propriedade do arquivo), ou o
   Agente 17 recebe permissão explícita para adicionar um pequeno hook em `booking.routes.ts` sob
   coordenação prévia com o 04 (mesma exigência já descrita em
   `src/features/cadence/AGENTS.md` → "Pode alterar" para `src/features/crm/services/`)?

## Teste esperado

Não aplicável nesta execução — nenhuma mudança de comportamento foi feita. Quando a decisão acima
for tomada:
- Se (a): teste de domínio cobrindo a comparação determinística entre o horário confirmado pelo lead
  e o horário-âncora persistido, incluindo o caso em que o classificador de IA sugere uma
  interpretação mas ela não bate com nenhum horário-âncora real (deve ser rejeitada, nunca aceita por
  "confiança geral").
- Se (b): teste de integração cobrindo `publicBookingRouter` criando a `CadenceCalendarEvent`/
  encerrando a `CadenceRun` ativa do lead (quando existir) via `scheduleMeetingIfConfirmed`, sem
  duplicar o `Activity` já criado hoje.

## Contexto adicional

Item de auditoria ACH-17-04 (P2, effort G) do relatório `report-atualizado.html`. Levantado numa
worktree isolada (`fix/ach-17-04`, a partir de `origin/main`), sem alteração em código de produção.

**Aviso de coordenação (pedido pela sessão que despachou esta auditoria):** os itens irmãos
ACH-17-01/ACH-17-02/ACH-17-03, processados em rodadas anteriores, já tocaram
`documentSignature.ts`, `PrismaSignatureRequestRepository.ts` e `AUTONOMIA_COMERCIAL_24X7.md`
(ACH-17-03 adiciona a mesma seção "## Limitações conhecidas" que este item também edita — nenhuma
dessas branches está mergeada em `origin/main` ainda, então **este é mais um ponto de conflito
concreto e esperado** no mesmo arquivo `AUTONOMIA_COMERCIAL_24X7.md` dentro deste cluster do Agente
17 ao integrar as branches). Nenhum conflito de fato verificado nesta execução (a seção não existe
ainda no HEAD de `origin/main` usado como base) — aviso preventivo para quem for fazer o merge:
as duas entradas de "Limitações conhecidas" (voz — ACH-17-03 — e agendamento — este item) devem ser
combinadas na mesma seção, não sobrescritas uma pela outra.
