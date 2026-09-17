import { AlertTriangle, ListChecks, PowerOff, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../../../components/ui/Card';
import { useConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { toast } from '../../../../lib/toast';
import { type CadenceSequenceDTO, cadenceApi } from '../../cadence.api';
import { formatDateTime } from './types';

export function SequencesSection({ canManage }: { canManage: boolean }) {
  const [data, setData] = useState<CadenceSequenceDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    cadenceApi
      .sequences()
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  const handleDeactivate = async (sequence: CadenceSequenceDTO) => {
    if (
      !(await confirm({
        title: 'Encerrar sequência',
        description: `Encerrar a sequência "${sequence.name}"? Ela deixa de poder ser escolhida para novas cadências — execuções já em andamento não são afetadas.`,
        confirmLabel: 'Encerrar',
        variant: 'danger',
      }))
    )
      return;
    setDeactivatingId(sequence.id);
    try {
      await cadenceApi.deactivateSequence(sequence.id);
      toast.success(`Sequência "${sequence.name}" encerrada.`);
      load();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível encerrar a sequência.');
    } finally {
      setDeactivatingId(null);
    }
  };

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-brand" aria-hidden="true" />
          <h2 className="text-sm font-bold text-ink">Sequências</h2>
          {data && data.length > 0 && (
            <span className="text-[11px] font-semibold text-ink-2 bg-surface-2 border border-line rounded-full px-2 py-0.5">
              {data.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          className="p-1.5 text-ink-2 hover:text-ink hover:bg-surface-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          title="Atualizar"
          aria-label="Atualizar sequências"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div
          className="space-y-2"
          role="status"
          aria-live="polite"
          aria-label="Carregando sequências"
        >
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : error ? (
        <div
          className="flex items-center justify-between gap-3 text-sm text-danger-active dark:text-danger py-4"
          role="alert"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </span>
          <button
            type="button"
            onClick={load}
            className="text-xs font-semibold underline shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
          >
            Tentar de novo
          </button>
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Nenhuma sequência ativa"
          description="Crie uma sequência ou use um modelo de jornada para poder iniciar cadências para leads."
          icon={<ListChecks className="w-8 h-8 text-brand" />}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ink-2 border-b border-line">
                <th className="text-left font-semibold py-1.5 pr-3">Nome</th>
                <th className="text-center font-semibold py-1.5 pr-3">Toques</th>
                <th className="text-right font-semibold py-1.5 pr-3">Criada em</th>
                <th className="text-right font-semibold py-1.5">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((sequence) => (
                <tr key={sequence.id} className="border-b border-line last:border-0">
                  <td className="py-1.5 pr-3">
                    <div className="font-semibold text-ink">{sequence.name}</div>
                    {sequence.description && (
                      <div className="text-ink-2 max-w-sm truncate" title={sequence.description}>
                        {sequence.description}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-center text-ink-2 [font-variant-numeric:tabular-nums]">
                    {sequence.touches.length}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-ink-2 [font-variant-numeric:tabular-nums]">
                    {formatDateTime(sequence.createdAt)}
                  </td>
                  <td className="py-1.5 text-right">
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(sequence)}
                        disabled={deactivatingId !== null}
                        aria-label={`Encerrar sequência ${sequence.name}`}
                        title="Encerrar sequência"
                        className="inline-flex items-center gap-1 p-1.5 text-ink-2 hover:text-danger-active dark:hover:text-danger hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-ink-2">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog}
    </Card>
  );
}
