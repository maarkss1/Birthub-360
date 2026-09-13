import { Loader2 } from 'lucide-react';
import { lazy, type ReactNode, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDailyClosingGate } from '../../contexts/DailyClosingContext';

const ChangePasswordGate = lazy(() =>
  import('../../features/auth/components/ChangePasswordGate').then((m) => ({
    default: m.ChangePasswordGate,
  })),
);

const DailyClosingGate = lazy(() =>
  import('../../features/commercial-intelligence/components/DailyClosingGate').then((m) => ({
    default: m.DailyClosingGate,
  })),
);

const FullScreenLoader = () => (
  <div className="min-h-screen bg-bg flex items-center justify-center">
    <Loader2 className="animate-spin text-[var(--brand-primary)] w-8 h-8" />
  </div>
);

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser, isPending } = useAuth();
  const { pendingClosing, markResolved } = useDailyClosingGate();

  if (isPending) {
    return <FullScreenLoader />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Senha temporária/padrão definida por um admin — bloqueia o resto do app até trocar.
  if (currentUser.mustChangePassword) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <ChangePasswordGate />
      </Suspense>
    );
  }

  // `pendingClosing` só fica definido depois que `DailyClosingProvider` checa (uma vez por sessão,
  // não a cada troca de rota) se há um fechamento de Plano Diário em aberto — ver
  // DailyClosingContext.tsx. Enquanto isso não resolve, mostramos o mesmo loader do restante do
  // gate para não piscar conteúdo e em seguida bloquear.
  if (pendingClosing === undefined) {
    return <FullScreenLoader />;
  }

  if (pendingClosing.pending) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <DailyClosingGate pending={pendingClosing} onClosed={markResolved} />
      </Suspense>
    );
  }

  return <>{children}</>;
}
