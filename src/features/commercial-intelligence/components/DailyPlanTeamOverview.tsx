import { AlertTriangle, CheckCircle2, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { UserDailyPlanSummary } from '../../../shared/contracts/dailyPlan.contract';
import { commercialIntelligenceApi, type DailyPlanTeamMember } from '../commercialIntelligence.api';

type TeamPlanState =
  | { status: 'loading' }
  | { status: 'ready'; plan: UserDailyPlanSummary }
  | { status: 'error' };

interface DailyPlanTeamOverviewProps {
  selectedMemberId: string;
  activePlan: UserDailyPlanSummary | null;
  onMemberSelect: (member: DailyPlanTeamMember) => void;
}

const TEAM_REQUEST_BATCH_SIZE = 4;

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function planStatus(state: TeamPlanState | undefined): {
  label: string;
  className: string;
} {
  if (!state || state.status === 'loading') {
    return { label: 'Carregando', className: 'bg-surface-2 text-ink-2 border-line' };
  }
  if (state.status === 'error') {
    return { label: 'Indisponível', className: 'bg-critical/10 text-critical border-critical/20' };
  }
  if (!state.plan.isBitrixConnected) {
    return { label: 'Sem conexão Bitrix', className: 'bg-surface-2 text-ink-2 border-line' };
  }
  if (!state.plan.bitrixUserId) {
    return {
      label: 'Sem vínculo Bitrix',
      className: 'bg-warning/10 text-warning-active dark:text-warning border-warning/20',
    };
  }
  if (state.plan.kpis.urgentItems > 0) {
    return { label: 'Atenção', className: 'bg-critical/10 text-critical border-critical/20' };
  }
  if (state.plan.kpis.totalItems === 0) {
    return { label: 'Sem itens hoje', className: 'bg-surface-2 text-ink-2 border-line' };
  }
  if (state.plan.kpis.pendingItems === 0) {
    return {
      label: 'Concluído',
      className: 'bg-success/10 text-success-active dark:text-success border-success/20',
    };
  }
  return { label: 'Em andamento', className: 'bg-brand/10 text-brand-active border-brand/20' };
}

export function DailyPlanTeamOverview({
  selectedMemberId,
  activePlan,
  onMemberSelect,
}: DailyPlanTeamOverviewProps) {
  const [members, setMembers] = useState<DailyPlanTeamMember[]>([]);
  const [connectionLabel, setConnectionLabel] = useState<string | null>(null);
  const [plans, setPlans] = useState<Record<string, TeamPlanState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await commercialIntelligenceApi.dailyPlanTeamMembers();
      const owners = response.members;
      setMembers(owners);
      setConnectionLabel(response.connectionLabel);
      setPlans(
        Object.fromEntries(owners.map((member) => [member.id, { status: 'loading' }])) as Record<
          string,
          TeamPlanState
        >,
      );

      // Limita a concorrência para não criar uma rajada de chamadas ao Bitrix em equipes maiores.
      for (let index = 0; index < owners.length; index += TEAM_REQUEST_BATCH_SIZE) {
        const batch = owners.slice(index, index + TEAM_REQUEST_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((member) => commercialIntelligenceApi.getDailyPlan(member.id)),
        );

        setPlans((current) => {
          const next = { ...current };
          results.forEach((result, resultIndex) => {
            const member = batch[resultIndex];
            if (!member) return;
            next[member.id] =
              result.status === 'fulfilled'
                ? { status: 'ready', plan: result.value }
                : { status: 'error' };
          });
          return next;
        });
      }
    } catch {
      setMembers([]);
      setConnectionLabel(null);
      setPlans({});
      setError(
        'Não foi possível carregar a equipe agora. Seu plano individual continua disponível.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const effectivePlans = useMemo(() => {
    if (!activePlan || !selectedMemberId) return plans;
    return {
      ...plans,
      [selectedMemberId]: { status: 'ready', plan: activePlan } satisfies TeamPlanState,
    };
  }, [activePlan, plans, selectedMemberId]);

  const consolidated = useMemo(() => {
    const available = Object.values(effectivePlans).flatMap((state) =>
      state.status === 'ready' ? [state.plan] : [],
    );
    if (available.length === 0) return null;

    const totalItems = available.reduce((sum, plan) => sum + plan.kpis.totalItems, 0);
    const completedItems = available.reduce((sum, plan) => sum + plan.kpis.completedItems, 0);
    return {
      available: available.length,
      pending: available.reduce((sum, plan) => sum + plan.kpis.pendingItems, 0),
      urgent: available.reduce((sum, plan) => sum + plan.kpis.urgentItems, 0),
      completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    };
  }, [effectivePlans]);

  return (
    <section
      aria-labelledby="daily-plan-team-heading"
      aria-busy={isLoading}
      className="rounded-3xl border border-line bg-surface p-4 shadow-card md:p-5"
    >
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-active dark:text-brand-2" aria-hidden="true" />
            <h2 id="daily-plan-team-heading" className="text-sm font-black text-ink">
              Visão gerencial da equipe
            </h2>
          </div>
          <p className="mt-1 text-xs text-ink-2">
            Planos reais do portal {connectionLabel ? `“${connectionLabel}”` : 'Bitrix24'}.
            Selecione uma pessoa para abrir a fila operacional.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadTeam()}
          disabled={isLoading}
          className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-xl border border-line bg-bg px-3 text-xs font-bold text-ink transition-colors hover:border-brand/40 hover:bg-surface-2 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Atualizar equipe
        </button>
      </div>

      {error ? (
        <div
          className="mt-4 flex items-start gap-2 rounded-2xl border border-critical/20 bg-critical/5 p-4 text-sm text-critical"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : members.length === 0 && isLoading ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-line p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line p-6 text-center">
          <p className="text-sm font-bold text-ink">Nenhum integrante disponível</p>
          <p className="mt-1 text-xs text-ink-2">
            A organização ainda não possui usuários que possam ser exibidos no plano diário.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)]">
          <section
            className="grid max-h-[22rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: região com rolagem própria precisa ser alcançável por teclado
            tabIndex={0}
            aria-label="Integrantes da equipe e situação dos planos diários"
          >
            {members.map((member) => {
              const state = effectivePlans[member.id];
              const status = planStatus(state);
              const isSelected = member.id === selectedMemberId;
              return (
                <button
                  key={member.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onMemberSelect(member)}
                  className={`rounded-2xl border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-brand bg-brand/5 shadow-sm'
                      : 'border-line bg-bg hover:border-brand/30 hover:bg-surface-2'
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-black text-brand-active dark:text-brand-2">
                      {initials(member.name) || '—'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-ink">{member.name}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[10px] font-black uppercase tracking-wider text-ink-3">
                        Usuário ativo no Bitrix24
                      </span>
                      <span className="mt-2 block text-xs text-ink-2">
                        {state?.status === 'ready'
                          ? `${state.plan.kpis.pendingItems} pendente(s) · ${state.plan.kpis.urgentItems} urgente(s)`
                          : state?.status === 'error'
                            ? 'Carga do plano não disponível'
                            : 'Carregando carga do plano…'}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </section>

          <div className="rounded-2xl border border-line bg-bg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className="h-4 w-4 text-success-active dark:text-success"
                aria-hidden="true"
              />
              <h3 className="text-xs font-black uppercase tracking-wider text-ink">
                Consolidado disponível
              </h3>
            </div>
            <p className="mt-1 text-[11px] text-ink-2">
              Soma somente os planos carregados; falhas nunca entram como zero.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-surface p-3">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  Cobertura
                </dt>
                <dd className="mt-1 text-lg font-black text-ink">
                  {consolidated ? `${consolidated.available}/${members.length}` : '—'}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  Conclusão
                </dt>
                <dd className="mt-1 text-lg font-black text-success-active dark:text-success">
                  {consolidated ? `${consolidated.completionRate}%` : '—'}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  Pendentes
                </dt>
                <dd className="mt-1 text-lg font-black text-warning-active dark:text-warning">
                  {consolidated?.pending ?? '—'}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  Urgentes
                </dt>
                <dd className="mt-1 text-lg font-black text-critical">
                  {consolidated?.urgent ?? '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}
