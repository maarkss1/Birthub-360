import { prisma } from '../../../lib/prisma.js';
import type {
  SellerPerformancePeriod,
  SellerPerformanceRawMetrics,
  SellerPerformanceRepository,
} from '../domain/SellerPerformance.js';

// Mesmo recorte de "qualificado" de PrismaAnalyticsRepository.groupQualifiedLeadsByOwner: saiu das
// duas primeiras etapas do funil e não foi desqualificado. Deliberadamente NÃO escopado ao período
// (lifetime, como o resto do app já faz) — não existe um carimbo de "data de qualificação" no
// schema para recortar isso por semana sem inventar um.
const QUALIFIED_EXCLUDED_STATUSES = ['Lead_Recebido', 'Cadencia_Iniciada', 'Lead_Desqualificado'];

/** Adaptador Prisma real de `SellerPerformanceRepository` — mesmas seis queries que viviam antes direto em `sellerPerformanceAggregator.service.ts`. */
export class PrismaSellerPerformanceRepository implements SellerPerformanceRepository {
  async getRawMetrics(
    organizationId: string,
    owner: string,
    period: SellerPerformancePeriod,
  ): Promise<SellerPerformanceRawMetrics> {
    const { from, to } = period;

    const [
      callsMade,
      meetingsScheduled,
      dealsAggregate,
      dealsClosed,
      qualifiedCount,
      lossReasonRows,
    ] = await Promise.all([
      prisma.activity.count({
        where: {
          organizationId,
          owner,
          type: 'Ligacao',
          date: { gte: from, lt: to },
          deletedAt: null,
        },
      }),
      prisma.activity.count({
        where: {
          organizationId,
          owner,
          type: 'Reuniao',
          date: { gte: from, lt: to },
          deletedAt: null,
        },
      }),
      prisma.lead.aggregate({
        where: {
          organizationId,
          owner,
          status: 'Negocios_Ganhos',
          closedAt: { gte: from, lt: to },
          deletedAt: null,
        },
        _avg: { amount: true },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          owner,
          status: 'Negocios_Ganhos',
          closedAt: { gte: from, lt: to },
          deletedAt: null,
        },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          owner,
          deletedAt: null,
          status: { notIn: QUALIFIED_EXCLUDED_STATUSES as unknown as never[] },
        },
      }),
      prisma.lead.groupBy({
        by: ['lossReason'],
        where: {
          organizationId,
          owner,
          deletedAt: null,
          status: 'Negocios_Perdidos',
          closedAt: { gte: from, lt: to },
        },
        _count: { _all: true },
      }),
    ]);

    return {
      callsMade,
      meetingsScheduled,
      avgDealAmount: dealsAggregate._avg?.amount ?? null,
      dealsClosed,
      qualifiedCount,
      lossReasonCounts: lossReasonRows.map((row) => ({
        lossReason: row.lossReason,
        count: row._count._all,
      })),
    };
  }
}

/** Instância única, sem estado próprio além da conexão Prisma já compartilhada pelo app — mesmo padrão de `prismaOptOutRepository`. */
export const prismaSellerPerformanceRepository = new PrismaSellerPerformanceRepository();
