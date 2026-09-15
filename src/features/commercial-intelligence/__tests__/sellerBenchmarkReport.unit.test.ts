import { describe, expect, it } from 'vitest';
import { buildSellerBenchmark, MIN_DEALS_FOR_RANKING } from '../application/queries/sellerBenchmarkReport';
import type {
  CommercialGoalDTO,
  CommercialIntelligenceRepository,
  DealRow,
  FilterOptions,
  GoalMetric,
  LeadFieldChangeRow,
  StageDefinition,
} from '../domain/CommercialIntelligence';

const NOW = new Date('2026-08-15T12:00:00Z');
const PERIOD = '2026-08';

const STAGES: StageDefinition[] = [
  { id: 'nova', name: 'Nova Oportunidade', code: 'nova', sortOrder: 0, probability: 15, isWon: false, isLost: false },
  { id: 'ganho', name: 'Ganhos', code: 'ganho', sortOrder: 1, probability: 100, isWon: true, isLost: false },
  { id: 'perdido', name: 'Perdidos', code: 'perdido', sortOrder: 2, probability: 0, isWon: false, isLost: true },
];

function deal(overrides: Partial<DealRow> & { id: string }): DealRow {
  return {
    title: overrides.id,
    amount: 10_000,
    owner: 'ana',
    source: null,
    channel: null,
    companyId: null,
    companyName: null,
    companyCnpj: null,
    contactId: null,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-05T00:00:00Z'),
    closedAt: null,
    expectedCloseAt: null,
    lastInteraction: null,
    nextAction: null,
    lossReason: null,
    lossObservation: null,
    status: 'Nova_Oportunidade',
    bitrixLeadId: null,
    bitrixDealId: null,
    bitrixSyncStatus: null,
    bitrixSyncError: null,
    bitrixSyncedAt: null,
    pipelineId: 'pipeline-1',
    pipelineStageId: 'nova',
    stageName: 'Nova Oportunidade',
    stageSortOrder: 0,
    stageProbability: 15,
    stageIsWon: false,
    stageIsLost: false,
    productSkus: [],
    icp: null,
    ...overrides,
  };
}

function won(id: string, owner: string, amount: number, cycleDays: number): DealRow {
  return deal({
    id,
    owner,
    amount,
    pipelineStageId: 'ganho',
    stageName: 'Ganhos',
    stageIsWon: true,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    closedAt: new Date(new Date('2026-08-01T00:00:00Z').getTime() + cycleDays * 24 * 60 * 60 * 1000),
  });
}

function lost(id: string, owner: string): DealRow {
  return deal({
    id,
    owner,
    pipelineStageId: 'perdido',
    stageName: 'Perdidos',
    stageIsLost: true,
    closedAt: new Date('2026-08-10T00:00:00Z'),
  });
}

class FakeRepository implements CommercialIntelligenceRepository {
  constructor(public deals: DealRow[] = []) {}
  async findDeals(): Promise<DealRow[]> {
    return this.deals;
  }
  async findDealPipelineStages(): Promise<StageDefinition[]> {
    return STAGES;
  }
  async countCompletedMeetings(): Promise<number> {
    return 0;
  }
  async countTimelineEventsByType(): Promise<number> {
    return 0;
  }
  async findCompletedMeetingDates(): Promise<Date[]> {
    return [];
  }
  async findTimelineEventDatesByType(): Promise<Date[]> {
    return [];
  }
  async findStageHistory() {
    return [];
  }
  async findFieldChanges(): Promise<LeadFieldChangeRow[]> {
    return [];
  }
  async findFirstCompletedActivityDates(): Promise<Map<string, Date>> {
    return new Map();
  }
  async countDuplicateCompanyGroupsAmongOpenDeals(): Promise<number> {
    return 0;
  }
  async hasBitrixConnection(): Promise<boolean> {
    return false;
  }
  async getBitrixSyncActivity(): Promise<{
    lastSyncAt: Date | null;
    syncedCount: number;
    failedCount: number;
  }> {
    return { lastSyncAt: null, syncedCount: 0, failedCount: 0 };
  }
  async getFilterOptions(): Promise<FilterOptions> {
    return { owners: [], products: [], sources: [], icps: [], companies: [] };
  }
  async getGoal(): Promise<CommercialGoalDTO | null> {
    return null;
  }
  async getGoals(): Promise<Map<string, CommercialGoalDTO>> {
    return new Map();
  }
  async upsertGoal(
    organizationId: string,
    period: string,
    metric: GoalMetric,
    amount: number,
    currency: string,
    createdBy: string,
  ): Promise<CommercialGoalDTO> {
    return { period, metric, amount, currency, updatedAt: new Date().toISOString(), createdBy };
  }
}

