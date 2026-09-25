import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import type { Lead, ThemeMode, FitScore, IntentScore, DataQualityScore } from '../types';
import { Target, TrendingUp, Database, Award, Info, HelpCircle } from 'lucide-react';

interface LeadScoresBadgeProps {
  lead: Lead;
  theme?: ThemeMode;
}

type Tier = 'green' | 'yellow' | 'red' | 'unknown';

function tierFor(score: number | null | undefined): Tier {
  if (score === null || score === undefined) return 'unknown';
  if (score >= 75) return 'green';
  if (score >= 45) return 'yellow';
  return 'red';
}

const TIER_CLASSES: Record<Tier, { bg: string; border: string; text: string; bar: string }> = {
  green: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  yellow: { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400', bar: 'bg-amber-500' },
  red: { bg: 'bg-rose-500/15', border: 'border-rose-500/40', text: 'text-rose-400', bar: 'bg-rose-500' },
  // Nunca renderizamos `null` como 0: um score sem base de cálculo usa um
  // estilo neutro/tracejado próprio, nunca a mesma cor "vermelha" de um score
  // baixo real (isso implicaria certeza que não existe).
  unknown: { bg: 'bg-slate-500/10', border: 'border-slate-500/30 border-dashed', text: 'text-slate-400', bar: 'bg-slate-600' }
};

// Wave 8 (CPI) - Scoring: Fit / Intent / Data Quality nunca ficam escondidos
// atrás só do Final Score - cada linha do popover mostra os 3 individualmente
// mais o Final, e cada `score: null` aparece como "sem dado suficiente", nunca
// como 0 nem omitido silenciosamente.
function ScoreRow({
  icon,
  label,
  score,
  confidence,
  reasons,
  isDark
}: {
  icon: React.ReactNode;
  label: string;
  score: number | null;
  confidence?: number;
  reasons: string[];
  isDark: boolean;
}) {
  const tier = tierFor(score);
  const cls = TIER_CLASSES[tier];
  const [showReasons, setShowReasons] = useState(false);

  return (
    <div className={`p-2 rounded-lg border ${cls.bg} ${cls.border}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cls.text}>{icon}</span>
          <span className={`text-[11px] font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {label}
          </span>
          {confidence !== undefined && (
            <span className="text-[9px] text-slate-500 font-mono" title="Confiança: quanto dado sustenta este número">
              conf. {Math.round(confidence * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {score === null ? (
            <span className={`text-[10px] font-bold font-mono ${cls.text} flex items-center gap-1`}>
              <HelpCircle className="w-3 h-3" />
              sem dado suficiente
            </span>
          ) : (
            <span className={`text-xs font-bold font-mono ${cls.text}`}>{score}</span>
          )}
          {reasons.length > 0 && (
            <button
              type="button"
              onClick={() => setShowReasons(prev => !prev)}
              className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${
                isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-slate-300 text-slate-500 hover:text-slate-800'
              }`}
              title="Ver motivos deste score"
            >
              por quê?
            </button>
          )}
        </div>
      </div>

      {score !== null && (
        <div className={`w-full h-1.5 rounded-full mt-1.5 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <div className={`h-full rounded-full ${cls.bar}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
        </div>
      )}

      {showReasons && reasons.length > 0 && (
        <ul className={`mt-1.5 pt-1.5 border-t space-y-0.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          {reasons.map((r, i) => (
            <li key={i} className={`text-[10px] leading-snug ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              • {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const LeadScoresBadge: React.FC<LeadScoresBadgeProps> = ({ lead, theme = 'dark' }) => {
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

  // Wave 8 (CPI) - Scoring: leads salvos antes desta wave (ou lidos fora de uma
  // resposta de /api/prospect, já que scores não são persistidos) não têm
  // `lead.scores` - nunca tratamos isso como "score 0", só não exibimos o badge.
  const scores = lead.scores;
  if (!scores) return null;

  const fit: FitScore = scores.fit;
  const intent: IntentScore = scores.intent;
  const dataQuality: DataQualityScore = scores.dataQuality;
  const finalTier = tierFor(scores.final);
  const finalCls = TIER_CLASSES[finalTier];

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${finalCls.bg} ${finalCls.border} ${finalCls.text} hover:scale-[1.02]`}
        title="Fit / Intent / Data Quality — clique para detalhar"
      >
        <Award className="w-3.5 h-3.5 shrink-0" />
        <span className="font-bold">
          {scores.final === null ? 'Score: sem dado' : `Score: ${scores.final}`}
        </span>
        <Info className="w-3 h-3 opacity-60" />
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border shadow-2xl p-3.5 space-y-2 animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-200 shadow-black/80' : 'bg-white border-slate-300 text-slate-800 shadow-slate-300/80'
        }`}>
          <div className="flex items-center justify-between border-b pb-2 border-slate-700/50">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Award className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Pontuação do Lead (Wave 8)</span>
            </div>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-500'}`}>
              {scores.scoringModelVersion}
            </span>
          </div>

          <ScoreRow icon={<Target className="w-3.5 h-3.5" />} label="Fit (aderência ao ICP)" score={fit.score} confidence={fit.confidence} reasons={fit.reasons} isDark={isDark} />
          <ScoreRow icon={<TrendingUp className="w-3.5 h-3.5" />} label="Intent (propensão temporal)" score={intent.score} confidence={intent.confidence} reasons={intent.reasons} isDark={isDark} />
          <ScoreRow icon={<Database className="w-3.5 h-3.5" />} label="Data Quality (confiabilidade do dado)" score={dataQuality.score} confidence={dataQuality.confidence} reasons={dataQuality.reasons} isDark={isDark} />

          <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          <ScoreRow icon={<Award className="w-3.5 h-3.5" />} label="Final (combinado)" score={scores.final} reasons={scores.reasons} isDark={isDark} />

          {fit.hardFilterFailed && (
            <p className="text-[10px] text-rose-400 font-semibold flex items-start gap-1 pt-1">
              ⚠ Um critério HARD_FILTER pedido não foi confirmado para este lead — domina o Fit Score.
            </p>
          )}

          <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/60">
            "sem dado suficiente" nunca é o mesmo que 0 — significa que nenhuma fonte confirmou ou refutou esse critério ainda.
          </p>
        </div>
      )}
    </div>
  );
};
