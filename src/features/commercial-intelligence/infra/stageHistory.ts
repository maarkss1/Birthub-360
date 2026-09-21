/**
 * Re-export para retrocompatibilidade. A implementação canônica foi movida para
 * `src/shared/services/stageHistory.service.ts` para evitar violação de `no-cross-feature-imports`
 * quando consumida por outras features (ex.: `crm`, `crm360`).
 */
export { recordStageTransition } from '../../../shared/services/stageHistory.service.js';
