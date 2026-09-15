import { describe, expect, it } from 'vitest';
import { buildChannelAttribution } from '../application/queries/channelAttributionReport';
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
    closedAt: new Date('2026-08-10T00:00:00Z'),
    expectedCloseAt: null,
    lastInteraction: null,
    nextAction: null,
    lossReason: null,
    lossObservation: null,
    status: 'Negocios_Ganhos',
    bitrixLeadId: null,
    bitrixDealId: null,
    bitrixSyncStatus: null,
    bitrixSyncError: null,
    bitrixSyncedAt: null,
    pipelineId: 'pipeline-1',
    pipelineStageId: 'ganho',
    stageName: 'Ganhos',
    stageSortOrder: 1,
    stageProbability: 100,
    stageIsWon: true,
    stageIsLost: false,
    productSkus: [],
    icp: null,
    ...overrides,
  };
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

describe('channelAttributionReport.buildChannelAttribution', () => {
  it('marca explicitamente o modelo como toque_unico', async () => {
    const repo = new FakeRepository([deal({ id: 'a' })]);
    const report = await buildChannelAttribution(repo, 'org-1', { month: PERIOD }, NOW);
    expect(report.model).toBe('toque_unico');
  });

  it('agrega receita ganha por canal e por origem separadamente', async () => {
    const repo = new FakeRepository([
      deal({ id: 'a', channel: 'WhatsApp', source: 'Indicação', amount: 30_000 }),
      deal({ id: 'b', channel: 'WhatsApp', source: 'Site', amount: 10_000 }),
      deal({ id: 'c', channel: 'Site', source: 'Site', amount: 20_000 }),
    ]);
    const report = await buildChannelAttribution(repo, 'org-1', { month: PERIOD }, NOW);

    expect(report.totalWonAmount).toBe(60_000);
    expect(report.totalWonCount).toBe(3);

    const whatsapp = report.byChannel.find((r) => r.label === 'WhatsApp');
    expect(whatsapp?.wonAmount).toBe(40_000);
    expect(whatsapp?.wonCount).toBe(2);
    expect(whatsapp?.pctOfWonAmount).toBeCloseTo((40_000 / 60_000) * 100, 1);

    const site = report.bySource.find((r) => r.label === 'Site');
    expect(site?.wonAmount).toBe(30_000);
    expect(site?.wonCount).toBe(2);
  });

  it('canal/origem vazio vira "Não informado", nunca omitido nem 0 fabricado', async () => {
    const repo = new FakeRepository([deal({ id: 'a', channel: null, source: null, amount: 5_000 })]);
    const report = await buildChannelAttribution(repo, 'org-1', { month: PERIOD }, NOW);
    expect(report.byChannel).toEqual([
      { label: 'Não informado', wonCount: 1, wonAmount: 5_000, pctOfWonAmount: 100, averageTicket: 5_000 },
    ]);
  });

  it('ignora negócios perdidos e abertos — só ganhos no período contam', async () => {
    const repo = new FakeRepository([
      deal({ id: 'a', channel: 'WhatsApp', amount: 10_000 }),
      deal({
        id: 'b',
        channel: 'WhatsApp',
        amount: 999_000,
        pipelineStageId: 'perdido',
        stageName: 'Perdidos',
        stageIsWon: false,
        stageIsLost: true,
      }),
      deal({
        id: 'c',
        channel: 'WhatsApp',
        amount: 999_000,
        pipelineStageId: 'nova',
        stageName: 'Nova Oportunidade',
        stageIsWon: false,
        stageIsLost: false,
        closedAt: null,
      }),
    ]);
    const report = await buildChannelAttribution(repo, 'org-1', { month: PERIOD }, NOW);
    expect(report.totalWonAmount).toBe(10_000);
    expect(report.totalWonCount).toBe(1);
  });

  it('sem nenhum negócio ganho no período: pctOfWonAmount fica null (nunca divide por zero)', async () => {
    const repo = new FakeRepository([]);
    const report = await buildChannelAttribution(repo, 'org-1', { month: PERIOD }, NOW);
    expect(report.totalWonAmount).toBe(0);
    expect(report.byChannel).toEqual([]);
    expect(report.bySource).toEqual([]);
  });

  it('respeita o filtro de vendedor (escopo padrão do módulo)', async () => {
    const repo = new FakeRepository([
      deal({ id: 'a', owner: 'ana', channel: 'WhatsApp', amount: 10_000 }),
      deal({ id: 'b', owner: 'bruno', channel: 'Site', amount: 20_000 }),
    ]);
    const report = await buildChannelAttribution(repo, 'org-1', { month: PERIOD, owner: 'ana' }, NOW);
    expect(report.totalWonAmount).toBe(10_000);
    expect(report.byChannel.map((r) => r.label)).toEqual(['WhatsApp']);
  });
});
