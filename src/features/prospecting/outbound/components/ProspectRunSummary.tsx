import React, { useState } from 'react';
import type { ProspectRunMeta, SearchFunnelStage, StopReason, ThemeMode } from '../types.js';
import { Filter, Copy, Check, AlertTriangle, ArrowRight, Info } from 'lucide-react';

interface ProspectRunSummaryProps {
  meta: ProspectRunMeta | null;
  theme?: ThemeMode;
}

const STAGE_LABELS: Record<SearchFunnelStage, string> = {
  discovery: 'Descoberta',
  company_validation: 'Validação da empresa',
  enrichment: 'Enriquecimento (Apollo)',
  decision_makers: 'Decisores confirmados',
  final: 'Final'
};

const STOP_REASON_LABELS: Record<StopReason, string> = {
  target_reached: 'Meta de leads atingida',
  provider_exhausted: 'Provider de descoberta não tinha mais candidatos (sem paginação nesta versão)',
  all_duplicates: 'Todos os candidatos encontrados já estavam na base (mesmo CNPJ)',
  no_provider_configured: 'Nenhum provider de descoberta configurado'
};

// Wave 7 + Wave 10 (CPI) - Progressive Search & Observabilidade: mostra o funil
// real (não "os primeiros N como se fossem os melhores N"), o motivo explícito
// de parada, e deixa claro quando a lista NÃO está ranqueada por adequação
// ainda (rankingApplied: false é a regra central desta wave — nunca escondida).
export const ProspectRunSummary: React.FC<ProspectRunSummaryProps> = ({ meta, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);

  if (!meta) return null;

  const { searchId, funnelSummary, stopReason, rankingApplied, rankingNote } = meta;
  if (!funnelSummary && !searchId && rankingApplied === undefined) return null;

  const handleCopySearchId = () => {
    if (!searchId) return;
    navigator.clipboard.writeText(searchId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`border rounded-2xl p-4 md:p-5 shadow-xl space-y-4 ${
      isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 shadow-slate-100 text-slate-800'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-800/60">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--brand-primary)]" />
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Resumo da busca (funil real)
          </h3>
        </div>

        {searchId && (
          <button
            type="button"
            onClick={handleCopySearchId}
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-semibold flex items-center gap-1.5 transition ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="Copiar Search-ID (referencie esta busca ao reportar um problema)"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>Search-ID: {searchId.slice(0, 12)}{searchId.length > 12 ? '…' : ''}</span>
          </button>
        )}
      </div>

      {/* Ranking honesty banner — o coração da Wave 7: nunca deixar a lista */}
      {rankingApplied === false && (
        <div className={`p-2.5 rounded-lg border flex items-start gap-2 text-[11px] ${
          isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <strong>Estes resultados NÃO estão ranqueados por adequação.</strong>{' '}
            {rankingNote || 'Ordem de descoberta do provider, filtrada por duplicidade — não é "os melhores N".'}
          </span>
        </div>
      )}

      {stopReason && (
        <p className={`text-[11px] flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>Motivo de parada: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{STOP_REASON_LABELS[stopReason]}</strong></span>
        </p>
      )}

      {funnelSummary && (
        <div className="overflow-x-auto">
          <div className="flex items-stretch gap-1.5 min-w-max pb-1">
            {funnelSummary.stages.map((stage, idx) => (
              <React.Fragment key={stage.stage}>
                <div
                  className={`min-w-[140px] p-2.5 rounded-xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                  title={stage.note}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {STAGE_LABELS[stage.stage]}
                  </p>
                  <p className={`text-sm font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {stage.candidatesIn} → {stage.candidatesOut}
                  </p>
                  {stage.droppedReasons.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {stage.droppedReasons.map((dr, i) => (
                        <p key={i} className="text-[9px] text-rose-400 font-semibold">
                          -{dr.count} {dr.reason}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                {idx < funnelSummary.stages.length - 1 && (
                  <div className="flex items-center shrink-0 text-slate-600">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
