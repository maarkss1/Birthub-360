import { describe, expect, it } from 'vitest';
import {
  BOTTLENECK_CRITICAL_MULTIPLIER,
  BOTTLENECK_WARNING_MULTIPLIER,
  buildFunnelBottlenecks,
  MIN_SAMPLE_SIZE_FOR_BASELINE,
} from '../application/queries/bottleneckReport.js';
import type {
  CommercialGoalDTO,
  CommercialIntelligenceRepository,
  DealRow,
  FilterOptions,
  GoalMetric,
  LeadFieldChangeRow,
  StageDefinition,
} from '../domain/CommercialIntelligence.js';

const NOW = new Date('2026-08-15T12:00:00Z');
const PERIOD = '2026-08';

const STAGES: StageDefinition[] = [
  {
    id: 'nova',
    name: 'Nova Oportunidade',
    code: 'nova',
    sortOrder: 0,
    probability: 15,
    isWon: false,
    isLost: false,
  },
  {
    id: 'qualificacao',
    name: 'Qualificação',
    code: 'qualificacao',
    sortOrder: 1,
    probability: 30,
    isWon: false,
    isLost: false,
  },
  {
    id: 'proposta',
    name: 'Proposta Enviada',
    code: 'proposta',
    sortOrder: 2,
    probability: 45,
    isWon: false,
    isLost: false,
  },
  {
    id: 'ganho',
    name: 'Ganhos',
    code: 'ganho',
    sortOrder: 3,
    probability: 100,
    isWon: true,
    isLost: false,
  },
  {
    id: 'perdido',
    name: 'Perdidos',
    code: 'perdido',
    sortOrder: 4,
    probability: 0,
    isWon: false,
    isLost: true,
  },
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
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-08-01T00:00:00Z'),
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

type HistoryRow = {
  leadId: string;
  stageId: string | null;
  stageName: string;
  enteredAt: Date;
  exitedAt: Date | null;
};

class FakeRepository implements CommercialIntelligenceRepository {
  constructor(
    public deals: DealRow[] = [],
    public history: HistoryRow[] = [],
    public stages: StageDefinition[] = STAGES,
  ) {}
  async findDeals(): Promise<DealRow[]> {
    return this.deals;
  }
  async findDealPipelineStages(): Promise<StageDefinition[]> {
    return this.stages;
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
  async findStageHistory(): Promise<HistoryRow[]> {
    return this.history;
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

/** Passagem CONCLUÍDA por uma etapa, com duração em dias fixa (enteredAt → exitedAt). */
function pass(leadId: string, stageId: string, stageName: string, days: number): HistoryRow {
  const enteredAt = new Date('2026-07-01T00:00:00Z');
  const exitedAt = new Date(enteredAt.getTime() + days * 24 * 60 * 60 * 1000);
  return { leadId, stageId, stageName, enteredAt, exitedAt };
}

describe('bottleneckReport.buildFunnelBottlenecks', () => {
  it('etapa sem amostra suficiente aparece como "sem_dados", nunca com multiplicador fabricado', async () => {
    const repo = new FakeRepository(
      [deal({ id: 'a' }), deal({ id: 'b', pipelineStageId: 'proposta' })],
      [pass('a', 'nova', 'Nova Oportunidade', 2)], // só 1 passagem — abaixo de MIN_SAMPLE_SIZE_FOR_BASELINE
    );
    const report = await buildFunnelBottlenecks(repo, 'org-1', { month: PERIOD }, NOW);
    const nova = report.stages.find((s) => s.stageId === 'nova');
    expect(nova?.sampleSize).toBe(1);
    expect(nova?.severity).toBe('sem_dados');
    expect(nova?.multiplier).toBeNull();
  });

  it('etapa muito mais lenta que as demais é classificada como crítica', async () => {
    const history: HistoryRow[] = [
      // Nova e Qualificação: passagens rápidas (baseline "normal")
      pass('a', 'nova', 'Nova Oportunidade', 2),
      pass('b', 'nova', 'Nova Oportunidade', 3),
      pass('c', 'nova', 'Nova Oportunidade', 4),
      pass('g', 'qualificacao', 'Qualificação', 3),
      pass('h', 'qualificacao', 'Qualificação', 3),
      pass('i', 'qualificacao', 'Qualificação', 3),
      // Proposta: passagens muito mais lentas
      pass('d', 'proposta', 'Proposta Enviada', 30),
      pass('e', 'proposta', 'Proposta Enviada', 32),
      pass('f', 'proposta', 'Proposta Enviada', 34),
    ];
    const repo = new FakeRepository([deal({ id: 'x', pipelineStageId: 'proposta' })], history);
    const report = await buildFunnelBottlenecks(repo, 'org-1', { month: PERIOD }, NOW);
    const proposta = report.stages.find((s) => s.stageId === 'proposta');
    expect(proposta?.sampleSize).toBeGreaterThanOrEqual(MIN_SAMPLE_SIZE_FOR_BASELINE);
    expect(proposta?.multiplier).toBeGreaterThanOrEqual(BOTTLENECK_CRITICAL_MULTIPLIER);
    expect(proposta?.severity).toBe('critico');

    const nova = report.stages.find((s) => s.stageId === 'nova');
    expect(nova?.severity).toBe('normal');
  });

  it('etapa moderadamente mais lenta cai em "atencao", não "critico"', async () => {
    const history: HistoryRow[] = [
      pass('a', 'nova', 'Nova Oportunidade', 10),
      pass('b', 'nova', 'Nova Oportunidade', 10),
      pass('c', 'nova', 'Nova Oportunidade', 10),
      pass('g', 'qualificacao', 'Qualificação', 10),
      pass('h', 'qualificacao', 'Qualificação', 10),
      pass('i', 'qualificacao', 'Qualificação', 10),
      pass('d', 'proposta', 'Proposta Enviada', 16),
      pass('e', 'proposta', 'Proposta Enviada', 16),
      pass('f', 'proposta', 'Proposta Enviada', 16),
    ];
    const repo = new FakeRepository([deal({ id: 'x' })], history);
    const report = await buildFunnelBottlenecks(repo, 'org-1', { month: PERIOD }, NOW);
    const proposta = report.stages.find((s) => s.stageId === 'proposta');
    expect(proposta?.multiplier).toBeGreaterThanOrEqual(BOTTLENECK_WARNING_MULTIPLIER);
    expect(proposta?.multiplier).toBeLessThan(BOTTLENECK_CRITICAL_MULTIPLIER);
    expect(proposta?.severity).toBe('atencao');
  });

  it('conta negócios abertos parados em cada etapa (openCount/openAmount)', async () => {
    const history: HistoryRow[] = [
      pass('a', 'nova', 'Nova Oportunidade', 5),
      pass('b', 'nova', 'Nova Oportunidade', 5),
      pass('c', 'nova', 'Nova Oportunidade', 5),
    ];
    const repo = new FakeRepository(
      [
        deal({ id: 'x', pipelineStageId: 'nova', amount: 1000 }),
        deal({ id: 'y', pipelineStageId: 'nova', amount: 2000 }),
      ],
      history,
    );
    const report = await buildFunnelBottlenecks(repo, 'org-1', { month: PERIOD }, NOW);
    const nova = report.stages.find((s) => s.stageId === 'nova');
    expect(nova?.openCount).toBe(2);
    expect(nova?.openAmount).toBe(3000);
  });
});
