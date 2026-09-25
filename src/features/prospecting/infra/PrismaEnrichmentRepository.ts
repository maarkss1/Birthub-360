import type { Company, Prisma, Contact, EnrichmentLog } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import type { IEnrichmentRepository } from '../domain/IEnrichmentRepository.js';
export type { IEnrichmentRepository };

export class PrismaEnrichmentRepository implements IEnrichmentRepository {
  async findCompanyById(id: string, organizationId: string): Promise<Company | null> {
    return prisma.company.findFirst({ where: { id, organizationId } });
  }

  async updateCompany(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
    return prisma.company.update({ where: { id }, data });
  }

  async findContactsEmailsAndPhones(
    companyId: string,
  ): Promise<Pick<Contact, 'email' | 'phone'>[]> {
    return prisma.contact.findMany({ where: { companyId }, select: { email: true, phone: true } });
  }

  async createContacts(data: Prisma.ContactCreateManyInput[]): Promise<number> {
    if (data.length === 0) return 0;
    const res = await prisma.contact.createMany({ data });
    return res.count;
  }

  async createEnrichmentLog(
    data: Prisma.EnrichmentLogUncheckedCreateInput,
  ): Promise<EnrichmentLog> {
    return prisma.enrichmentLog.create({ data });
  }
}

export const defaultEnrichmentRepository = new PrismaEnrichmentRepository();
