import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../../../components/ui/Badge';
import type { CadenceRunDTO } from '../../cadence.api';
import { CadenceRunActions } from './CadenceRunActions';
import {
  CHANNEL_LABEL,
  formatDateTime,
  runStatusBadgeVariant,
  STATUS_LABEL,
  STOP_REASON_LABEL,
  stopReasonBadgeVariant,
  TOUCH_RESULT_LABEL,
  touchResultBadgeVariant,
} from './types';

export function CadenceRunRow({
  run,
  onChanged,
  onScheduleMeeting,
}: {
  run: CadenceRunDTO;
  onChanged: () => void;
  onScheduleMeeting: (leadId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const lastAttempt = run.attempts[run.attempts.length - 1] ?? null;

  return (
    <>
      <tr className="border-b border-line last:border-0 align-top">
        <td className="py-1.5 pr-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            disabled={run.attempts.length === 0}
            aria-expanded={expanded}
            aria-label={
              expanded ? 'Ocultar histórico de tentativas' : 'Ver histórico de tentativas'
            }
            className="flex items-center gap-1 text-ink hover:text-brand disabled:text-ink-2 disabled:cursor-default transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
          >
            {run.attempts.length > 0 &&
              (expanded ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              ))}
            <span className="font-mono" title={run.leadId}>
              {run.leadId.slice(0, 8)}…
            </span>
          </button>
        </td>
        <td className="py-1.5 pr-3">
          <Badge variant={runStatusBadgeVariant(run.status)}>{STATUS_LABEL[run.status]}</Badge>
        </td>
        <td className="py-1.5 pr-3 text-ink-2">
          {run.stopReason ? (
            <Badge variant={stopReasonBadgeVariant(run.stopReason)}>
              {STOP_REASON_LABEL[run.stopReason]}
            </Badge>
          ) : (
            '—'
          )}
        </td>
        <td className="py-1.5 pr-3 text-ink-2 text-center [font-variant-numeric:tabular-nums]">
          {run.currentTouchOrder}
        </td>
        <td className="py-1.5 pr-3 text-ink-2">
          {lastAttempt ? (
            <span className="flex items-center gap-1.5">
              {CHANNEL_LABEL[lastAttempt.channel]}
              <Badge variant={touchResultBadgeVariant(lastAttempt.result)}>
                {TOUCH_RESULT_LABEL[lastAttempt.result]}
              </Badge>
            </span>
          ) : (
            'Sem tentativa ainda'
          )}
        </td>
        <td className="py-1.5 pr-3 text-ink-2 text-right [font-variant-numeric:tabular-nums]">
          {formatDateTime(run.startedAt)}
        </td>
        <td className="py-1.5 text-right">
          <CadenceRunActions
            run={run}
            onChanged={onChanged}
            onScheduleMeeting={() => onScheduleMeeting(run.leadId)}
          />
        </td>
      </tr>
      {expanded && run.attempts.length > 0 && (
        <tr className="border-b border-line last:border-0">
          <td colSpan={7} className="py-2 pl-8 pr-3 bg-surface-2">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-ink-2">
                  <th className="text-left font-semibold py-1 pr-3">Toque</th>
                  <th className="text-left font-semibold py-1 pr-3">Tentativa</th>
                  <th className="text-left font-semibold py-1 pr-3">Canal</th>
                  <th className="text-left font-semibold py-1 pr-3">Resultado</th>
                  <th className="text-left font-semibold py-1 pr-3">Erro</th>
                  {/* `CadenceTouchAttempt.providerMessageId` — id da mensagem no provedor
                      (WhatsApp/e-mail), coletado e salvo de verdade mas nunca exibido antes
                      (achado do Piloto 016). Só existe quando `result === 'sent'`, por isso a
                      célula fica em branco (não "—") nas linhas sem esse dado, em vez de sujar a
                      tabela com um traço em toda tentativa falha/pulada. */}
                  <th className="text-left font-semibold py-1 pr-3">ID da mensagem</th>
                  <th className="text-right font-semibold py-1">Quando</th>
                </tr>
              </thead>
              <tbody>
                {run.attempts.map((attempt, idx) => (
                  <tr key={idx}>
                    <td className="py-1 pr-3 text-ink-2">{attempt.touchOrder}</td>
                    <td className="py-1 pr-3 text-ink-2 [font-variant-numeric:tabular-nums]">
                      {attempt.attemptNumber}
                    </td>
                    <td className="py-1 pr-3 text-ink-2">{CHANNEL_LABEL[attempt.channel]}</td>
                    <td className="py-1 pr-3">
                      <Badge variant={touchResultBadgeVariant(attempt.result)}>
                        {TOUCH_RESULT_LABEL[attempt.result]}
                      </Badge>
                    </td>
                    <td
                      className="py-1 pr-3 text-ink-2 max-w-xs truncate"
                      title={attempt.error ?? undefined}
                    >
                      {attempt.error ?? '—'}
                    </td>
                    <td
                      className="py-1 pr-3 text-ink-2 font-mono max-w-[10rem] truncate"
                      title={attempt.providerMessageId ?? undefined}
                    >
                      {attempt.providerMessageId ?? ''}
                    </td>
                    <td className="py-1 text-right text-ink-2 [font-variant-numeric:tabular-nums]">
                      {formatDateTime(attempt.attemptedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
