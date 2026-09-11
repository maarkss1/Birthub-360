export interface SellerPerformancePeriod {
  from: Date;
  to: Date;
}

export interface AggregatedSellerPerformance {
  callsMade: number;
  meetingsScheduled: number;
  dealsClosed: number;
  avgTicket: number;
  conversionRatePercent: number;
  topLossReason?: string;
}

/** Uma linha de `groupBy(lossReason)` já reduzida ao par que o cálculo de topo precisa. */
export interface LossReasonCount {
  lossReason: string | null;
  count: number;
}

/**
 * Métricas brutas (ainda não combinadas em `AggregatedSellerPerformance`) que o repositório
 * devolve — a combinação (ex.: taxa de conversão, escolha do maior motivo de perda) continua no
 * service, que é lógica de domínio pura e não precisa de Prisma para ser testada.
 */
export interface SellerPerformanceRawMetrics {
  callsMade: number;
  meetingsScheduled: number;
  avgDealAmount: number | null;
  dealsClosed: number;
  qualifiedCount: number;
  lossReasonCounts: LossReasonCount[];
}

/**
 * Porta de acesso a dados do agregador de performance de vendedor. Extraída de
 * `sellerPerformanceAggregator.service.ts` no piloto de migração para repository (ver
 * `docs/architecture/PRISMA-REPOSITORY-MIGRATION-GUIDE.md`) — mesmas seis queries, mesmo shape de
 * retorno; só o acesso direto a `prisma.*` saiu do service.
 */
export interface SellerPerformanceRepository {
  getRawMetrics(
    organizationId: string,
    owner: string,
    period: SellerPerformancePeriod,
  ): Promise<SellerPerformanceRawMetrics>;
}
