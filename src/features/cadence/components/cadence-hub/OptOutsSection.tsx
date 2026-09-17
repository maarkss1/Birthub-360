import { AlertTriangle, RefreshCw, ShieldOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../../../components/ui/Badge';
import { Card } from '../../../../components/ui/Card';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { cadenceApi, type OptOutRecordDTO } from '../../cadence.api';
import { formatDateTime, ORIGIN_LABEL, SCOPE_LABEL, scopeBadgeVariant } from './types';

export function OptOutsSection() {
  const [data, setData] = useState<OptOutRecordDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    cadenceApi
      .optOuts()
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldOff className="w-4 h-4 text-brand" aria-hidden="true" />
          <h2 className="text-sm font-bold text-ink">Opt-outs registrados</h2>
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
          aria-label="Atualizar registros de opt-out"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div
          className="space-y-2"
          role="status"
          aria-live="polite"
          aria-label="Carregando opt-outs"
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
          title="Nenhum opt-out registrado"
          description="Quando um lead pedir para não ser contatado (por e-mail, WhatsApp ou voz), o registro aparece aqui e bloqueia os três canais a partir do mesmo pedido."
          icon={<ShieldOff className="w-8 h-8 text-brand" />}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ink-2 border-b border-line">
                <th className="text-left font-semibold py-1.5 pr-3">Escopo</th>
                <th className="text-left font-semibold py-1.5 pr-3">Origem do pedido</th>
                <th className="text-left font-semibold py-1.5 pr-3">Motivo</th>
                <th className="text-left font-semibold py-1.5 pr-3">Evidência</th>
                <th className="text-left font-semibold py-1.5 pr-3">Lead</th>
                <th className="text-right font-semibold py-1.5">Registrado em</th>
              </tr>
            </thead>
            <tbody>
              {data.map((record) => (
                <tr key={record.id} className="border-b border-line last:border-0">
                  <td className="py-1.5 pr-3">
                    <Badge variant={scopeBadgeVariant(record.scope)}>
                      {SCOPE_LABEL[record.scope]}
                    </Badge>
                  </td>
                  <td className="py-1.5 pr-3 text-ink-2">{ORIGIN_LABEL[record.originChannel]}</td>
                  <td
                    className="py-1.5 pr-3 text-ink-2 max-w-xs truncate"
                    title={record.reason ?? undefined}
                  >
                    {record.reason ?? '—'}
                  </td>
                  {/* Coletado deliberadamente pro domínio (`OptOutRecord.evidence`, "texto/trecho
                      real da mensagem que motivou o opt-out — nunca inferência da IA") e já vinha
                      até o cliente, mas nunca era exibido — o dado mais valioso pra auditar o
                      pedido ficava descartado (achado do Piloto 016). */}
                  <td
                    className="py-1.5 pr-3 text-ink-2 max-w-xs truncate"
                    title={record.evidence ?? undefined}
                  >
                    {record.evidence ?? '—'}
                  </td>
                  <td
                    className="py-1.5 pr-3 text-ink-2 font-mono"
                    title={record.leadId ?? undefined}
                  >
                    {record.leadId ? `${record.leadId.slice(0, 8)}…` : '—'}
                  </td>
                  <td className="py-1.5 text-right text-ink-2 [font-variant-numeric:tabular-nums]">
                    {formatDateTime(record.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
