# Onda 48 — Primeiro contato do SDR também por WhatsApp

Data: 2026-09-15

## Escopo

Item 2 de "IA Agêntica de Vendas" ("SDR de IA full-time que... manda WhatsApp/e-mail..."). Boa
parte já ficou coberta pelo item 3 (onda-45, réplica a objeção/sinal recebido). O que faltava,
confirmado por auditoria: o único envio automático de WhatsApp existente
(`followUp.worker.ts`) usa mensagem hardcoded/template fixo — o primeiro toque nunca era
personalizado por IA a partir do playbook/RAG, diferente do primeiro e-mail (já feito por
`SDROutboundDraftAgent.draftEmailForLead`).

## Dependência entre branches

Esta branch parte de `agente/13-negociador-ia-tempo-real` (item 3, não de `origin/main`), porque
`draftWhatsAppForLead` cria uma `AIPendingAction` do tipo `send_whatsapp_reply` — o executor desse
tipo (`aiPendingAction.service.ts` + `WhatsAppSenderPort` no DI) só existe na branch do item 3.
**Esta branch depende do item 3 estar mergeado primeiro** (ou dos dois serem mergeados juntos) —
sinalizado explicitamente para quem for processar o merge.

## Resultado

- `SDROutboundDraftAgent.draftWhatsAppForLead` (novo método, mesma classe de
  `draftEmailForLead`): mesmo contexto de playbook/RAG, prompt de sistema próprio (texto puro,
  curto, sem assunto — formato WhatsApp, não e-mail). Chama `callLLM` diretamente (não
  `processMessage`/`getSystemPrompt()`, usados pelo e-mail) porque precisa de um prompt de sistema
  diferente e não deve herdar memória de conversa entre os dois canais.
- Mesma trava de consentimento LGPD, mesma idempotência (`sdr:first-whatsapp:${leadId}`), mesmo
  fallback textual com `structuredOutputValid:false` (nunca autoExecutado) do fluxo de e-mail.
- **Decisão de segurança deliberada**: diferente do e-mail, o primeiro WhatsApp NUNCA autoExecuta
  — nem parâmetro `autoExecute` o método aceita. Mesmo raciocínio do Negociador de IA (onda-45):
  WhatsApp é mais imediato/pessoal, merece sua própria decisão de autonomia total no futuro, não
  herdar a trava do e-mail por acidente.
- `swarmScheduler.service.ts`: `Candidate` ganha `hasWhatsApp` (de `Contact.whatsapp`, com
  `Contact.phone` como fallback); `shouldDraftFirstContact` agora dispara com e-mail OU WhatsApp
  disponível (antes só e-mail).
- `agent.worker.ts`: o job `SDR_OUTBOUND` agora dispara os dois rascunhos (e-mail e WhatsApp) em
  instâncias separadas do agente (evita misturar histórico de memória entre os dois canais);
  falha isolada — erro no WhatsApp não desfaz o rascunho de e-mail já criado.
- `AIPendingActions.tsx`: título e rótulo do corpo do card distinguem "Primeiro contato do SDR
  (WhatsApp)" de "Negociador de IA · réplica sugerida", via `payload.trigger === 'first_contact'`
  — o mesmo tipo de ação (`send_whatsapp_reply`) agora cobre os dois casos sem confundir o revisor
  humano sobre o que está aprovando.

## Validação

```
npx tsc --noEmit          → 0 erros
npm run lint               → 1 warning pré-existente, não relacionado
npm run lint:architecture   → 0 violações novas
vitest sdrOutboundDraft.agent.test.ts → 17 passed (12 originais + 5 novos)
vitest src/features/intelligence (suíte completa) → 41 arquivos, 306 testes, 0 falha
```

Branch: `feature/sdr-whatsapp-first-touch` (a partir de `agente/13-negociador-ia-tempo-real`),
worktree `.claude/worktrees/sdr-whatsapp-first-touch`.

## Pendência conhecida

Verificação visual do card ajustado em `AIPendingActions.tsx` não executada num navegador real
nesta sessão (mesma limitação de ambiente das ondas anteriores).
