import type {
  AggregatedSellerPerformance,
  SellerPerformancePeriod,
  SellerPerformanceRepository,
} from '../domain/SellerPerformance.js';
import { prismaSellerPerformanceRepository } from '../infra/PrismaSellerPerformanceRepository.js';

export type { SellerPerformancePeriod, AggregatedSellerPerformance };

/**
 * Piloto de migração para repository (ver `docs/architecture/PRISMA-REPOSITORY-MIGRATION-GUIDE.md`):
 * as seis queries que viviam aqui saíram para `SellerPerformanceRepository`/
 * `PrismaSellerPerformanceRepository`. O repositório é injetado por construtor (default =
 * implementação Prisma real) para permitir testar a combinação das métricas (conversão, maior
 * motivo de perda) com um repositório em memória, sem precisar de banco.
 */
export class SellerPerformanceAggregatorService {
  constructor(
    private readonly repository: SellerPerformanceRepository = prismaSellerPerformanceRepository,
  ) {}

  async compute(
    organizationId: string,
    owner: string,
    period: SellerPerformancePeriod,
  ): Promise<AggregatedSellerPerformance> {
    const raw = await this.repository.getRawMetrics(organizationId, owner, period);

    const topLossRow = [...raw.lossReasonCounts].sort((a, b) => b.count - a.count)[0];

    return {
      callsMade: raw.callsMade,
      meetingsScheduled: raw.meetingsScheduled,
      dealsClosed: raw.dealsClosed,
      avgTicket: raw.avgDealAmount ?? 0,
      conversionRatePercent:
        raw.qualifiedCount > 0 ? Math.round((raw.dealsClosed / raw.qualifiedCount) * 1000) / 10 : 0,
      topLossReason: topLossRow?.lossReason ?? undefined,
    };
  }
}

export const sellerPerformanceAggregator = new SellerPerformanceAggregatorService();
