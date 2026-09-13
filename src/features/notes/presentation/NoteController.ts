import type { NextFunction, Request, Response } from 'express';
import { routeParam } from '../../../shared/http/routeParams';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken';
import type { NoteUseCases } from '../application/NoteUseCases';

export class NoteController {
  constructor(private noteUseCases: NoteUseCases) {}

  createNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const leadId = routeParam(req.params.leadId, 'leadId');
      const note = await this.noteUseCases.createNote(orgId, leadId, req.body);
      res.status(201).json({ success: true, data: note });
    } catch (error) {
      next(error);
    }
  };

  getNotesByLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId: orgId } = (req as AuthRequest).user;
      const leadId = routeParam(req.params.leadId, 'leadId');
      const notes = await this.noteUseCases.findNotesByLead(orgId, leadId);
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
