import { randomUUID } from 'node:crypto';
import { getDownloadUrl, getUploadUrl } from '../../../lib/storage/index.js';
import { attachmentCompleteSchema, attachmentUploadUrlSchema } from '../../../lib/zod.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import type { AttachmentEntityType, AttachmentRepository } from '../domain/Attachment.js';

// Só o essencial pra compor um caminho de objeto legível no bucket — nunca usado pra decidir
// permissão nem persistido como identificador (isso é objectKey, gerado à parte com randomUUID).
function sanitizeFileNameForKey(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() || 'arquivo';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
}

export class AttachmentUseCases {
  constructor(private attachmentRepository: AttachmentRepository) {}

  async requestUploadUrl(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
    input: unknown,
  ) {
    const validated = attachmentUploadUrlSchema.parse(input);

    const isValid = await this.attachmentRepository.verifyEntity(
      organizationId,
      entityType,
      entityId,
    );
    if (!isValid) throw new AppError(`${entityType} não encontrado.`, 404);

    const objectKey = `crm-attachments/${organizationId}/${entityType}/${entityId}/${randomUUID()}-${sanitizeFileNameForKey(validated.fileName)}`;
    const { signedUrl } = await getUploadUrl(objectKey, validated.mimeType);

    return { signedUrl, objectKey, fileName: validated.fileName, mimeType: validated.mimeType };
  }

  async completeUpload(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
    uploadedBy: string | null,
    input: unknown,
  ) {
    const validated = attachmentCompleteSchema.parse(input);

    // Mesma trava de tenant do objectKey (sempre `crm-attachments/${organizationId}/...`, gerado
    // só por requestUploadUrl acima) — impede completar o registro com uma key de outra
    // organização, mesmo que o cliente tente informar uma manualmente.
    const expectedPrefix = `crm-attachments/${organizationId}/`;
    if (!validated.objectKey.startsWith(expectedPrefix)) {
      throw new AppError('objectKey inválido para esta organização.', 400);
    }

    return this.attachmentRepository.createForEntity(organizationId, entityType, entityId, {
      fileName: validated.fileName,
      mimeType: validated.mimeType,
      sizeBytes: validated.sizeBytes,
      objectKey: validated.objectKey,
      uploadedBy,
    });
  }

  async listByEntity(organizationId: string, entityType: AttachmentEntityType, entityId: string) {
    return this.attachmentRepository.findByEntity(organizationId, entityType, entityId);
  }

  async getDownloadUrl(organizationId: string, attachmentId: string) {
    const attachment = await this.attachmentRepository.findOwned(organizationId, attachmentId);
    if (!attachment) throw new AppError('Anexo não encontrado.', 404);
    const { signedUrl } = await getDownloadUrl(attachment.objectKey);
    return { signedUrl, fileName: attachment.fileName, mimeType: attachment.mimeType };
  }

  async delete(organizationId: string, attachmentId: string) {
    return this.attachmentRepository.delete?.(organizationId, attachmentId);
  }
}
