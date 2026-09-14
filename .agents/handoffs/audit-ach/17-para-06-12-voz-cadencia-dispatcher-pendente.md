- De: 17 (auditoria ACH-17-03)
- Para: 06/12 (e usuário — decisão de arquitetura/produto pendente)
- Onda: audit-ach
- Status: aberto
- Prioridade: normal (P2)

## Problema

O item ACH-17-03 do relatório de auditoria (`report-atualizado.html`) afirma: "Canal de voz na
cadência multicanal nunca despacha de verdade — `productionCadenceDispatcher` para
`touch.channel==='voice'` sempre devolve `failed` ("CYC-004 pendente") — comportamento correto
(nunca finge sucesso), mas toda cadência com toque de voz gera falha garantida até esgotar
tentativas."

O `prompt` do item pede, em ordem de preferência:
1. Implementar um dispatcher real de voz reaproveitando o caminho já real de discagem do Agente 12
   (`birthVoice.service.ts::callLead`) ou do 3CX (`threecx.service.ts::make3CXCall`) por trás de
   uma porta, sem importar diretamente esses módulos (propriedade 06/12).
2. Se decidido que não é prioridade agora: registrar isso explicitamente em
   `AUTONOMIA_COMERCIAL_24X7.md` como limitação conhecida, e considerar não permitir
   `channel:'voice'` na validação de sequência até o dispatcher existir.

## Investigação (HEAD atual de `origin/main`, confirmado nesta worktree)

1. **A premissa factual do item continua verdadeira.** `src/features/cadence/infra/dispatchers/CadenceDispatchers.ts`
   (linhas 112-127) roteia por canal: `whatsapp` chama `sendWhatsAppMessage` de verdade, `email`
   chama `sendEmail` de verdade, e `voice` cai direto em:
   ```ts
   case 'voice':
     return {
       result: 'failed',
       error: 'Canal de voz ainda não tem dispatcher real de cadência (CYC-004 pendente).',
     };
   ```
   Comentário do próprio arquivo (linha 112) já documenta a intenção: "Voz (CYC-004) não tem
   dispatcher real ainda — falha de forma honesta em vez de fingir envio." Nenhum código morto ou
   TODO esquecido: é uma decisão deliberada já tomada, só não implementada.

2. **`src/features/cadence/AGENTS.md` (dono: Agente 17, este mesmo agente) proíbe explicitamente
   editar `src/features/integrations/**`** — a lista "Não pode" diz: "Não editar
   `src/features/integrations/**` (e-mail/SMTP é do 05; WhatsApp, Google Workspace e o resto são
   do 06; voz é do 12) — consumir por contrato de porta/interface, nunca por edição direta desses
   arquivos." `birthVoice.service.ts` e `threecx.service.ts` vivem os dois dentro de
   `src/features/integrations/**`.

3. **`/AGENTS.md` (roster global) confirma a separação de dono**: Agente 06 — "Integrações e
   Bitrix" e Agente 12 — "Voz e Telefonia (Birthub Voices)" são dois slots distintos. Nem
   `birthVoice.service.ts` nem `threecx.service.ts` são propriedade do Agente 17.

