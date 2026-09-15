- De: analytics-suite (item 25 do roadmap de Revenue Intelligence & Analytics Preditivo)
- Para: 01 (dono de `prisma/schema.prisma`) — **atualmente sem titular ativo no swarm**, confirmado
  pela coordenadora de PR/merge (birthub-360-dd, 2026-09-15). Este handoff fica registrado para
  quando alguém assumir esse papel, ou para decisão direta do usuário.
- Onda: —
- Status: bloqueado (sem dono de schema para revisar)
- Prioridade: normal — não impede os demais itens do roadmap de analytics, só este.

## Problema

Item 25 do roadmap ("Atribuição de receita multicanal — de qual canal/campanha realmente veio o
fechamento, não só o primeiro toque") não tem NENHUM dado real para se apoiar hoje:
`Lead.source`/`Lead.channel` são strings de toque ÚNICO, sem FK — não existe `Campaign`, `UTM`,
nem qualquer modelo de touchpoint multi-canal em `prisma/schema.prisma` (confirmado por grep no
schema inteiro, zero hits).

Construir a versão real (multi-touch) exige uma migration nova — modelo de touchpoint/campanha,
provavelmente algo como `LeadTouchpoint` (leadId, channel, campaign, source, occurredAt, position)
para permitir atribuição linear/first-touch/last-touch/ponderada de verdade. Isso é uma decisão de
schema, não um detalhe de implementação — e o AGENTS.md do módulo Comercial Inteligente proíbe
criar migration sem handoff para o dono do schema (seção "Não pode").

## Arquivo(s) envolvido(s)

- `prisma/schema.prisma` (schema `Lead`, ausência de modelo de campanha)
- `src/features/commercial-intelligence/domain/CommercialIntelligence.ts` (onde o contrato de
  atribuição entraria)
- `src/features/commercial-intelligence/infra/PrismaCommercialIntelligenceRepository.ts`

## Alteração necessária

Não apliquei nenhuma migration nem fabriquei dado. Duas rotas possíveis, para o dono do schema (ou
o usuário) decidir:

1. **Real, multi-touch** — desenhar `LeadTouchpoint` (ou equivalente) capturando cada toque real
   (canal, campanha, timestamp) antes da conversão, e um relatório de atribuição
   (linear/first-touch/last-touch/ponderada) em cima disso. Escopo maior, dado 100% real.
2. **Reduzido, honesto** — entregar agora uma atribuição de TOQUE ÚNICO usando
   `Lead.source`/`Lead.channel` (dado real já existente, sem schema novo), documentado
   explicitamente como não-multi-touch, como primeira versão. Não bloqueado por este handoff — só
   não construí sem confirmação do usuário sobre qual das duas rotas ele quer.

## Teste esperado

Quando resolvido: `npx tsc --noEmit`, `npm run lint` e os testes de
`src/features/commercial-intelligence/__tests__/**` continuam passando; nova migration (se a rota 1
for escolhida) precisa de teste de integração cobrindo o cálculo de atribuição.

## Contexto adicional

Itens 20 (Forecast Auto-calibrado), 21 (Motivo real de perda via IA), 22 (Benchmark de Vendedor),
23 (Simulação de Contratação) e 24 (Gargalo de Funil) do mesmo roadmap já foram implementados sem
depender de schema novo — ver commits em `feature/analytics-suite`. Este é o único item da lista
6-itens que depende de uma decisão de dado que não existe hoje.

## Resolução

(em aberto)
