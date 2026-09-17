import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../lib/prisma.js';

export interface OptOutRegistration {
  organizationId: string;
  contactValue: string; // e-mail ou telefone
  channel: 'Email' | 'WhatsApp' | 'Voice' | 'Global';
  reason?: string;
}

export class BlacklistOptOutService {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async registerOptOut(registration: OptOutRegistration) {
    const normalizedValue = registration.contactValue.trim().toLowerCase();
    const isEmail = normalizedValue.includes('@');

    return this.db.optOutRecord.create({
      data: {
        organizationId: registration.organizationId,
        email: isEmail ? normalizedValue : null,
        phoneE164: !isEmail ? normalizedValue : null,
        scope: registration.channel,
        originChannel: 'manual',
        reason: registration.reason || 'Solicitação direta do destinatário',
      },
    });
  }

  async isOptedOut(
    organizationId: string,
    contactValue: string,
    channel: 'Email' | 'WhatsApp' | 'Voice'
  ): Promise<boolean> {
    const normalizedValue = contactValue.trim().toLowerCase();
    const isEmail = normalizedValue.includes('@');

    const entry = await this.db.optOutRecord.findFirst({
      where: {
        organizationId,
        ...(isEmail ? { email: normalizedValue } : { phoneE164: normalizedValue }),
        scope: {
          in: [channel, 'Global'],
        },
      },
    });

    return Boolean(entry);
  }
}

export const blacklistOptOutService = new BlacklistOptOutService();
