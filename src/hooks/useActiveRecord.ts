import { useContext } from 'react';
import {
  ActiveRecordContext,
  type ActiveRecordContextValue,
} from '../contexts/activeRecord';

export function useActiveRecord(): ActiveRecordContextValue {
  const context = useContext(ActiveRecordContext);
  if (!context) throw new Error('useActiveRecord deve ser usado dentro de ActiveRecordProvider');
  return context;
}
