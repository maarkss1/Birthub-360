import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { contactService } from '../../src/features/contacts/services/contact.service';
import { CompanyFactory, ContactFactory } from '../helpers/factories';

describe('ContactService Integration', () => {
  beforeEach(async () => {
    await prisma.contact.deleteMany();
    await prisma.company.deleteMany();
  });

  describe('create', () => {
    it('should create a new contact with a company successfully', async () => {
      const company = await prisma.company.create({
        data: CompanyFactory.build({ organizationId: 'test-org-id' }),
      });
      const data = ContactFactory.build({ companyId: company.id, organizationId: 'test-org-id' });
      delete (data as any).company;
      delete (data as any).organizationId;

      const result = await contactService.create('test-org-id', data as never);
      expect(result.companyId).toBe(company.id);
    });
  });
});
