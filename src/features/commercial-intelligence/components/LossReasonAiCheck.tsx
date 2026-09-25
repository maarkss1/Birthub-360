import { AlertTriangle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import {
  commercialIntelligenceApi,
  type LossReasonAiAnalysisResult,
} from '../commercialIntelligence.api.js';

const REASON_LABEL: Record<NonNullable<LossReasonAiAnalysisResult['reason']>, string> = {
  sem_transcricao: 'Sem transcrição de chamada registrada para este negócio.',
  negocio_nao_encontrado: 'Negócio não encontrado.',
};

/**
 * Ação sob demanda (item 21) — analisa a transcrição REAL de chamada deste negócio perdido via IA
 * e compara com o motivo declarado manualmente no CRM. Nunca roda automaticamente (custo de IA);
 * só ao clique explícito, mesmo padrão de `SellerCoachingCard`/`AiGatewayShowcase`.
 */
export function LossReasonAiCheck({ leadId }: { leadId: string }) {
  const [result, setResult] = useState<LossReasonAiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = () => {
    setLoading(true);
    setError(null);
    commercialIntelligenceApi
      .aiLossReasonAnalysis(leadId)
      .then(setResult)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  };

  if (!result && !loading && !error) {
    return (
      <button
        type="button"
        onClick={analyze}
        className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-2 transition-colors hover:border-brand/35 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Sparkles className="h-3 w-3" aria-hidden="true" /> Analisar transcrição real
      </button>
    );
  }

  if (loading)
    return <p className="mt-1 text-[11px] text-ink-2">Lendo a transcrição real da chamada…</p>;

  if (error)
    return (
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-critical">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {error}
      </p>
    );

  if (!result) return null;

  if (!result.available) {
    return (
      <p className="mt-1 text-[11px] text-ink-2">
        {REASON_LABEL[result.reason ?? 'sem_transcricao']}
      </p>
    );
  }

  return (
    <div className="mt-1.5 rounded-lg border border-line bg-surface-2/50 p-2 text-[11px]">
      <p className={result.mismatch ? 'font-semibold text-warn' : 'text-ink-2'}>
        {result.mismatch
          ? `Divergência: declarado "${result.declaredBucket}", transcrição sugere "${result.inferredBucket}"`
          : `Confirmado pela transcrição: "${result.inferredBucket}"`}
        {result.confidence && ` (confiança ${result.confidence})`}
        {result.source === 'fallback' && ' — heurística, IA indisponível no momento'}
      </p>
      {result.evidenceQuote && (
        <p className="mt-1 italic text-ink-2">&ldquo;{result.evidenceQuote}&rdquo;</p>
      )}
    </div>
  );
}
