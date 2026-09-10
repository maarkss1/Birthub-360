import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { api } from '../../../../lib/api';
import { Dialog } from '../../../../components/ui/Dialog';
import { ListSkeleton } from '../../../../components/ui/Skeleton';
import type { PlaybookKey } from '../../../../config/playbooks';
import { scoreTextClassOnSurface } from './scoreColor';
import type { RoleplayHistoryItem } from './types';

const DIFFICULTY_LABELS: Record<RoleplayHistoryItem['difficulty'], string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}

/**
 * Histórico de ligações do usuário nesta marca — as sessões já eram persistidas por
 * finishRoleplaySession desde a última onda, mas até agora não havia nenhuma tela para reler o que
 * foi salvo (dado capturado, nunca usado). Só aparece na tela de setup (antes de uma nova ligação),
 * nunca durante uma chamada ativa — não é o fluxo principal, é consulta de treinos passados.
 */
export function RoleplayHistoryPanel({ playbook }: { playbook: PlaybookKey }) {
  const [sessions, setSessions] = useState<RoleplayHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RoleplayHistoryItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSessions(null);
    setError(null);
    api
      .get<RoleplayHistoryItem[]>(`/api/intelligence/roleplay/history?brand=${playbook}`)
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar o histórico.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [playbook]);

  if (error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded-[2rem] p-6 md:p-8 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-danger-active dark:text-danger shrink-0 mt-0.5" />
        <p className="text-sm text-ink">
          Não foi possível carregar o histórico de ligações. {error}
        </p>
      </div>
    );
  }

  // Ainda carregando (primeira busca, sem erro) — não ocupa espaço permanente com esqueleto se
  // não houver nada para carregar (ver checagem de lista vazia logo abaixo).
  if (sessions === null) {
    return (
      <div className="bg-surface/60 border border-line rounded-[2rem] p-6 md:p-8">
        <h3 className="font-black text-lg text-ink tracking-tight flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-brand" /> Ligações Anteriores
        </h3>
        <ListSkeleton items={2} />
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface/60 border border-line rounded-[2rem] p-6 md:p-8 space-y-4"
      >
        <h3 className="font-black text-lg text-ink tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-brand" /> Ligações Anteriores
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sessions.map((session) => (
            <button
              type="button"
              key={session.id}
              onClick={() => setSelected(session)}
              className="text-left p-4 rounded-2xl border border-line bg-surface hover:border-brand/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-ink truncate">{session.personaLabel}</p>
                  <p className="text-xs text-ink-2 mt-0.5">
                    {DIFFICULTY_LABELS[session.difficulty]} ·{' '}
                    {formatDuration(session.durationSeconds)} ·{' '}
                    {formatDistanceToNow(new Date(session.createdAt), {
                      locale: ptBR,
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <span
                  className={`text-xl font-black shrink-0 ${scoreTextClassOnSurface(session.overallScore)}`}
                >
                  {session.overallScore}
                </span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      <Dialog
        isOpen={selected != null}
        onClose={() => setSelected(null)}
        title={selected?.personaLabel || ''}
        maxWidth="max-w-2xl"
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span
                className={`text-4xl font-black ${scoreTextClassOnSurface(selected.overallScore)}`}
              >
                {selected.overallScore}
              </span>
              <p className="text-sm text-ink-2">{selected.summary}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Clareza', value: selected.clarityScore },
                { label: 'Objeções', value: selected.objectionHandlingScore },
                { label: 'Fechamento', value: selected.closingScore },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-surface-2 rounded-xl p-3 text-center space-y-0.5"
                >
                  <span
                    className={`block text-lg font-black ${scoreTextClassOnSurface(item.value)}`}
                  >
                    {item.value}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-ink-2">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-success-active dark:text-success flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> O que funcionou
                </h4>
                <ul className="space-y-1.5 text-sm text-ink">
                  {selected.strengths.map((s, idx) => (
                    <li key={idx}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-danger-active dark:text-danger flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Pontos de melhoria
                </h4>
                <ul className="space-y-1.5 text-sm text-ink">
                  {selected.improvements.map((s, idx) => (
                    <li key={idx}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
