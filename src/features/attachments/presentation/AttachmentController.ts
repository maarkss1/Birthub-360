import type { NextFunction, Request, Response } from 'express';
import { routeParam } from '../../../shared/http/routeParams';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken';
import { AppError } from '../../../shared/middlewares/errorHandler';
import type { AttachmentUseCases } from '../application/AttachmentUseCases';
import type { AttachmentEntityType } from '../domain/Attachment';

/**
 * Mesmo padrão de NoteController: este router é montado em três prefixos
 * (/api/leads/:leadId/attachments, /api/companies/:companyId/attachments,
 * /api/contacts/:contactId/attachments) — exatamente um dos três params chega preenchido.
 */
function resolveEntity(req: Request): { entityType: AttachmentEntityType; entityId: string } {
  if (req.params.leadId)
    return { entityType: 'lead', entityId: routeParam(req.params.leadId, 'leadId') };
  if (req.params.companyId)
    return { entityType: 'company', entityId: routeParam(req.params.companyId, 'companyId') };
  if (req.params.contactId)
    return { entityType: 'contact', entityId: routeParam(req.params.contactId, 'contactId') };
  throw new AppError('Nenhuma entidade (lead/company/contact) informada na rota.', 400);
}

export class AttachmentController {
  constructor(private attachmentUseCases: AttachmentUseCases) {}

  requestUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const { entityType, entityId } = resolveEntity(req);
      const result = await this.attachmentUseCases.requestUploadUrl(
        orgId,
        entityType,
        entityId,
        req.body,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  completeUpload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId, id: userId } = (req as AuthRequest).user;
      const { entityType, entityId } = resolveEntity(req);
      const attachment = await this.attachmentUseCases.completeUpload(
        orgId,
        entityType,
        entityId,
        userId,
        req.body,
      );
      res.status(201).json({ success: true, data: attachment });
    } catch (error) {
      next(error);
    }
  };

  listByEntity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const { entityType, entityId } = resolveEntity(req);
      const attachments = await this.attachmentUseCases.listByEntity(orgId, entityType, entityId);
      res.json({ success: true, data: attachments });
    } catch (error) {
      next(error);
    }
  };

  getDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const attachmentId = routeParam(req.params.attachmentId, 'attachmentId');
      const result = await this.attachmentUseCases.getDownloadUrl(orgId, attachmentId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const attachmentId = routeParam(req.params.attachmentId, 'attachmentId');
      await this.attachmentUseCases.delete(orgId, attachmentId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
