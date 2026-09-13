import type {
  Attachment,
  AttachmentEntityType,
  AttachmentRepository,
  CreateAttachmentInput,
} from '../domain/Attachment';
import { prisma } from '../../../lib/prisma';

const ENTITY_FK: Record<AttachmentEntityType, 'leadId' | 'companyId' | 'contactId'> = {
  lead: 'leadId',
  company: 'companyId',
  contact: 'contactId',
};

export class PrismaAttachmentRepository implements AttachmentRepository {
  async verifyEntity(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
  ): Promise<boolean> {
    if (entityType === 'lead') {
      return !!(await prisma.lead.findFirst({ where: { id: entityId, organizationId } }));
    }
    if (entityType === 'company') {
      return !!(await prisma.company.findFirst({ where: { id: entityId, organizationId } }));
    }
    return !!(await prisma.contact.findFirst({ where: { id: entityId, organizationId } }));
  }

  async findByEntity(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
  ): Promise<Attachment[]> {
    const isValid = await this.verifyEntity(organizationId, entityType, entityId);
    if (!isValid) throw new Error(`${entityType} not found`);

    return prisma.attachment.findMany({
      where: { [ENTITY_FK[entityType]]: entityId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createForEntity(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
    input: CreateAttachmentInput,
  ): Promise<Attachment> {
    const isValid = await this.verifyEntity(organizationId, entityType, entityId);
    if (!isValid) throw new Error(`${entityType} not found`);

    return prisma.attachment.create({
      data: {
        organizationId,
        [ENTITY_FK[entityType]]: entityId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        objectKey: input.objectKey,
        uploadedBy: input.uploadedBy,
      },
    });
  }

  async findOwned(organizationId: string, attachmentId: string): Promise<Attachment | null> {
    return prisma.attachment.findFirst({ where: { id: attachmentId, organizationId } });
  }

  async delete(organizationId: string, attachmentId: string): Promise<Attachment | undefined> {
    const existing = await this.findOwned(organizationId, attachmentId);
    if (!existing) throw new Error('Attachment not found');
    return prisma.attachment.delete({ where: { id: attachmentId } });
  }
}
