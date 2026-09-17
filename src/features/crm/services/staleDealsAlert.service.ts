import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../lib/prisma.js';

export interface StaleDealAlert {
  leadId: string;
  organizationId: string | null;
  leadStatus: string;
  daysInactive: number;
  healthScore: number;
  reason: string;
  owner: string;
}

export class StaleDealsAlertService {
  constructor(private db: PrismaClient = defaultPrisma) {}

  calculateHealthScore(daysInactive: number, hasOwner: boolean, score: number): number {
    let health = score || 50;

    if (daysInactive > 14) {
      health -= 40;
    } else if (daysInactive > 7) {
      health -= 20;
    } else if (daysInactive > 3) {
      health -= 10;
    }

    if (!hasOwner) {
      health -= 15;
    }

    return Math.max(0, Math.min(100, health));
  }

  async findStaleDeals(
    organizationId: string,
    staleDaysThreshold = 5
  ): Promise<StaleDealAlert[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - staleDaysThreshold);

    const leads = await this.db.lead.findMany({
      where: {
        organizationId,
        updatedAt: {
          lt: thresholdDate,
        },
        status: {
          notIn: [
            'Convertido_em_Oportunidade',
            'Lead_Desqualificado',
            'Negocios_Perdidos',
            'Negocios_Ganhos',
          ],
        },
      },
    });

    const now = Date.now();
    return leads.map((lead) => {
      const daysInactive = Math.floor(
        (now - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const healthScore = this.calculateHealthScore(
        daysInactive,
        Boolean(lead.owner),
        lead.score ?? 50
      );

      return {
        leadId: lead.id,
        organizationId: lead.organizationId,
        leadStatus: lead.status,
        daysInactive,
        healthScore,
        owner: lead.owner || 'Não atribuído',
        reason: `Oportunidade sem atualização há ${daysInactive} dias (Score de Saúde: ${healthScore}/100)`,
      };
    });
  }
}

export const staleDealsAlertService = new StaleDealsAlertService();