4. **`callLead` e `make3CXCall` não são intercambiáveis para um dispatcher de cadência automático
   — são semanticamente muito diferentes:**
   - `birthVoice.service.ts::callLead(organizationId, leadId, agentType)` dispara uma ligação
     **autônoma de IA** (agente SDR/NPS/reactivation do Birth Voices Hub liga sozinho para o
     lead). Já faz gate de consentimento de PII (`assertPiiExternalConsent`) e checa supressão
     (`isSuppressed`) antes de discar — o mesmo tipo de trava que o dispatcher de cadência espera.
     Resultado chega depois, de forma assíncrona, por webhook (`CALL_RESULT_WEBHOOK_PATH`) — não
     na chamada síncrona, diferente do contrato atual de `CadenceDispatcher.dispatch` (que espera
     `{ result: 'sent' | 'failed', providerMessageId }` imediatamente, como WhatsApp/e-mail já
     fazem).
   - `threecx.service.ts::make3CXCall(organizationId, connectionId, destinationNumber, leadId?, email?)`
     é um **click-to-call assistido por humano** contra um PABX 3CX real — precisa de uma
     `connectionId` (linha/ramal específico) e presume um vendedor humano disponível na outra
     ponta para atender/conduzir a ligação. Não faz sentido como disparo automático e
     desacompanhado de um worker de cadência rodando de madrugada sem ninguém na mesa.

   Ou seja: decidir qual dos dois caminhos representa "canal de voz" numa cadência automática não é
   um detalhe de implementação — é uma decisão de produto sobre o que a autonomia comercial 24/7
   deve fazer sozinha (ligar com IA) versus o que continua exigindo um humano na linha
   (click-to-call). `AUTONOMIA_COMERCIAL_24X7.md` (seção "Próximas integrações para autonomia de
   ciclo completo") já lista "executar cadência multicanal com opt-out unificado para e-mail,
   WhatsApp e voz" como item de **roadmap ainda não entregue**, não como promessa quebrada — o que
   é consistente com o comentário honesto já presente em `CadenceDispatchers.ts`.

5. **`/AGENTS.md` também está em "Freeze de escopo" (GOV-003, Sprint 00 → Sprint 13)**: feature
   nova fora do que já está listado como necessário para cumprir promessa existente é bloqueada
   sem decisão do Coordenador (00). Implementar o dispatcher de voz agora seria feature nova (a
   cadência de voz nunca funcionou de ponta a ponta), não remediação de uma regressão — mais um
   motivo para não implementar unilateralmente nesta execução.

## Conclusão da investigação

Isto **não é uma correção técnica objetiva de escopo do Agente 17**: exige (a) um contrato de
porta cuja implementação concreta só pode ser escrita por quem tem permissão de editar
`src/features/integrations/**` (Agente 06 e/ou 12, conforme o caminho escolhido) e (b) uma decisão
de produto ainda não tomada sobre qual dos dois caminhos de voz (IA autônoma vs. click-to-call
humano) a cadência automática deve usar — decisão que também toca o formato assíncrono do
resultado (webhook vs. resposta síncrona), hoje incompatível com o contrato atual de
`CadenceDispatcher.dispatch`.

## Ação tomada nesta execução

- Nenhuma mudança em `CadenceDispatchers.ts` nem em qualquer arquivo de
  `src/features/integrations/**` — exatamente a barreira de propriedade que este handoff existe
  para respeitar.
- Registrada a limitação conhecida em `AUTONOMIA_COMERCIAL_24X7.md` (nova seção "## Limitações
  conhecidas"), conforme a opção 2 do próprio `prompt` do item.
- **Não** desabilitei `channel:'voice'` na validação de sequência (`validateSequence` em
  `src/features/cadence/domain/cadence.ts`) nem removi `'voice'` de `CHANNEL_OPTIONS`
  (`CadenceHub.tsx`) ou do tipo `CadenceChannel` (`domain/optOut.ts`). O próprio prompt trata essa
  parte como "considere", não como obrigatória, e fazê-lo é também uma decisão de produto — hoje
  um usuário pode montar uma sequência com toque de voz na UI; bloquear isso é remover uma opção
  existente da interface (seção 6 de preservação de conteúdo/funcionalidade do projeto), não uma
  correção técnica neutra. Além disso `'voice'` está espalhado por um enum do Prisma
  (`CadenceChannel` em `prisma/schema.prisma`, valores `'Email'|'WhatsApp'|'Voice'`) e por
  `cadenceRun.worker.ts::VALID_CHANNELS` — mudar o conjunto de canais permitido tem superfície
  maior que só `validateSequence` e merece ser decidido junto com a escolha de qual caminho de voz
  será implementado (se `voice` some da UI só até o dispatcher existir, ou se o produto prefere
  manter a opção visível com o erro honesto atual).

## Pergunta para o usuário

Duas decisões pendentes, ambas fora do escopo do Agente 17:

1. **Qual caminho de voz a cadência automática deve usar quando o dispatcher real for
   implementado**: ligação autônoma de IA (`callLead`, Agente 12) ou click-to-call assistido por
   humano (`make3CXCall`, Agente 06)? Isso também define se o resultado do toque de voz continua
   síncrono (como e-mail/WhatsApp hoje) ou passa a ser assíncrono via webhook (exigiria mudar o
   contrato `CadenceDispatcher`/`CadenceTouchAttempt` para um estado "pendente" intermediário).
2. **Enquanto a decisão acima não é tomada**: a opção de canal `voice` deve continuar visível na UI
   de criação de sequência (`CadenceHub.tsx`), sabendo que qualquer toque de voz vai falhar de
   forma honesta e esgotar tentativas? Ou o Agente 17 deve receber aprovação explícita para
   escondê-la/bloqueá-la na validação até o dispatcher existir?

## Teste esperado

Não aplicável nesta execução — nenhuma mudança de comportamento foi feita. Quando a decisão acima
for tomada:
- Se implementar o dispatcher real: teste de integração cobrindo `productionCadenceDispatcher` com
  `touch.channel === 'voice'` chamando a porta nova (mock em teste, adapter real no worker),
  incluindo o caminho de opt-out/supressão antes de discar (mesmo padrão já coberto para
  WhatsApp/e-mail).
- Se bloquear `voice` na validação: teste cobrindo `validateSequence` rejeitando uma sequência com
  toque `channel: 'voice'`, e teste de UI confirmando que `CHANNEL_OPTIONS` não oferece mais a
  opção (ou oferece desabilitada, conforme a decisão do usuário).

## Contexto adicional

Item de auditoria ACH-17-03 (P2, effort M) do relatório `report-atualizado.html`. Levantado numa
worktree isolada (`fix/ach-17-03`, a partir de `origin/main`), sem alteração em
`CadenceDispatchers.ts`, `src/features/integrations/**`, `domain/cadence.ts`, `domain/optOut.ts`,
`CadenceHub.tsx`, `cadenceRun.worker.ts` ou `prisma/schema.prisma`.

**Aviso de coordenação (pedido pela sessão que despachou esta auditoria):** os itens irmãos
ACH-17-01/ACH-17-02, processados numa rodada anterior, já tocaram `documentSignature.ts` e
`PrismaSignatureRequestRepository.ts` dentro deste mesmo cluster de cadência (Agente 17). Este item
(ACH-17-03) não tocou esses dois arquivos — mexeu apenas em `AUTONOMIA_COMERCIAL_24X7.md` (novo) e
neste handoff (novo) — mas como as três branches (`fix/ach-17-01`, `fix/ach-17-02`,
`fix/ach-17-03`) partem todas de `src/features/cadence/**`/`AUTONOMIA_COMERCIAL_24X7.md`, esta
branch é mais um ponto de possível conflito (ou, na pior hipótese, de mudanças concorrentes no
mesmo arquivo de documentação) nesse cluster ao integrar as três. Nenhum conflito de fato
verificado nesta execução — aviso preventivo para quem for fazer o merge.
