import { BaseUseCases } from '../../../../shared/application/BaseUseCases';
import {
  type QualificationMatrixItemInput,
  qualificationMatrixItemSchema,
} from '../../playbook.schema';
import type {
  QualificationMatrixItem,
  QualificationMatrixItemRepository,
} from '../domain/QualificationMatrixItem';

export class QualificationMatrixUseCases extends BaseUseCases<
  QualificationMatrixItem,
  QualificationMatrixItemRepository
> {
  // biome-ignore lint/complexity/noUselessConstructor: expõe publicamente o construtor protected da base para a DI
  constructor(repository: QualificationMatrixItemRepository) {
    super(repository);
  }

  // Página fixa (1, 200) era um bug latente: organizações com mais de 200 perguntas cadastradas
  // numa marca perdiam os itens excedentes silenciosamente, mesmo o repositório já suportando
  // paginação real (`findAllWithFilters`) — achado do Piloto 017, corrigido propagando page/limit
  // até aqui em vez de fixá-los.
  // limit=200 preserva o default usado pelos chamadores legados que não passam `limit` (ex.:
  // usePlaybookMatrixData.ts, consumido pelo Chatbook) — só QualificationMatrixPage passa um
  // `limit` menor (paginação real de UI).
  async findItems(organizationId: string, brand?: string, page: number = 1, limit: number = 200) {
    return this.findAll(organizationId, brand, page, limit);
  }

  async createItem(organizationId: string, data: QualificationMatrixItemInput) {
    const validated = qualificationMatrixItemSchema.parse(data);
    return this.create(organizationId, validated);
  }

  async updateItem(
    organizationId: string,
    id: string,
    data: Partial<QualificationMatrixItemInput>,
  ) {
    const validated = qualificationMatrixItemSchema.partial().parse(data);
    return this.update(organizationId, id, validated);
  }

  async deleteItem(organizationId: string, id: string) {
    return this.delete(organizationId, id);
  }
}
