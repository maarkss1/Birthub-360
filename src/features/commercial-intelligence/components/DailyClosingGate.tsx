import { useState } from 'react';
import type React from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { commercialIntelligenceApi } from '../commercialIntelligence.api';
import type { PendingDailyClosing } from '../../../shared/contracts/dailyPlan.contract';

const MAX_GOALS = 5;

interface DailyClosingGateProps {
  pending: PendingDailyClosing;
  onClosed: () => void;
}

/** "YYYY-MM-DD" → "DD/MM" sem passar por `Date` (evita deslocar o dia pelo fuso do navegador),
 * mesma técnica de `formatPlanDate` em `DailyPlanHub.tsx`. */
function formatReferenceDate(isoDate?: string): string {
  if (!isoDate) return '';
  const [, month, day] = isoDate.split('-');
  return month && day ? `${day}/${month}` : isoDate;
}

// Bloqueia o acesso ao app até o usuário fechar o dia anterior (parecer sobre o que foi feito) e
// definir as metas do novo dia — mesmo padrão de bloqueio total de `ChangePasswordGate.tsx`, agora
// para o fechamento obrigatório do Plano Diário (ver DailyPlanClosing no schema e
// DailyClosingContext.tsx, que decide quando este componente aparece).
export function DailyClosingGate({ pending, onClosed }: DailyClosingGateProps) {
  const [userComment, setUserComment] = useState('');
  const [goals, setGoals] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const metrics = pending.metrics;

  const updateGoal = (index: number, value: string) => {
    setGoals((prev) => prev.map((g, i) => (i === index ? value : g)));
  };

  const addGoal = () => {
    setGoals((prev) => (prev.length >= MAX_GOALS ? prev : [...prev, '']));
  };

  const removeGoal = (index: number) => {
    setGoals((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const cleanGoals = goals.map((g) => g.trim()).filter(Boolean);
  const canSubmit = userComment.trim().length > 0 && cleanGoals.length > 0 && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pending.referenceDate) {
      onClosed();
      return;
    }
    if (!userComment.trim()) {
      setError('Escreva um breve parecer sobre o dia anterior antes de continuar.');
      return;
    }
    if (cleanGoals.length === 0) {
      setError('Defina ao menos uma meta para o novo dia.');
      return;
    }

    setIsSubmitting(true);
    try {
      await commercialIntelligenceApi.submitDailyPlanClosing({
        referenceDate: pending.referenceDate,
        userComment: userComment.trim(),
        nextDayGoals: cleanGoals,
      });
      onClosed();
    } catch {
      setError('Não foi possível registrar o fechamento. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex items-center justify-center relative overflow-hidden font-sans p-4">
      <div className="w-full max-w-xl relative z-10">
        <div className="glass-panel p-6 sm:p-8 rounded-[2.5rem] border border-line bg-surface/95 shadow-2xl space-y-6">
          <div className="flex flex-col items-center mb-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center text-brand-active dark:text-brand-2 mb-4">
              <ClipboardList size={24} />
            </div>
            <h1 className="text-xl font-black text-ink">
              Feche o dia {formatReferenceDate(pending.referenceDate)} para continuar
            </h1>
            <p className="text-ink-2 text-xs mt-2">
              Antes de acessar a Central hoje, registre um parecer rápido sobre o seu dia anterior e
              defina as metas de hoje.
            </p>
          </div>

          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-bg border border-line text-center">
                <div className="text-lg font-black text-ink">{metrics.totalItems}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-2">
                  Total
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-bg border border-line text-center">
                <div className="text-lg font-black text-emerald-600">{metrics.completedItems}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-2">
                  Concluídas
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-bg border border-line text-center">
                <div className="text-lg font-black text-amber-600">{metrics.pendingItems}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-2">
                  Pendentes
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-bg border border-line text-center">
                <div className="text-lg font-black text-brand">{metrics.completionRate}%</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-2">
                  Conclusão
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-danger/10 border border-danger/30 text-danger-active dark:text-danger p-3.5 rounded-2xl text-xs flex items-start gap-2.5"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}

            <div>
              <label
                htmlFor="daily-closing-comment"
                className="block text-[10px] font-bold text-ink-2 uppercase tracking-wider mb-1.5 ml-1"
              >
                Parecer do dia anterior
              </label>
              <textarea
                id="daily-closing-comment"
                rows={3}
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="O que funcionou, o que travou, o que precisa de apoio do gestor..."
                className="w-full bg-surface-2 border border-line rounded-2xl px-4 py-3.5 text-xs text-ink placeholder-ink-2 focus:outline-none focus:ring-2 focus:ring-brand transition-all resize-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <span className="text-[10px] font-bold text-ink-2 uppercase tracking-wider inline-flex items-center gap-1">
                  <Target className="w-3 h-3" /> Metas para hoje
                </span>
                {goals.length < MAX_GOALS && (
                  <button
                    type="button"
                    onClick={addGoal}
                    className="text-[10px] font-bold text-brand hover:text-brand-active inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {goals.map((goal, index) => (
                  <div key={index} className="flex gap-2">
                    <label className="sr-only" htmlFor={`daily-closing-goal-${index}`}>
                      Meta {index + 1} para hoje
                    </label>
                    <input
                      id={`daily-closing-goal-${index}`}
                      type="text"
                      value={goal}
                      onChange={(e) => updateGoal(index, e.target.value)}
                      placeholder={`Meta ${index + 1}`}
                      className="flex-1 bg-surface-2 border border-line rounded-2xl px-4 py-3 text-xs text-ink placeholder-ink-2 focus:outline-none focus:ring-2 focus:ring-brand transition-all"
                    />
                    {goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGoal(index)}
                        title="Remover meta"
                        aria-label={`Remover meta ${index + 1}`}
                        className="px-3 rounded-2xl border border-line text-ink-2 hover:text-danger hover:border-danger/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full mt-2 bg-gradient-to-r from-brand to-brand-2 text-white py-3.5 rounded-2xl font-extrabold text-xs shadow-lg shadow-brand/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <CheckCircle2 size={16} /> Fechar o dia e continuar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DailyClosingGate;
