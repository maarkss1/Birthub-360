import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { commercialIntelligenceApi } from '../features/commercial-intelligence/commercialIntelligence.api';
import type { PendingDailyClosing } from '../shared/contracts/dailyPlan.contract';

interface DailyClosingContextType {
  /** undefined enquanto a checagem ainda não rodou (ou está em voo) para o usuário atual. */
  pendingClosing: PendingDailyClosing | undefined;
  /** Marca a pendência atual como resolvida sem esperar um novo round-trip ao servidor. */
  markResolved: () => void;
}

const DailyClosingContext = createContext<DailyClosingContextType | undefined>(undefined);

/**
 * Checa uma única vez por sessão (não a cada navegação/rota) se o usuário tem um fechamento de
 * Plano Diário pendente — ver `ProtectedRoute.tsx`/`DailyClosingGate.tsx`. Fica no nível de
 * contexto (como `AuthContext`) em vez de dentro de `ProtectedRoute` porque essa rota é montada
 * de novo a cada troca de página; sem esse cache, cada navegação repetiria a chamada.
 *
 * Fail-open deliberado: se a checagem falhar (rede, backend fora do ar), tratamos como "sem
 * pendência" em vez de bloquear o app inteiro por causa de uma indisponibilidade não relacionada —
 * ver regra 8 do CLAUDE.md (UX nunca sacrificado).
 */
export function DailyClosingProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [pendingClosing, setPendingClosing] = useState<PendingDailyClosing | undefined>(undefined);
  const checkedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.mustChangePassword) {
      checkedForUserId.current = null;
      setPendingClosing(undefined);
      return;
    }
    if (checkedForUserId.current === currentUser.id) return;
    checkedForUserId.current = currentUser.id;

    let cancelled = false;
    commercialIntelligenceApi
      .getPendingDailyClosing()
      .then((res) => {
        if (!cancelled) setPendingClosing(res ?? { pending: false });
      })
      .catch(() => {
        if (!cancelled) setPendingClosing({ pending: false });
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const markResolved = useCallback(() => {
    setPendingClosing({ pending: false });
  }, []);

  return (
    <DailyClosingContext.Provider value={{ pendingClosing, markResolved }}>
      {children}
    </DailyClosingContext.Provider>
  );
}

export function useDailyClosingGate() {
  const context = useContext(DailyClosingContext);
  if (!context) {
    throw new Error('useDailyClosingGate deve ser usado dentro de um DailyClosingProvider');
  }
  return context;
}
