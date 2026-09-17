export interface BitrixLeadSummary {
  id: string;
  title: string;
  companyTitle: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  statusLabel: string;
  sourceId: string | null;
  dateCreate: string | null;
  alreadyImported: boolean;
}

export interface BitrixDealSummary {
  id: string;
  title: string;
  stageLabel: string;
  assignedById: string | null;
  dateCreate: string | null;
  opportunity: string | null;
  alreadyImported: boolean;
}

export interface BitrixDealPipeline {
  id: string;
  name: string;
}

export interface BitrixDealStage {
  id: string;
  name: string;
}

export interface BitrixUserOption {
  id: string;
  name: string;
}

export interface BitrixFieldOption {
  code: string;
  label: string;
}

export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const selectClass =
  'h-9 text-sm rounded-xl border border-line bg-surface-2 text-ink px-3 disabled:opacity-40 min-w-[9rem] focus:bg-surface focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors outline-none cursor-pointer';
export const filterLabelClass =
  'text-[10px] font-bold uppercase tracking-wide text-ink-2 flex items-center gap-1';

export interface BitrixImportPanelProps {
  connectionId: string;
}
