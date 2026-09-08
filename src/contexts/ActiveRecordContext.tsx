import { useCallback, useState, type ReactNode } from 'react';
import { ActiveRecordContext, type ActiveRecord } from './activeRecord';

export type { ActiveRecord } from './activeRecord';

/**
 * Registro comercial (empresa/negócio) atualmente aberto na tela, para que o copiloto de IA global
 * (FloatingChatbook/useAssistantChat) saiba do que o usuário está falando sem precisar repetir o
 * contexto na pergunta. Telas de detalhe registram-se aqui ao montar e se removem ao desmontar.
 */
export function ActiveRecordProvider({ children }: { children: ReactNode }) {
  const [activeRecord, setActiveRecordState] = useState<ActiveRecord | null>(null);

  const setActiveRecord = useCallback((record: ActiveRecord) => {
    setActiveRecordState(record);
  }, []);

  const clearActiveRecord = useCallback((id: string) => {
    setActiveRecordState((prev) => (prev?.id === id ? null : prev));
  }, []);

  return (
    <ActiveRecordContext.Provider value={{ activeRecord, setActiveRecord, clearActiveRecord }}>
      {children}
    </ActiveRecordContext.Provider>
  );
}

