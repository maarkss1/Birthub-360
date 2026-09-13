import type { Note, NoteEntityType, NoteRepository } from '../domain/Note';
import { prisma } from '../../../lib/prisma';

const ENTITY_FK: Record<NoteEntityType, 'leadId' | 'companyId' | 'contactId'> = {
  lead: 'leadId',
  company: 'companyId',
  contact: 'contactId',
};

export class PrismaNoteRepository implements NoteRepository {
  async verifyEntity(
    organizationId: string,
    entityType: NoteEntityType,
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
    entityType: NoteEntityType,
    entityId: string,
  ): Promise<Note[]> {
    const isValid = await this.verifyEntity(organizationId, entityType, entityId);
    if (!isValid) throw new Error(`${entityType} not found`);

    return prisma.note.findMany({
      where: { [ENTITY_FK[entityType]]: entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createForEntity(
    organizationId: string,
    entityType: NoteEntityType,
    entityId: string,
    content: string,
    author: string,
  ): Promise<Note> {
    const isValid = await this.verifyEntity(organizationId, entityType, entityId);
    if (!isValid) throw new Error(`${entityType} not found`);

    // Registra na Timeline só para Lead: TimelineEvent continua exclusivo de Lead (fora do
    // escopo de CRM-004/005, que pedem só Notes/Attachments cross-entity) — Company/Contact não
    // têm timeline própria hoje.
    if (entityType === 'lead') {
      const [note] = await prisma.$transaction([
        prisma.note.create({ data: { content, author, leadId: entityId } }),
        prisma.timelineEvent.create({
          data: {
            type: 'comment',
            description: `Nova nota adicionada por ${author}`,
            leadId: entityId,
          },
        }),
      ]);
      return note;
    }

    return prisma.note.create({
      data: { content, author, [ENTITY_FK[entityType]]: entityId },
    });
  }

  async delete(organizationId: string, noteId: string): Promise<Note> {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        lead: { select: { organizationId: true } },
        company: { select: { organizationId: true } },
        contact: { select: { organizationId: true } },
      },
    });

    const parentOrgId =
      note?.lead?.organizationId ?? note?.company?.organizationId ?? note?.contact?.organizationId;

    if (!note || parentOrgId !== organizationId) {
      throw new Error('Note not found');
    }

    return prisma.note.delete({ where: { id: noteId } });
  }
}
