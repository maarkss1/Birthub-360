import { PhoneCall, Target } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useAuth } from '../../../contexts/AuthContext';
import { hasRequiredRole } from '../../../lib/auth/authorization';
import { toast } from '../../../lib/toast';
import { voiceCommandBus } from '../../../lib/voiceCommandBus';
import { type MesaQueueResponse, mesaTratamentoApi } from '../mesaTratamento.api';
import { CurrentLeadCard } from './CurrentLeadCard';
import { ManagementPanel } from './ManagementPanel';
import { PomodoroWidget } from './PomodoroWidget';
import { QueueList } from './QueueList';
import { SdrDashboard } from './SdrDashboard';

type MesaTab = 'fila' | 'dashboard';

/** Página da Mesa de Tratamento SDR. ADMIN/GESTOR e CLOSER/SDR veem a mesma fila (ADMIN/GESTOR sem
 *  filtro de dono = fila do time todo); ADMIN/GESTOR adicionalmente veem o painel de gestão
 *  (`ManagementPanel`) abaixo do lead atual — reatribuir responsável, comentar, marcar decidido. */
export function MesaTratamento() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<MesaTab>('fila');
  const [data, setData] = useState<MesaQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mesaTratamentoApi.queue();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a fila.');
      toast.error('Falha ao carregar a Mesa de Tratamento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Comando de voz "sincronizar" — reusa o mesmo assistente global de voz do resto do app (ver
  // PomodoroWidget.tsx para o comentário completo sobre por que via voiceCommandBus em vez de um
  // microfone próprio desta tela).
  useEffect(() => {
    voiceCommandBus.registerCommands('mesa-tratamento:fila', [
      {
        keywords: ['sincronizar', 'atualizar fila'],
        phrase: 'sincronizar',
        confirmationLabel: 'Fila sincronizada',
        handler: loadQueue,
      },
    ]);
    return () => voiceCommandBus.unregister('mesa-tratamento:fila');
  }, [loadQueue]);

  function renderFila() {
    if (loading && !data) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.7fr] gap-4">
          <Skeleton className="h-[520px] rounded-card" />
          <Skeleton className="h-[520px] rounded-card" />
        </div>
      );
    }

    if (error && !data) {
      return (
        <EmptyState
          title="Não foi possível carregar a Mesa de Tratamento"
          description={error}
          actionLabel="Tentar novamente"
          onAction={loadQueue}
          icon={<PhoneCall className="w-8 h-8 text-brand" />}
        />
      );
    }

    if (!data?.connectionId) {
      return (
        <EmptyState
          title="Bitrix24 não conectado"
          description="Conecte um portal Bitrix24 em Configurações antes de usar a Mesa de Tratamento."
          icon={<PhoneCall className="w-8 h-8 text-brand" />}
        />
      );
    }

    if (!data.current) {
      return (
        <EmptyState
          title="Fila produtiva zerada 🎯"
          description={`Nenhum Lead aberto atribuído a ${currentUser?.name ?? 'você'} no momento.`}
          actionLabel="Atualizar"
          onAction={loadQueue}
          icon={<Target className="w-8 h-8 text-brand" />}
        />
      );
    }

    const isManager = hasRequiredRole(currentUser?.role ?? '', ['ADMIN', 'GESTOR']);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.7fr] gap-4 items-start">
        <div className="space-y-4">
          <CurrentLeadCard
            lead={data.current}
            leadStatuses={data.leadStatuses}
            onRegistered={loadQueue}
          />
          {isManager && (
            <ManagementPanel
              leadId={data.current.id}
              connectionId={data.connectionId}
              onActionComplete={loadQueue}
            />
          )}
        </div>
        <QueueList queue={data.queue} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PomodoroWidget />

      <div className="flex gap-1.5 border-b border-line">
        {[
          { value: 'fila' as const, label: 'Fila' },
          { value: 'dashboard' as const, label: 'Dashboard' },
        ].map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`border-b-2 px-3 pb-2.5 text-sm font-bold transition-colors duration-200 ${
              tab === t.value
                ? 'border-brand text-ink'
                : 'border-transparent text-ink-2 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fila' ? renderFila() : <SdrDashboard />}
    </div>
  );
}
