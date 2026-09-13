import { prisma } from '../../../../lib/prisma.js';
import type {
  DailyClosingMetrics,
  PendingDailyClosing,
} from '../../../../shared/contracts/dailyPlan.contract.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { toPlanDate } from './dailyPlan.service.js';

export type {
  DailyClosingMetrics,
  PendingDailyClosing,
} from '../../../../shared/contracts/dailyPlan.contract.js';

/**
 * Fechamento obrigatório do Plano Diário (ver `DailyPlanClosing` no schema e
 * `DailyClosingGate.tsx`) — extraído de `dailyPlan.service.ts` (ver check-hotspots.ts /
 * HOTSPOT_EXCEPTIONS.md) porque é uma preocupação distinta do radar ao vivo: fechamento de fim de
 * dia + planejamento do novo dia, não itens pendentes do momento.
 */

/**
 * Métricas de um dia civil específico, só a partir de `Activity` locais (`LOCAL_ACTIVITY`) do
 * usuário — o Bitrix24 não expõe um snapshot histórico do que estava pendente naquele dia, só o
 * estado ao vivo, por isso o parecer de fechamento não inclui itens do Bitrix.
 */
async function computeLocalActivityMetricsForDay(
  organizationId: string,
  userId: string,
  dayStr: string,
): Promise<DailyClosingMetrics> {
  const startOfDay = new Date(dayStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dayStr);
  endOfDay.setHours(23, 59, 59, 999);

  const activities = await prisma.activity.findMany({
    where: { organizationId, owner: userId, date: { gte: startOfDay, lte: endOfDay } },
    select: { status: true },
  });

  const totalItems = activities.length;
  const completedItems = activities.filter((a) => a.status === 'Concluida').length;
  const pendingItems = totalItems - completedItems;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return { totalItems, completedItems, pendingItems, completionRate };
}

/**
 * Verifica se o usuário tem um fechamento de Plano Diário pendente: existe algum dia civil
 * anterior a hoje com pelo menos uma `Activity` local e sem `DailyPlanClosing` registrado. Só olha
 * o dia mais recente com atividade (não acumula múltiplos dias em atraso) — se o usuário ficar
 * vários dias sem logar, só o último dia com atividade é cobrado, para não travar indefinidamente
 * quem volta de férias/licença.
 */
export async function getPendingDailyClosing(
  organizationId: string,
  userId: string,
): Promise<PendingDailyClosing> {
  const now = new Date();
  const todayStr = toPlanDate(now) ?? now.toISOString().slice(0, 10);
  const startOfToday = new Date(todayStr);
  startOfToday.setHours(0, 0, 0, 0);

  const lastActivity = await prisma.activity.findFirst({
    where: { organizationId, owner: userId, date: { lt: startOfToday } },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  if (!lastActivity) return { pending: false };

  const referenceDate =
    toPlanDate(lastActivity.date) ?? lastActivity.date.toISOString().slice(0, 10);

  const existingClosing = await prisma.dailyPlanClosing.findUnique({
    where: { userId_referenceDate: { userId, referenceDate } },
  });
  if (existingClosing) return { pending: false };

  const metrics = await computeLocalActivityMetricsForDay(organizationId, userId, referenceDate);
  return { pending: true, referenceDate, metrics };
}

/**
 * Registra o fechamento do Plano Diário: parecer do usuário sobre `referenceDate` + metas para o
 * novo dia. `upsert` porque o gate pode ser reenviado (ex.: falha de rede após o primeiro submit)
 * sem violar a constraint única `(userId, referenceDate)`.
 */
export async function createDailyPlanClosing(
  organizationId: string,
  userId: string,
  input: { referenceDate: string; userComment: string; nextDayGoals: string[] },
): Promise<{ success: boolean }> {
  if (!input.referenceDate) throw new AppError('referenceDate é obrigatório.', 400);
  if (!input.userComment.trim()) throw new AppError('O parecer do dia é obrigatório.', 400);

  const goals = (input.nextDayGoals || [])
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (goals.length === 0) {
    throw new AppError('Defina ao menos uma meta para o novo dia.', 400);
  }

  const metrics = await computeLocalActivityMetricsForDay(
    organizationId,
    userId,
    input.referenceDate,
  );

  await prisma.dailyPlanClosing.upsert({
    where: { userId_referenceDate: { userId, referenceDate: input.referenceDate } },
    create: {
      organizationId,
      userId,
      referenceDate: input.referenceDate,
      userComment: input.userComment.trim(),
      nextDayGoals: goals,
      ...metrics,
    },
    update: {
      userComment: input.userComment.trim(),
      nextDayGoals: goals,
      ...metrics,
    },
  });

  return { success: true };
}
