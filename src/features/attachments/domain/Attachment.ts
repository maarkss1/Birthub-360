import type { Repository } from '../../../shared/domain/Repository';

export type AttachmentEntityType = 'lead' | 'company' | 'contact';

export interface Attachment {
  id: string;
  leadId: string | null;
  companyId: string | null;
  contactId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  objectKey: string;
  uploadedBy: string | null;
  organizationId: string;
  createdAt: Date;
}

export interface CreateAttachmentInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  objectKey: string;
  uploadedBy: string | null;
}

export interface AttachmentRepository extends Repository<Attachment> {
  verifyEntity(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
  ): Promise<boolean>;
  findByEntity(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
  ): Promise<Attachment[]>;
  createForEntity(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
    input: CreateAttachmentInput,
  ): Promise<Attachment>;
  findOwned(organizationId: string, attachmentId: string): Promise<Attachment | null>;
}
