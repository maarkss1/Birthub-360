import { motion } from 'framer-motion';
import { AlertTriangle, Award, Medal, Trophy, Users } from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import { fadeInUp, staggerContainer, staggerItem } from '../../../lib/motion.js';

interface RankingRow {
  label: string;
  count: number;
  won: number;
}

interface TeamRankingWidgetProps {
  byOwner: RankingRow[];
  currentUserName?: string | null;
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
}

const POSITION_ICONS = [Trophy, Medal, Award];

/**
 * Ranking real por negócios fechados (`byOwner`, de GET /api/analytics/dashboard) — a mecânica de
 * jogo é o próprio ranking sobre dado real, sem XP/nível/sequência fabricados (Piloto 007, ver
 * .claude/PILOTS.md e o GamificationWidget "falso" em ProspectingHub.tsx, fora de escopo aqui).
 */
export function TeamRankingWidget({
  byOwner,
  currentUserName,
  loading,
  error,
  onRetry,
}: TeamRankingWidgetProps) {
  const ranked = [...byOwner]
    .filter((row) => row.label)
    .sort((a, b) => b.won - a.won)
    .slice(0, 8);

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show" className="rounded-card-lg">
      <Card padding="lg">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-brand/20 bg-soft p-2 text-brand-ink dark:text-brand">
              <Users className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-ink dark:text-brand">
                Performance da equipe
              </p>
              <h3 className="mt-0.5 text-base font-bold text-ink">Ranking comercial</h3>
            </div>
          </div>
          <p className="max-w-48 text-right text-xs leading-relaxed text-ink-2">
            Negócios fechados neste recorte
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-critical" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Não foi possível carregar o ranking agora.
            </div>
            <Button
              type="button"
              onClick={onRetry}
              variant="link"
              size="sm"
              className="h-auto shrink-0 px-0 text-critical"
            >
              Tentar novamente
            </Button>
          </div>
        ) : ranked.length === 0 ? (
          <p className="text-sm text-ink-2">Ainda não há dados suficientes de ranking este mês.</p>
        ) : (
          <motion.div
            variants={staggerContainer()}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {ranked.map((row, index) => {
              const Icon = POSITION_ICONS[index];
              const isCurrentUser =
                !!currentUserName &&
                row.label.trim().toLowerCase() === currentUserName.trim().toLowerCase();
              return (
                <motion.div
                  key={row.label}
                  variants={staggerItem}
                  className={`flex items-center gap-3 rounded-card border p-3.5 transition-colors ${
                    isCurrentUser ? 'border-brand/40 bg-soft' : 'border-line bg-surface-2'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-surface border border-line text-ink-2 font-black text-xs">
                    {Icon ? <Icon className="w-4 h-4 text-brand" /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink truncate">
                      {row.label}
                      {isCurrentUser && <span className="text-brand"> · você</span>}
                    </p>
                    <p className="text-[11px] text-ink-2">{row.count} leads no funil</p>
                  </div>
                  <p className="text-lg font-black text-brand shrink-0">{row.won}</p>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}
