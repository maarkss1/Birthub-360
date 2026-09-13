// ARCH-009 (auditoria de dívida técnica): 857L / complexidade proxy 203 — o maior do repo. Cinco
// responsabilidades reais conviviam no mesmo arquivo (conexões, listagem/import de Leads,
// listagem/import de Deals, push Atlas→Bitrix e regras de sincronização automática), cada uma
// com sua própria lógica de filtro/mapeamento de campos. Decomposto em service/:
// - service/client.ts: cliente HTTP de baixo nível (callBitrix), validação de webhook, cache de
//   status labels — o "BitrixClient" sugerido pelo checklist.
// - service/connections.ts: CRUD de conexões (portais Bitrix conectados a uma organização).
// - service/leads.ts: listagem/importação do objeto Lead do Bitrix.
// - service/deals.ts: listagem/importação do objeto Deal/Negócio (com pipeline/etapa).
// - service/outboundSync.ts: push Atlas → Bitrix (mapeamento de campos — o "BitrixFieldMapper"
//   sugerido pelo checklist vive dentro de syncLeadToBitrix, não fazia sentido isolar só o
//   mapeamento de um único caller sem introduzir uma camada artificial).
// - service/syncRules.ts: regras de sincronização automática + runBitrixSyncTick — o
//   "BitrixSyncService" sugerido pelo checklist.
// Este arquivo agora só reexporta a API pública, preservando os imports existentes em
// bitrix.routes.ts, prospecting.service.ts, bitrixSync.worker.ts e LeadUseCases.ts (import
// dinâmico) sem exigir nenhuma mudança neles.

export {
  callBitrix,
  getConnectionWebhookUrl,
  getStatusLabels,
  hostnameOf,
  normalizeWebhookUrl,
  testWebhook,
} from './service/client.js';

export type { BitrixConnectionSummary } from './service/connections.js';
export {
  connectBitrix,
  disconnectBitrix,
  listBitrixConnections,
  regenerateWebhookSecret,
  setInboundEventsEnabled,
  testBitrixConnection,
} from './service/connections.js';
export type { BitrixEntityKind, BitrixFieldOption } from './service/customFields.js';
export {
  applyInboundCustomFields,
  buildOutboundCustomFields,
  getEntityFields,
  resolveEnumMaps,
} from './service/customFields.js';
// Plano Diário Operacional com integração Bitrix24
export type {
  DailyPlanItem,
  DailyPlanItemChannel,
  DailyPlanItemOrigin,
  DailyPlanPriorityLevel,
  UserDailyPlanSummary,
} from './service/dailyPlan.service.js';
export {
  addDailyPlanItemNote,
  completeDailyPlanItem,
  createDailyPlanActivity,
  fetchUserDailyPlan,
} from './service/dailyPlan.service.js';
// Fechamento obrigatório do Plano Diário (parecer do dia anterior + metas do novo dia)
export type {
  DailyClosingMetrics,
  PendingDailyClosing,
} from './service/dailyPlanClosing.service.js';
export {
  createDailyPlanClosing,
  getPendingDailyClosing,
} from './service/dailyPlanClosing.service.js';
export { fetchDailyPlanItemNotes } from './service/dailyPlanNotes.service.js';
export type {
  BitrixDealFilters,
  BitrixDealPipeline,
  BitrixDealStage,
  BitrixDealSummary,
} from './service/deals.js';
export {
  findUnimportedBitrixDealIds,
  getBitrixUsers,
  getDealPipelines,
  getDealStages,
  importSelectedBitrixDeals,
  listBitrixDeals,
} from './service/deals.js';
// Serviço real de Extrações Bitrix (Onda 7, Agente 06/06A) — ver service/extraction.ts para o
// racional de arquitetura (execução em segundo plano sem worker BullMQ dedicado nesta rodada).
export type { CreateExtractionRunInput } from './service/extraction.js';
export {
  ALL_EXTRACTION_ENTITIES,
  cancelExtractionRun,
  createExtractionRun,
  deleteExtractionRun,
  downloadExtractionFile,
  EXTRACTION_PERIODS,
  getExtractionRun,
  listExtractionRuns,
} from './service/extraction.js';
export type { ExtractionFileFormat } from './service/extractionFiles.js';
export type { BitrixLeadFilters, BitrixLeadSummary } from './service/leads.js';
export {
  findUnimportedBitrixLeadIds,
  getLeadStatuses,
  importSelectedBitrixLeads,
  listBitrixLeads,
} from './service/leads.js';
export type { SyncLeadOverrides } from './service/outboundSync.js';
export {
  exportLeadToBitrixNow,
  postCommentToBitrix,
  pushLeadToBitrix,
} from './service/outboundSync.js';
// Histórico real de sincronização (webhook de entrada + push/pull), consumido por WebhookMonitor.tsx.
export type { BitrixSyncLogSummary } from './service/syncLogs.js';
export { listRecentBitrixSyncLogs } from './service/syncLogs.js';
export type { BitrixSyncRuleInput } from './service/syncRules.js';
export {
  createSyncRule,
  deleteSyncRule,
  listSyncRules,
  runBitrixSyncTick,
  setSyncRuleActive,
} from './service/syncRules.js';
export type { BitrixUserOption } from './service/userMapping.js';
export {
  resolveAtlasUserIdByEmail,
  resolveAtlasUserNameByEmail,
  resolveOwnBitrixUserId,
} from './service/userMapping.js';