describe('sellerBenchmarkReport.buildSellerBenchmark', () => {
  it('vendedor abaixo da amostra mínima entra nos dados mas sem top performer/sugestão', async () => {
    const repo = new FakeRepository([won('a', 'bruno', 10_000, 20), lost('b', 'bruno')]);
    const report = await buildSellerBenchmark(repo, 'org-1', { month: PERIOD }, NOW);
    const bruno = report.sellers.find((s) => s.owner === 'bruno');
    expect(bruno?.wonCount + (bruno?.lostCount ?? 0)).toBeLessThan(MIN_DEALS_FOR_RANKING);
    expect(bruno?.isTopPerformer).toBe(false);
    expect(bruno?.suggestion).toBeNull();
    expect(report.topPerformerOwner).toBeNull();
  });

  it('identifica o top performer (maior Win Rate com amostra suficiente) e gera sugestão para quem está abaixo', async () => {
    const repo = new FakeRepository([
      // Ana: 4 ganhos, 1 perdido — Win Rate alto, ciclo curto
      ...['a1', 'a2', 'a3', 'a4'].map((id) => won(id, 'ana', 20_000, 10)),
      lost('a5', 'ana'),
      // Bruno: 1 ganho, 4 perdidos — Win Rate baixo, ciclo longo
      won('b1', 'bruno', 5_000, 60),
      ...['b2', 'b3', 'b4', 'b5'].map((id) => lost(id, 'bruno')),
    ]);
    const report = await buildSellerBenchmark(repo, 'org-1', { month: PERIOD }, NOW);

    expect(report.topPerformerOwner).toBe('ana');
    const ana = report.sellers.find((s) => s.owner === 'ana');
    expect(ana?.isTopPerformer).toBe(true);
    expect(ana?.suggestion).toBeNull(); // top performer não recebe sugestão contra si mesmo

    const bruno = report.sellers.find((s) => s.owner === 'bruno');
    expect(bruno?.isTopPerformer).toBe(false);
    expect(bruno?.suggestion).not.toBeNull();
    expect(bruno?.suggestion?.text).toContain('ana');
  });

  it('ignora filter.owner de propósito — compara todos os vendedores mesmo com um filtrado', async () => {
    const repo = new FakeRepository([
      ...['a1', 'a2', 'a3'].map((id) => won(id, 'ana', 10_000, 10)),
      ...['b1', 'b2', 'b3'].map((id) => won(id, 'bruno', 10_000, 10)),
    ]);
    const report = await buildSellerBenchmark(repo, 'org-1', { month: PERIOD, owner: 'ana' }, NOW);
    expect(report.sellers.map((s) => s.owner).sort()).toEqual(['ana', 'bruno']);
  });

  it('vendedor sem negócio nenhum não aparece no relatório (nunca 0 fabricado para quem não existe no período)', async () => {
    const repo = new FakeRepository([won('a', 'ana', 10_000, 10)]);
    const report = await buildSellerBenchmark(repo, 'org-1', { month: PERIOD }, NOW);
    expect(report.sellers.map((s) => s.owner)).toEqual(['ana']);
  });
});
