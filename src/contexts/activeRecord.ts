import { createContext } from 'react';

export interface ActiveRecord {
  type: 'company' | 'contact' | 'lead' | 'deal' | 'document';
  id: string;
  label: string;
  /** Linha curta de contexto (segmento/cidade, cargo/canal, status/temperatura ou etapa do negócio). */
  summary?: string;
}

export interface ActiveRecordContextValue {
  activeRecord: ActiveRecord | null;
  setActiveRecord: (record: ActiveRecord) => void;
  /** Só limpa se o id ainda for o registro ativo — evita que um unmount atrasado apague um registro mais novo. */
  clearActiveRecord: (id: string) => void;
}

export const ActiveRecordContext = createContext<ActiveRecordContextValue | undefined>(undefined);
