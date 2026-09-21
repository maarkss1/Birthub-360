import { BrainCircuit, X } from 'lucide-react';
import { useState } from 'react';

interface IntelligenceSignalProps {
  /** Main insight message from AI */
  insight: string;
  /** Additional context about why this matters */
  context?: string;
  /** What changed to trigger this signal */
  whatChanged?: string;
  /** Recommended action for the user */
  recommendedAction?: string;
  /** Signal severity level */
  severity?: 'info' | 'warning' | 'critical';
  /** Whether the signal is dismissible */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Callback when action is taken */
  onAction?: () => void;
  /** Callback when viewing details */
  onViewDetails?: () => void;
}

export function IntelligenceSignal({
  insight,
  context,
  whatChanged,
  recommendedAction,
  severity = 'info',
  dismissible = true,
  onDismiss,
  onAction,
  onViewDetails,
}: IntelligenceSignalProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const severityStyles = {
    info: 'bg-red-violet/5 border-red-violet/10',
    warning: 'bg-sunset/5 border-sunset/10',
    critical: 'bg-critical/5 border-critical/10',
  };

  const iconStyles = {
    info: 'text-red-violet bg-red-violet/10 border-red-violet/20',
    warning: 'text-sunset bg-sunset/10 border-sunset/20',
    critical: 'text-critical bg-critical/10 border-critical/20',
  };

  return (
    <div className={`rounded-2xl ${severityStyles[severity]} border p-5 transition-all duration-300`}>
      <div className="flex items-start gap-4">
        {/* AI Icon */}
        <div className={`p-2.5 rounded-xl ${iconStyles[severity]} border shrink-0`}>
          <BrainCircuit className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-ink">AI Business Signal</h3>
            {severity === 'critical' && (
              <span className="px-2 py-0.5 rounded-full bg-critical/10 text-[10px] font-bold text-critical border border-critical/20">
                CRÍTICO
              </span>
            )}
          </div>

          <p className="text-sm text-ink-2/80 leading-relaxed mb-2">{insight}</p>

          {context && (
            <div className="text-xs text-ink-2/60 mb-2">
              <span className="font-semibold">Contexto:</span> {context}
            </div>
          )}

          {whatChanged && (
            <div className="text-xs text-ink-2/60 mb-2">
              <span className="font-semibold">O que mudou:</span> {whatChanged}
            </div>
          )}

          {recommendedAction && (
            <div className="text-xs text-ink-2/60 mb-3">
              <span className="font-semibold">Ação recomendada:</span> {recommendedAction}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {onViewDetails && (
              <button
                type="button"
                onClick={onViewDetails}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-2 text-ink text-xs font-bold transition-colors cursor-pointer"
              >
                Ver Detalhes
              </button>
            )}
            {onAction && (
              <button
                type="button"
                onClick={onAction}
                className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-active text-on-brand text-xs font-bold transition-colors cursor-pointer"
              >
                Tomar Ação
              </button>
            )}
            {dismissible && (
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-lg text-ink-2/60 hover:text-ink-2 text-xs font-medium transition-colors cursor-pointer"
              >
                Dispensar
              </button>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-ink-2/60 hover:text-ink-2 transition-colors cursor-pointer"
            aria-label="Dispensar sinal"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}