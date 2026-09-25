import type { z } from 'zod';
import { noteSchema } from '../../../lib/zod.js';
import type { NoteEntityType, NoteRepository } from '../domain/Note.js';

export class NoteUseCases {
  constructor(private noteRepository: NoteRepository) {}

  async createNote(
    organizationId: string,
    entityType: NoteEntityType,
    entityId: string,
    data: z.infer<typeof noteSchema>,
  ) {
    const validated = noteSchema.parse(data);
    return this.noteRepository.createForEntity(
      organizationId,
      entityType,
      entityId,
      validated.content,
      validated.author,
    );
  }

  async findNotesByEntity(organizationId: string, entityType: NoteEntityType, entityId: string) {
    return this.noteRepository.findByEntity(organizationId, entityType, entityId);
  }

  async deleteNote(organizationId: string, noteId: string) {
    return this.noteRepository.delete?.(organizationId, noteId);
  }
}
