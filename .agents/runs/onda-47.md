# Onda 47 — Detecção de deal em risco (silêncio/tom/concorrente)

Data: 2026-09-15

## Escopo

Item 5 de "IA Agêntica de Vendas": alertar o gestor antes da perda, a partir de três sinais —
silêncio do lead, mudança de tom na conversa e menção de concorrente. Auditoria prévia (onda-45)
já confirmou: estagnação/silêncio já tinha detecção parcial (swarm/automation engine), mas
tom/concorrente não eram extraídos em lugar nenhum, e nenhum alerta ia especificamente ao gestor.

## Decisão de escopo — por que não mexi em `conversation-intelligence.service.ts`

O caminho mais óbvio seria estender a extração existente (`ConversationSignal`) com dois campos
novos. Não fiz isso porque:
1. `prisma/schema.prisma` é propriedade exclusiva do Agente 01 — novo campo exige migration, fora
   do meu escopo.
2. `conversation-intelligence.service.ts` é propriedade exclusiva do Agente 06 (Integrações e
   Bitrix), com coordenação de IA feita pelo Agente 07 — editar esse arquivo sem coordenação
   colide com dois agentes do enxame ao mesmo tempo.

Em vez disso: um serviço novo e independente
(`commercial-intelligence/application/dealRiskDetection.service.ts`, domínio do Agente 04, onde já
trabalhei nesta sessão para o item 4) faz uma SEGUNDA leitura, própria, sobre as mesmas
`WhatsAppMessage` já persistidas — não duplica nem conflita com a extração existente
(intenção/urgência/objeção continuam exclusivas de `conversation-intelligence.service.ts`), só
adiciona os dois sinais que faltavam. Zero migration, zero edição em arquivo de outro dono.

## Resultado

- `findSilentLeads`: leads em status aberto sem interação há 5+ dias (`SILENCE_THRESHOLD_DAYS`).
- `findConversationRisks`: para leads com mensagem WhatsApp inbound nas últimas 24h (lote limitado
  a 15 por rodada — custo de IA controlado), uma chamada de IA em lote classifica tom
  negativo/concorrente mencionado por conversa, sempre grounded no texto real — nunca inventa. Se
  a IA devolver array de tamanho errado, a rodada inteira é descartada (nunca casa dado errado).
- Alerta vai para os ADMIN/GESTOR reais da organização, um por pessoa — só cai em broadcast pra
  organização inteira se não houver nenhum cadastrado (nunca perde o alerta silenciosamente).
- Cooldown de 48h por (lead, motivo) via `Notification.title` com prefixo estável — nunca span o
  mesmo gestor a cada execução.
- `notificationService` (exceção estrutural documentada no dependency-cruiser: serviço
  transversal) é importado direto, sem indireção de DI — mesmo padrão já usado por
  `automation.engine.ts`.
- `POST /api/commercial-intelligence/ai/deal-risk-scan` — disparo manual nesta primeira versão.
  **Não** agendei execução automática 24/7 (BullMQ) — `src/lib/queue/**` é propriedade exclusiva do
  Agente 07; wiring de scheduler fica como follow-up explícito, não fingido como feito.

## Validação

```
npx tsc --noEmit          → 0 erros
npm run lint               → 1 warning pré-existente, não relacionado
npm run lint:architecture   → 0 violações novas
vitest dealRiskDetection.service.test.ts → 6 passed
```
`test:integration`/`test:e2e`/`build` não executados (mesma limitação de ambiente das ondas
anteriores desta sessão).

Branch: `feature/deal-risk-detection` (a partir de `origin/main`), worktree
`.claude/worktrees/deal-risk-detection`.

## Follow-ups explícitos (fora desta onda)

1. Agendamento automático 24/7 do scan (hoje é `POST` manual) — precisa de coordenação com o
   Agente 07 (dono de `src/lib/queue/**`).
2. Se o produto quiser tom/concorrente como dado estruturado e reportável (não só alerta pontual),
   isso vira uma decisão de schema — handoff para o Agente 01.
