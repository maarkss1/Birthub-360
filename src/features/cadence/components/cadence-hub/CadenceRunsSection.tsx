import { AlertTriangle, RefreshCw, Repeat } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../../../components/ui/Card';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { type CadenceRunDTO, type CadenceRunStatus, cadenceApi } from '../../cadence.api';
import { CadenceRunRow } from './CadenceRunRow';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { STATUS_FILTERS, STATUS_LABEL } from './types';

export function CadenceRunsSection() {
  const [data, setData] = useState<CadenceRunDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<CadenceRunStatus>>(
    new Set(['active', 'paused']),
  );
  const [schedulingLeadId, setSchedulingLeadId] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    cadenceApi
      .runs(statusFilter.size > 0 ? [...statusFilter] : undefined)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  useEffect(() => load(), [load]);

  const toggleStatus = (status: CadenceRunStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-brand" aria-hidden="true" />
          <h2 className="text-sm font-bold text-ink">Execuções de cadência</h2>
          {data && data.length > 0 && (
            <span className="text-[11px] font-semibold text-ink-2 bg-surface-2 border border-line rounded-full px-2 py-0.5">
              {data.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Toolbar de botões toggle (não campos de formulário) — <fieldset> não traria ganho
              real de acessibilidade aqui, só estilo. */}
          {/* biome-ignore lint/a11y/useSemanticElements: ver comentário acima */}
          <div className="flex items-center gap-1" role="group" aria-label="Filtrar por status">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                aria-pressed={statusFilter.has(status)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  statusFilter.has(status)
                    ? 'bg-brand-active text-on-brand border-brand-active'
                    : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
                }`}
              >
                {STATUS_LABEL[status]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            className="p-1.5 text-ink-2 hover:text-ink hover:bg-surface-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            title="Atualizar"
            aria-label="Atualizar execuções de cadência"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div
          className="space-y-2"
          role="status"
          aria-live="polite"
          aria-label="Carregando execuções de cadência"
        >
          <Skeleton className="h-9 w-full" />
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
          title={
            statusFilter.size < STATUS_FILTERS.length
              ? 'Nenhuma execução para este filtro'
              : 'Nenhuma execução de cadência'
          }
          description="Quando uma sequência multicanal for iniciada para um lead, o progresso, pausas e motivo de parada aparecem aqui."
          icon={<Repeat className="w-8 h-8 text-brand" />}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ink-2 border-b border-line">
                <th className="text-left font-semibold py-1.5 pr-3">Lead</th>
                <th className="text-left font-semibold py-1.5 pr-3">Status</th>
                <th className="text-left font-semibold py-1.5 pr-3">Motivo de parada</th>
                <th className="text-center font-semibold py-1.5 pr-3">Toque atual</th>
                <th className="text-left font-semibold py-1.5 pr-3">Última tentativa</th>
                <th className="text-right font-semibold py-1.5 pr-3">Iniciada em</th>
                <th className="text-right font-semibold py-1.5">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((run) => (
                <CadenceRunRow
                  key={run.id}
                  run={run}
                  onChanged={load}
                  onScheduleMeeting={setSchedulingLeadId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ScheduleMeetingDialog
        leadId={schedulingLeadId}
        isOpen={schedulingLeadId != null}
        onClose={() => setSchedulingLeadId(null)}
      />
    </Card>
  );
}
