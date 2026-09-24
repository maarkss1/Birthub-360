import React, { useState, useRef, useEffect } from 'react';
import { Lead, ThemeMode, RequirementStatus, RequirementType } from '../types';
import { ListChecks, Check, X, HelpCircle, Ban, Info } from 'lucide-react';

interface RequirementEvaluationsBadgeProps {
  lead: Lead;
  theme?: ThemeMode;
}

const STATUS_META: Record<RequirementStatus, { label: string; icon: React.ReactNode; text: string; bg: string; border: string }> = {
  matched: { label: 'Confirmado', icon: <Check className="w-3 h-3" />, text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  unmatched: { label: 'Não confere', icon: <X className="w-3 h-3" />, text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  // Wave 2 (CPI) - Requirement Engine: 'unknown' é um estado de primeira classe,
  // nunca reduzido visualmente a "não confere" (isso seria fabricar certeza que
  // o dado não existe).
  unknown: { label: 'Desconhecido', icon: <HelpCircle className="w-3 h-3" />, text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30 border-dashed' },
  excluded: { label: 'Excluído', icon: <Ban className="w-3 h-3" />, text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' }
};

const TYPE_LABEL: Record<RequirementType, string> = {
  HARD_FILTER: 'Filtro obrigatório',
  SOFT_FILTER: 'Filtro flexível',
  SIGNAL: 'Sinal',
  EXCLUSION: 'Exclusão',
  ENRICHMENT: 'Enriquecimento'
};

export const RequirementEvaluationsBadge: React.FC<RequirementEvaluationsBadgeProps> = ({ lead, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Wave 2 (CPI) - Requirement Engine: só calculado dentro da resposta de
  // /api/prospect (não persistido) - um lead recarregado depois via GET
  // /campaigns/:id não tem `requirement_evaluations`. Nunca exibimos um
  // resultado inventado quando o campo simplesmente não veio.
  const evaluations = lead.requirement_evaluations;
  if (!evaluations || evaluations.length === 0) return null;

  const matchedCount = evaluations.filter(e => e.status === 'matched').length;
  const unmatchedHardCount = evaluations.filter(e => e.status === 'unmatched' && e.type === 'HARD_FILTER').length;
  const unknownCount = evaluations.filter(e => e.status === 'unknown').length;

  const overallTone = unmatchedHardCount > 0
    ? { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' }
    : unknownCount > 0
      ? { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' }
      : { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition shadow-sm hover:scale-[1.02] ${overallTone.bg} ${overallTone.border} ${overallTone.text}`}
        title="Quais critérios da busca este lead confirma, não confirma ou tem status desconhecido"
      >
        <ListChecks className="w-3.5 h-3.5 shrink-0" />
        <span className="font-bold">
          Critérios: {matchedCount}/{evaluations.length}
        </span>
        {unmatchedHardCount > 0 && <span className="font-mono text-[10px]">({unmatchedHardCount} obrig. ausente)</span>}
        <Info className="w-3 h-3 opacity-60" />
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border shadow-2xl p-3.5 space-y-2 max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-200 shadow-black/80' : 'bg-white border-slate-300 text-slate-800 shadow-slate-300/80'
        }`}>
          <div className="flex items-center gap-1.5 font-bold text-xs border-b pb-2 border-slate-700/50">
            <ListChecks className="w-4 h-4 text-[var(--brand-primary)]" />
            <span>Critérios da busca avaliados para este lead</span>
          </div>

          <div className="space-y-1.5">
            {evaluations.map((ev, idx) => {
              const meta = STATUS_META[ev.status];
              return (
                <div key={idx} className={`p-2 rounded-lg border ${meta.bg} ${meta.border}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {ev.criterion}
                    </span>
                    <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold font-mono ${meta.text}`}>
                      {meta.icon}
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded border font-semibold ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
                      {TYPE_LABEL[ev.type]}
                    </span>
                    <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>
                      pedido: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{String(ev.expected)}</strong>
                    </span>
                    <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>
                      observado: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                        {ev.observed === null ? 'desconhecido' : String(ev.observed)}
                      </strong>
                    </span>
                  </div>
                  {ev.reason && (
                    <p className={`text-[10px] mt-1 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {ev.reason}
                    </p>
                  )}
                  <p className={`text-[9px] mt-0.5 font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    fonte: {ev.source}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
