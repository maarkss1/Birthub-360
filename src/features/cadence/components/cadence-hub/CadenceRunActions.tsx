import { CalendarClock, Pause, Play, Square } from 'lucide-react';
import { useState } from 'react';
import { useConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { toast } from '../../../../lib/toast';
import { type CadenceRunDTO, cadenceApi } from '../../cadence.api';

export function CadenceRunActions({
  run,
  onChanged,
  onScheduleMeeting,
}: {
  run: CadenceRunDTO;
  onChanged: () => void;
  onScheduleMeeting: () => void;
}) {
  const [pending, setPending] = useState<'pause' | 'resume' | 'stop' | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const confirmStop = () =>
    confirm({
      title: 'Parar cadência',
      description:
        'Parar esta cadência? Diferente de pausar, uma cadência parada não pode ser retomada.',
      confirmLabel: 'Parar',
      variant: 'danger',
    });

  const scheduleButton = (
    <button
      type="button"
      onClick={onScheduleMeeting}
      aria-label={`Agendar reunião confirmada com o lead ${run.leadId}`}
      title="Agendar reunião confirmada"
      className="p-1.5 text-ink-2 hover:text-brand hover:bg-surface-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <CalendarClock className="w-3.5 h-3.5" />
    </button>
  );

  const runAction = async (
    action: 'pause' | 'resume' | 'stop',
    fn: () => Promise<CadenceRunDTO>,
    successMessage: string,
  ) => {
    setPending(action);
    try {
      await fn();
      toast.success(successMessage);
      onChanged();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível concluir a ação.');
    } finally {
      setPending(null);
    }
  };

  if (run.status === 'active') {
    return (
      <div className="flex items-center justify-end gap-1">
        {scheduleButton}
        <button
          type="button"
          onClick={() => runAction('pause', () => cadenceApi.pauseRun(run.id), 'Cadência pausada.')}
          disabled={pending !== null}
          aria-label={`Pausar cadência do lead ${run.leadId}`}
          title="Pausar"
          className="p-1.5 text-ink-2 hover:text-brand hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Pause className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!(await confirmStop())) return;
            void runAction('stop', () => cadenceApi.stopRun(run.id), 'Cadência parada.');
          }}
          disabled={pending !== null}
          aria-label={`Parar cadência do lead ${run.leadId}`}
          title="Parar"
          className="p-1.5 text-ink-2 hover:text-danger-active dark:hover:text-danger hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        {dialog}
      </div>
    );
  }

  if (run.status === 'paused') {
    return (
      <div className="flex items-center justify-end gap-1">
        {scheduleButton}
        <button
          type="button"
          onClick={() =>
            runAction('resume', () => cadenceApi.resumeRun(run.id), 'Cadência retomada.')
          }
          disabled={pending !== null}
          aria-label={`Retomar cadência do lead ${run.leadId}`}
          title="Retomar"
          className="p-1.5 text-ink-2 hover:text-brand hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Play className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!(await confirmStop())) return;
            void runAction('stop', () => cadenceApi.stopRun(run.id), 'Cadência parada.');
          }}
          disabled={pending !== null}
          aria-label={`Parar cadência do lead ${run.leadId}`}
          title="Parar"
          className="p-1.5 text-ink-2 hover:text-danger-active dark:hover:text-danger hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        {dialog}
      </div>
    );
  }

  return <span className="text-ink-2 text-right block">—</span>;
}
