import React, { useEffect, useState } from 'react';
import { Loader2, Calendar, Circle, Building2, ListChecks } from 'lucide-react';
import type { LeadTask } from '../types';

interface TasksOverviewTabProps {
  isDark: boolean;
}

function isOverdue(task: LeadTask): boolean {
  return task.status === 'pending' && !!task.due_date
    && new Date(`${task.due_date}T00:00:00`) < new Date(new Date().toDateString());
}

export function TasksOverviewTab({ isDark }: TasksOverviewTabProps) {
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  const bySeller = new Map<string, { userName: string; tasks: LeadTask[] }>();
  for (const task of tasks) {
    const key = task.user_id || 'sem-vendedor';
    if (!bySeller.has(key)) {
      bySeller.set(key, { userName: task.user_name || 'Sem vendedor atribuído', tasks: [] });
    }
    bySeller.get(key)!.tasks.push(task);
  }
  // Vendedores com mais tarefas pendentes/atrasadas primeiro — é quem o gestor mais precisa olhar.
  const sellers = Array.from(bySeller.values()).sort((a, b) => {
    const pendingA = a.tasks.filter(t => t.status === 'pending').length;
    const pendingB = b.tasks.filter(t => t.status === 'pending').length;
    return pendingB - pendingA;
  });

  const totalPending = tasks.filter(t => t.status === 'pending').length;
  const totalOverdue = tasks.filter(isOverdue).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ListChecks className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Tarefas por Vendedor
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm px-3 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
            {totalPending} pendente{totalPending === 1 ? '' : 's'}
          </span>
          {totalOverdue > 0 && (
            <span className="text-sm px-3 py-1 rounded-full bg-red-500/10 text-red-500 font-semibold">
              {totalOverdue} atrasada{totalOverdue === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      {sellers.length === 0 ? (
        <div className={`border-2 border-dashed rounded-2xl p-8 text-center text-sm ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-500 bg-white'}`}>
          Nenhuma tarefa criada por nenhum vendedor ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sellers.map(seller => {
            const pending = seller.tasks.filter(t => t.status === 'pending');
            const overdue = pending.filter(isOverdue);
            const done = seller.tasks.filter(t => t.status === 'done');
            return (
              <div
                key={seller.userName}
                className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
              >
                <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{seller.userName}</p>
                  <div className="flex items-center gap-1.5">
                    {overdue.length > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                        {overdue.length} atrasada{overdue.length === 1 ? '' : 's'}
                      </span>
                    )}
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                      {pending.length} pendente{pending.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {pending.length === 0 ? (
                  <p className={`px-4 py-6 text-sm text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Nenhuma tarefa pendente ({done.length} concluída{done.length === 1 ? '' : 's'}).
                  </p>
                ) : (
                  <div className="divide-y max-h-80 overflow-y-auto">
                    {pending
                      .slice()
                      .sort((a, b) => (a.due_date || '9999-99-99').localeCompare(b.due_date || '9999-99-99'))
                      .map(task => {
                        const overdueFlag = isOverdue(task);
                        return (
                          <div
                            key={task.id}
                            className={`px-4 py-2.5 flex items-start gap-2 ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}
                          >
                            <Circle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                {task.description}
                              </p>
                              <div className={`flex items-center gap-2 mt-0.5 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                <span className="flex items-center gap-1 truncate">
                                  <Building2 className="w-3 h-3 shrink-0" />
                                  {task.lead_name}
                                </span>
                                {task.due_date && (
                                  <span className={`flex items-center gap-1 shrink-0 ${overdueFlag ? 'text-red-500 font-semibold' : ''}`}>
                                    <Calendar className="w-3 h-3" />
                                    {new Date(`${task.due_date}T00:00:00`).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
