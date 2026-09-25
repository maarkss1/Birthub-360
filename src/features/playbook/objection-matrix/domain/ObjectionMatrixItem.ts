import type { PlaybookKey } from '../../../../config/playbooks.js';
import type { Repository } from '../../../../shared/domain/Repository.js';

export type ObjectionBrand = PlaybookKey;

export interface ObjectionMatrixItem {
  id: string;
  organizationId: string;
  brand: ObjectionBrand;
  segment: string;
  persona: string;
  objectionTitle: string;
  objectionText: string;
  responseScript: string;
  keyDifferentiator: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ObjectionMatrixItemRepository extends Repository<ObjectionMatrixItem> {
  findAllWithFilters(
    organizationId: string,
    brand?: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: ObjectionMatrixItem[]; meta: unknown }>;
}
