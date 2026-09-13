import type { Repository } from '../../../../shared/domain/Repository';
import type { PlaybookKey } from '../../../../config/playbooks';

export type QualificationBrand = PlaybookKey;
export type QualificationFramework = 'SPIN' | 'BANT' | 'MEDDPICC' | 'SNAP' | 'CHALLENGER';
export type QualificationCategory =
  | 'Situação'
  | 'Problema'
  | 'Implicação/Custo'
  | 'Necessidade/ROI';

export interface QualificationMatrixItem {
  id: string;
  organizationId: string;
  brand: QualificationBrand;
  segment: string;
  persona: string;
  framework: QualificationFramework;
  questionCategory: QualificationCategory;
  questionText: string;
  idealAnswer: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualificationMatrixItemRepository extends Repository<QualificationMatrixItem> {
  findAllWithFilters(
    organizationId: string,
    brand?: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: QualificationMatrixItem[]; meta: unknown }>;
}
