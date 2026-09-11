import { describe, expect, it } from 'vitest';
import type {
  SellerPerformancePeriod,
  SellerPerformanceRawMetrics,
  SellerPerformanceRepository,
} from '../../domain/SellerPerformance';
import { SellerPerformanceAggregatorService } from '../sellerPerformanceAggregator.service';

const ORG = 'org-1';
const OWNER = 'owner-1';
const PERIOD: SellerPerformancePeriod = {
  from: new Date('2026-09-01'),
  to: new Date('2026-09-30'),
};

/**
 * Repositório em memória — mesmo padrão de `InMemoryOptOutRepository` (cadence). Existir só
 * porque `SellerPerformanceRepository` agora é injetável (piloto de migração para repository, ver
 * `docs/architecture/PRISMA-REPOSITORY-MIGRATION-GUIDE.md`) é o que permite testar a combinação
 * das métricas (conversão, maior motivo de perda) sem banco.
 */
class FakeSellerPerformanceRepository implements SellerPerformanceRepository {
  constructor(private readonly raw: SellerPerformanceRawMetrics) {}

  async getRawMetrics(): Promise<SellerPerformanceRawMetrics> {
    return this.raw;
  }
}

describe('SellerPerformanceAggregatorService', () => {
  it('combina as métricas brutas em avgTicket/conversionRatePercent/topLossReason', async () => {
    const repo = new FakeSellerPerformanceRepository({
      callsMade: 10,
      meetingsScheduled: 4,
      avgDealAmount: 5000,
      dealsClosed: 2,
      qualifiedCount: 8,
      lossReasonCounts: [
        { lossReason: 'Preço', count: 3 },
        { lossReason: 'Timing', count: 5 },
      ],
    });
    const service = new SellerPerformanceAggregatorService(repo);

    const result = await service.compute(ORG, OWNER, PERIOD);

    expect(result).toEqual({
      callsMade: 10,
      meetingsScheduled: 4,
      dealsClosed: 2,
      avgTicket: 5000,
      conversionRatePercent: 25,
      topLossReason: 'Timing',
    });
  });

  it('avgTicket cai para 0 quando o repositório não tem negócio fechado no período (avgDealAmount null)', async () => {
    const repo = new FakeSellerPerformanceRepository({
      callsMade: 0,
      meetingsScheduled: 0,
      avgDealAmount: null,
      dealsClosed: 0,
      qualifiedCount: 0,
      lossReasonCounts: [],
    });
    const service = new SellerPerformanceAggregatorService(repo);

    const result = await service.compute(ORG, OWNER, PERIOD);

    expect(result.avgTicket).toBe(0);
    expect(result.conversionRatePercent).toBe(0);
    expect(result.topLossReason).toBeUndefined();
  });
});
