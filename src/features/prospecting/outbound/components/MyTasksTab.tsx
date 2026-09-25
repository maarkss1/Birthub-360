import { useEffect, useState } from 'react';
import { Loader2, Calendar, CheckCircle2, Circle, Building2 } from 'lucide-react';
import type { LeadTask, User } from '../types.js';

interface MyTasksTabProps {
  user: User;
  isDark: boolean;
}

const BRAND_LABEL: Record<'atlas' | 'totaltrac', string> = {
  atlas: 'AtlasGR',
  totaltrac: 'Total Trac'
};

function isOverdue(task: LeadTask): boolean {
  return task.status === 'pending' && !!task.due_date
    && new Date(`${task.due_date}T00:00:00`) < new Date(new Date().toDateString());
}

function isToday(task: LeadTask): boolean {
  return !!task.due_date && new Date(`${task.due_date}T00:00:00`).toDateString() === new Date().toDateString();
}

export function MyTasksTab({ user, isDark }: MyTasksTabProps) {
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/tasks`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (task: LeadTask) => {
    const nextStatus: LeadTask['status'] = task.status === 'done' ? 'pending' : 'done';
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, userId: user.id })
      });
      if (!res.ok) throw new Error();
      const updated: LeadTask = await res.json();
      setTasks(prev => prev.map(t => (t.id === task.id ? updated : t)));
    } catch {
      setTasks(prev => prev.map(t => (t.id === task.id ? task : t)));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  const pending = tasks.filter(t => t.status === 'pending');
  const overdue = pending.filter(isOverdue);
  const today = pending.filter(t => !isOverdue(t) && isToday(t));
  const upcoming = pending.filter(t => !overdue.includes(t) && !today.includes(t));
  const done = tasks.filter(t => t.status === 'done');

  const groups: Array<{ title: string; items: LeadTask[]; accent: string }> = [
    { title: 'Atrasadas', items: overdue, accent: 'text-red-500' },
    { title: 'Hoje', items: today, accent: 'text-amber-500' },
    { title: 'Próximas', items: upcoming, accent: isDark ? 'text-slate-300' : 'text-slate-700' },
    { title: 'Concluídas', items: done, accent: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Minhas Tarefas</h2>
        <span className={`text-sm px-3 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
          {pending.length} pendente{pending.length === 1 ? '' : 's'}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className={`p-8 text-center rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            Nenhuma tarefa criada ainda. Crie tarefas a partir do card de cada lead (clique no nome do lead → Tarefas do Lead).
          </p>
        </div>
      ) : (
        groups.map(group => group.items.length > 0 && (
          <div key={group.title} className="space-y-2">
            <h3 className={`text-xs font-bold uppercase tracking-wide ${group.accent}`}>
              {group.title} · {group.items.length}
            </h3>
            <div className="space-y-1.5">
              {group.items.map(task => {
                const overdueFlag = isOverdue(task);
                const isDone = task.status === 'done';
                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(task)}
                      className="mt-0.5 shrink-0"
                      title={isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
                    >
                      {isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-400" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${isDone ? 'line-through text-slate-500' : (isDark ? 'text-slate-100' : 'text-slate-900')}`}>
                        {task.description}
                      </p>
                      <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {task.lead_name}
                          {task.lead_company && ` · ${BRAND_LABEL[task.lead_company]}`}
                        </span>
                        {task.due_date && (
                          <span className={`flex items-center gap-1 ${overdueFlag ? 'text-red-500 font-semibold' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(`${task.due_date}T00:00:00`).toLocaleDateString('pt-BR')}
                            {overdueFlag && ' · Atrasada'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
