# Onda 45 — Negociador de IA em segundo plano (Agente 13)

Data: 2026-09-15

## Escopo

Pedido do usuário: começar a construir "IA Agêntica de Vendas (o motor autônomo)", uma lista de 7
itens (agente que roda o pipeline sozinho, SDR de IA full-time, negociador de IA em segundo plano,
priorização de pipeline por IA, detecção de deal em risco, roleplay com voz e memória, simulador de
objeções de deals perdidos reais).

Antes de implementar, auditei o que já existia: a maior parte do "motor autônomo" (item 1) e do SDR
(item 2) já está em produção — enxame Supervisor/SDR/BDR/Closer/CRM/Ops, scheduler 24/7,
`AIPendingAction`, modos `supervised`/`full` (ver `AUTONOMIA_COMERCIAL_24X7.md`). O usuário escolheu,
entre os gaps reais confirmados por leitura de código, começar pelo item 3 — **Negociador de IA**:
hoje um sinal de WhatsApp de alta intenção/objeção/urgência já gera uma `swarm_recommendation`
(análise para o vendedor ler), mas nunca uma réplica real pronta para enviar ao lead — o executor de
`AIPendingAction` só suportava `send_email`/`swarm_recommendation`/`create_follow_up`/`notify_team`.

## Resultado

- Novo agente `NegotiatorDraftAgent` (`agents/negotiatorDraft.agent.ts`, `agentType:
  'NEGOTIATOR_DRAFT'`), separado do `CloserAgent`: produz texto puro pronto para WhatsApp (sem
  markdown/blockquote), nunca a análise em markdown que o Closer já produz para o vendedor.
- Novo serviço `negotiatorReply.service.ts::draftNegotiatorReply` — junta o histórico recente de
  `WhatsAppMessage`, o sinal (`ConversationSignal`) e uma consulta ao playbook (`search_playbook`,
  RAG já existente) e gera a réplica. Retorna `null` (nunca inventa) quando não há um número de
  WhatsApp inbound real para responder.
- `swarmScheduler.service.ts::findSignaledLeads` agora carrega o sinal completo (`id`, `channel`,
  `objections`) no `Candidate`; `maybeProposeNegotiatorReply` cria uma segunda `AIPendingAction`
  (`send_whatsapp_reply`, `riskLevel: 'high'`, sempre pendente de aprovação humana nesta versão —
  nenhuma trava de modo `full` cobre este canal ainda, decisão deliberada) a partir do mesmo sinal
  que já gera a `swarm_recommendation`. Idempotente por `conversationSignalId`.
- `aiPendingAction.service.ts::executeAction` ganhou o branch `send_whatsapp_reply`, resolvendo o
  envio real via `container.resolve<WhatsAppSenderPort>('WhatsAppSenderPort')` — nunca importado
  direto de `integrations/whatsapp/` (bloqueado por `no-cross-feature-imports`, confirmado com
  `npm run lint:architecture`, 0 violações novas).
- `shared/di/setup.ts` ganhou o registro `WhatsAppSenderPort` (mesmo padrão de
  `GoogleCalendarService`, já usado por outros agentes para a mesma composição cross-feature).
- `AIPendingActions.tsx` ganhou apresentação e renderização dedicadas para `send_whatsapp_reply`
  (mostra número de destino + réplica sugerida, mesmo padrão visual do card de e-mail do SDR).
- Testes novos: `aiPendingAction.service.test.ts` (+4 casos: envia, rejeita payload incompleto,
  reporta `send_failed` quando o WhatsApp não está conectado) e
  `negotiatorReply.service.test.ts` (5 casos: sem destinatário real → `null`, réplica gerada,
  falha do agente → `null`, resposta vazia → `null`, playbook indisponível não derruba a geração).

## O que NÃO foi feito nesta onda (deliberado)

- **Nenhum caminho de autoenvio** para `send_whatsapp_reply` — mesmo com `SWARM_AUTONOMY_MODE=full`
  ligado para e-mail, o WhatsApp continua exigindo aprovação humana sempre. Autonomia total para
  este canal precisa da sua própria decisão explícita (novo flag + travas próprias, mesmo padrão de
  `SDR_COLD_CALL_ENABLED`), não herdar a trava do e-mail por acidente.
- Não gera réplica para sinais com `channel === 'email'` (o schema já prevê esse canal, dado do
  Agente 17/reply tracking) — reconstituir a última thread de e-mail é um trabalho maior, deixado
  como lacuna explícita, não fingido como coberto.
- Painel de SLO (`SLO_SWARM_ROLES`) não ganhou uma linha própria para esta capacidade — as réplicas
  do negociador continuam contadas dentro do `agentRole` (CLOSER/BDR/CRM) que já as originou, para
  não quebrar o painel existente com um papel novo sem dado histórico.

## Validação

```
npx tsc --noEmit                                    → 0 erros
npm run lint                                         → 1 warning pré-existente, não relacionado
                                                        (prospecting.routes.ts)
npm run lint:architecture                             → 0 violações novas (1 violação pré-existente,
                                                        não relacionada: worker.ts)
npx vitest run -c vitest.unit.config.ts
  aiPendingAction.service.test.ts                     → 20 passed
  negotiatorReply.service.test.ts                     → 5 passed
```
`test:integration`/`test:e2e`/`build` não executados nesta onda (dependem de infraestrutura —
Postgres/Redis/WhatsApp real — fora do ambiente desta sessão); registrado como pendência explícita,
não como sucesso assumido.

Branch: `agente/13-negociador-ia-tempo-real` (a partir de `origin/main`), worktree dedicado
`.claude/worktrees/agente-13-negociador-ia`.

## Próximos passos sugeridos (fora desta onda)

1. Autonomia total do negociador (envio sem aprovação) — decisão de negócio explícita do usuário,
   com suas próprias travas.
2. Estender para o canal `email` do `ConversationSignal`.
3. Item 4 (priorização de pipeline por IA) e item 7 (objeções geradas de deals perdidos reais) são
   os próximos gaps confirmados com menor risco de colisão com outros agentes do enxame — não tocam
   `intelligence/agents/**`.
