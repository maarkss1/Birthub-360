- De: 18
- Para: 06
- Onda: c0
- Status: aberto
- Prioridade: normal

## Problema
`src/bootstrap/webhooks.ts` monta um router `chatwootWebhookRoutes` em `/api/integrations/chatwoot`
antes do `express.json` (mesmo tratamento de corpo cru que os demais webhooks de integração real).
Esse conector não aparece em nenhuma das três auditorias funcionais lidas nesta rodada
(`02-mapa-plataforma.md`, `INVENTARIO_FUNCIONAL_COMPLETO.md`, `product-truth-wave-1.md`).

## Arquivo(s) envolvido(s)
`src/bootstrap/webhooks.ts`, e o router `chatwootWebhookRoutes` (caminho não localizado nesta
rodada — próximo passo do dono é identificar o arquivo exato).

## Alteração necessária
Confirmar com o Agente 06 (dono de Integrações): o conector Chatwoot está ativo em produção,
planejado, ou é remanescente de um experimento? Se ativo/planejado, precisa entrar no inventário
funcional e no Truth Map como CONNECTOR formal. Se remanescente, avaliar remoção.

## Teste esperado
Não aplicável nesta etapa — é levantamento de fato, não mudança de código.

## Contexto adicional
Registrado como achado C0-API-1 em `docs/architecture/BRAIN_API_CONTRACT_MAP.md` §2. Como já
trata corpo cru (validação HMAC/assinatura), tem superfície de segurança real mesmo sem estar
documentado — relevante também para o Agente 15 na Onda C3.
