import client from 'prom-client';

/**
 * Falhas de resolução de tenant do webhook 3CX por ramal (`resolveConnectionByExtension` em
 * `threecx.service.ts`) — INTEGRATION-004 (`docs/audits/repository-debt-audit/agents/INTEGRATION.md`).
 *
 * Antes desta métrica, um ramal ambíguo entre duas organizações (ex.: duas empresas configurando
 * o mesmo default de PABX "101"/"100") só deixava um `logger.error` — o evento era descartado
 * silenciosamente para AMBOS os tenants, sem nenhum sinal agregado/acionável (mesmo gap que
 * `bitrix_sync_failures_total` fechou para o Bitrix, ver
 * `src/features/integrations/bitrix/service/metrics.ts`). `reason`: 'ambiguous' (mais de uma
 * organização com o mesmo ramal — nunca adivinha, mas agora é visível) ou 'scan-limit-exceeded'
 * (número de organizações excede `MAX_ORGS_SCAN_FOR_EXTENSION_MATCH`, sinal de que o scan
 * cross-tenant por ramal precisa da migração arquitetural para identificador de conexão na URL,
 * mesmo padrão já usado pelo webhook do Bitrix). 'not-found' (ramal nunca cadastrado) não entra
 * aqui de propósito — é esperado em operação normal (PABX de terceiro mandando ruído, ramal ainda
 * não configurado), não uma falha a alertar.
 *
 * Guard contra "A metric with the name X has already been registered" — mesmo padrão de
 * `bitrix/service/metrics.ts` (Registry padrão do prom-client pode ver mais de um registro no
 * mesmo processo em teste/hot-reload).
 */
export const threeCXExtensionResolutionFailuresTotal =
  (client.register.getSingleMetric('three_cx_extension_resolution_failures_total') as
    | client.Counter<'reason'>
    | undefined) ??
  new client.Counter({
    name: 'three_cx_extension_resolution_failures_total',
    help: 'Total de falhas de resolução de tenant do webhook 3CX por ramal, por motivo (ambiguous | scan-limit-exceeded).',
    labelNames: ['reason'] as const,
  });
