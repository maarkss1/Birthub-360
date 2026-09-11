import { useCallback, useEffect, useState } from 'react';
import { Loader2, PhoneCall, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { clientLogger } from '../../../../lib/clientLogger';

type CallOutcome =
  | 'completed'
  | 'voicemail'
  | 'no-answer'
  | 'busy'
  | 'invalid-number'
  | 'failed'
  | 'cancelled'
  | 'timeout'
  | 'unknown';

interface VoiceCallItem {
  id: string;
  leadId: string;
  leadTitle: string | null;
  outcome: CallOutcome;
  durationSeconds: number;
  summary: string | null;
  recordingUrl: string | null;
  createdAt: string;
}

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  completed: 'Conversa real',
  voicemail: 'Caixa postal',
  'no-answer': 'Não atendeu',
  busy: 'Ocupado',
  'invalid-number': 'Número inválido',
  failed: 'Falha',
  cancelled: 'Cancelada',
  timeout: 'Tempo esgotado',
  unknown: 'Desconhecido',
};

const OUTCOME_VARIANT: Record<CallOutcome, 'success' | 'warning' | 'danger' | 'default'> = {
  completed: 'success',
  voicemail: 'warning',
  'no-answer': 'warning',
  busy: 'warning',
  'invalid-number': 'danger',
  failed: 'danger',
  cancelled: 'default',
  timeout: 'warning',
  unknown: 'default',
};

function formatDuration(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

/** Lista de atividade das chamadas de voz IA (Birth Voices Hub / Bland AI) — projeção estruturada
 *  gravada por `birthVoice.webhook.ts`/`voiceResult.webhook.ts` (model `VoiceCallLog`). Antes desta
 *  tela, o único jeito de ver o resultado de uma chamada era abrir o card do lead específico e ler
 *  a Note em texto livre; aqui dá pra ver as chamadas recentes de TODOS os leads num só lugar. */
export function VoiceCallActivity() {
  const [calls, setCalls] = useState<VoiceCallItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const url = cursor
        ? `/api/integrations/birth-voice/calls?cursor=${encodeURIComponent(cursor)}`
        : '/api/integrations/birth-voice/calls';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível carregar a atividade de voz.');
      }
      setCalls((prev) => (cursor ? [...prev, ...data.data.calls] : data.data.calls));
      setNextCursor(data.data.nextCursor);
    } catch (err) {
      clientLogger.error({ err }, 'Falha ao carregar atividade de voz IA');
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a atividade.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Atividade recente de chamadas de voz IA</CardTitle>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            aria-label="Atualizar atividade"
            className="rounded-lg p-1.5 text-ink-2 transition-colors duration-200 hover:bg-surface-2 hover:text-ink disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </CardHeader>

      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        {loading && calls.length === 0 && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        )}

        {error && calls.length === 0 && !loading && (
          <EmptyState
            title="Não foi possível carregar a atividade"
            description={error}
            actionLabel="Tentar novamente"
            onAction={() => load()}
            icon={<PhoneCall className="w-8 h-8 text-brand" />}
          />
        )}

        {!loading && !error && calls.length === 0 && (
          <EmptyState
            title="Nenhuma chamada de voz IA ainda"
            description="Assim que o SDR de voz ligar para um lead, o resultado aparece aqui."
            icon={<PhoneCall className="w-8 h-8 text-brand" />}
          />
        )}

        {calls.length > 0 && (
          <div className="space-y-2">
            {calls.map((call) => (
              <div
                key={call.id}
                className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {call.leadTitle || `Lead ${call.leadId}`}
                  </p>
                  {call.summary && <p className="truncate text-xs text-ink-2">{call.summary}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant={OUTCOME_VARIANT[call.outcome] ?? 'default'}>
                    {OUTCOME_LABEL[call.outcome] ?? call.outcome}
                  </Badge>
                  <span className="text-xs text-ink-2">{formatDuration(call.durationSeconds)}</span>
                  {call.recordingUrl && (
                    <a
                      href={call.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-brand-ink hover:underline dark:text-brand"
                    >
                      Ouvir
                    </a>
                  )}
                  <span className="text-xs text-ink-2">
                    {new Date(call.createdAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {nextCursor && (
          <button
            type="button"
            onClick={() => load(nextCursor)}
            disabled={loadingMore}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-xs font-bold text-ink-2 transition-colors duration-200 hover:border-brand/40 hover:text-brand disabled:opacity-60"
          >
            {loadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            Carregar mais
          </button>
        )}
      </div>
    </Card>
  );
}
