import type { NextFunction, Request, Response } from 'express';
import { routeParam } from '../../../shared/http/routeParams';
import { AppError } from '../../../shared/middlewares/errorHandler';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken';
import type { NoteUseCases } from '../application/NoteUseCases';
import type { NoteEntityType } from '../domain/Note';

/**
 * O mesmo router (note.routes.ts) é montado em três prefixos diferentes
 * (/api/leads/:leadId/notes, /api/companies/:companyId/notes, /api/contacts/:contactId/notes) —
 * exatamente um destes três params chega preenchido por request, dependendo de qual prefixo bateu.
 */
function resolveEntity(req: Request): { entityType: NoteEntityType; entityId: string } {
  if (req.params.leadId) return { entityType: 'lead', entityId: routeParam(req.params.leadId, 'leadId') };
  if (req.params.companyId)
    return { entityType: 'company', entityId: routeParam(req.params.companyId, 'companyId') };
  if (req.params.contactId)
    return { entityType: 'contact', entityId: routeParam(req.params.contactId, 'contactId') };
  throw new AppError('Nenhuma entidade (lead/company/contact) informada na rota.', 400);
}

export class NoteController {
  constructor(private noteUseCases: NoteUseCases) {}

  createNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const { entityType, entityId } = resolveEntity(req);
      const note = await this.noteUseCases.createNote(orgId, entityType, entityId, req.body);
      res.status(201).json({ success: true, data: note });
    } catch (error) {
      next(error);
    }
  };

  getNotesByEntity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const { entityType, entityId } = resolveEntity(req);
      const notes = await this.noteUseCases.findNotesByEntity(orgId, entityType, entityId);
      res.json({ success: true, data: notes });
    } catch (error) {
      next(error);
    }
  };

  deleteNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      await this.noteUseCases.deleteNote(orgId, routeParam(req.params.noteId, 'noteId'));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
