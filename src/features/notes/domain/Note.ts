import type { Repository } from '../../../shared/domain/Repository';

export type NoteEntityType = 'lead' | 'company' | 'contact';

export interface Note {
  id: string;
  content: string;
  author: string;
  leadId: string | null;
  companyId: string | null;
  contactId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteRepository extends Repository<Note> {
  findByEntity(
    organizationId: string,
    entityType: NoteEntityType,
    entityId: string,
  ): Promise<Note[]>;
  createForEntity(
    organizationId: string,
    entityType: NoteEntityType,
    entityId: string,
    content: string,
    author: string,
  ): Promise<Note>;
  verifyEntity(
    organizationId: string,
    entityType: NoteEntityType,
    entityId: string,
  ): Promise<boolean>;
}
