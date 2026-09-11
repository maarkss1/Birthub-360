/**
 * HubTaskWidget — widget de tarefas pendentes do Hub Executivo.
 *
 * Cada tarefa aqui É uma tarefa real do Bitrix24 (tasks.task.*), criada pelo usuário logado e
 * delegada a um colega real do portal — pedido explícito do usuário ("tudo tem que estar em
 * sincronia com o Bitrix24"). Antes desta mudança, a lista era `useState` local com 3 nomes fixos
 * e nenhuma chamada de rede: marcar uma tarefa como concluída ou delegar uma nova parecia real
 * (nome de responsável, checkbox), mas se perdia ao recarregar a página. Ver
 * `src/features/integrations/bitrix/service/hubTasks.service.ts` para a lógica do lado do
 * servidor (não há tabela nova no Postgres — o Bitrix é a fonte de verdade).
 */

import { AlertTriangle, Check, Loader2, Plus } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useId, useState } from 'react';
import { api } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface HubTask {
  id: string;
  text: string;
  assigneeId: string;
  assigneeName: string;
  done: boolean;
}

interface BitrixUserOption {
  id: string;
  name: string;
  email: string | null;
}

interface HubTasksResponse {
  tasks: HubTask[];
  assignees: BitrixUserOption[];
}

export function HubTaskWidget() {
  const [tasks, setTasks] = useState<HubTask[]>([]);
  const [assignees, setAssignees] = useState<BitrixUserOption[]>([]);
  const [newText, setNewText] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const inputId = useId();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<HubTasksResponse>('/api/bitrix/hub-tasks');
      setTasks(result.tasks);
      setAssignees(result.assignees);
      setAssigneeId((current) => current || result.assignees[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar tarefas do Bitrix24.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = tasks.filter((t) => !t.done).length;

  async function toggle(task: HubTask) {
    setTogglingId(task.id);
    // Otimista: o Hub é um widget compacto revisitado com frequência — esperar a ida-e-volta pro
    // Bitrix pra cada clique de checkbox deixaria a interação visivelmente travada.
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    try {
      const result = await api.post<HubTasksResponse>(`/api/bitrix/hub-tasks/${task.id}/toggle`, {
        done: !task.done,
      });
      setTasks(result.tasks);
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)));
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar tarefa no Bitrix24.');
    } finally {
      setTogglingId(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.trim() || !assigneeId || submitting) return;
    setSubmitting(true);
    try {
      const result = await api.post<HubTasksResponse>('/api/bitrix/hub-tasks', {
        text: newText.trim(),
        assigneeId,
      });
      setTasks(result.tasks);
      setNewText('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao criar tarefa no Bitrix24.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="hub-widget flex flex-col px-3 py-2.5" style={{ width: 236 }}>
      {/* Cabeçalho */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10.5px] font-black uppercase tracking-[0.04em] text-ink-2">
          Tarefas pendentes
        </span>
        {!loading && !error && (
          <span className="rounded-full bg-brand px-1.5 py-px text-[9.5px] font-black text-on-brand">
            {pending}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-1.5 py-3 text-[10.5px] text-ink-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando do Bitrix24…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-1.5 py-2 text-[10px] text-danger-active dark:text-danger">
          <AlertTriangle className="h-3 w-3 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Lista */}
          <div className="mb-1.5 flex max-h-[82px] flex-col gap-1 overflow-y-auto">
            {tasks.length === 0 && (
              <p className="text-[10px] text-ink-2 py-1">Nenhuma tarefa delegada ainda.</p>
            )}
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-1.5 text-[10.5px]">
                <button
                  type="button"
                  aria-label={task.done ? 'Desmarcar tarefa' : 'Marcar como concluída'}
                  onClick={() => void toggle(task)}
                  disabled={togglingId === task.id}
                  className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border transition-colors disabled:opacity-50 ${
                    task.done ? 'border-ok bg-ok text-white' : 'border-line-strong bg-transparent'
                  }`}
                >
                  {task.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                </button>
                <span
                  className={`flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold ${
                    task.done ? 'text-ink-2 line-through opacity-60' : 'text-ink'
                  }`}
                >
                  {task.text}
                </span>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-brand/10 px-1.5 py-px text-[8.5px] font-black text-brand-ink">
                  {task.assigneeName.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>

          {/* Formulário de nova tarefa */}
          <form
            onSubmit={(e) => void add(e)}
            className="flex gap-1 border-t border-line pt-1.5"
            aria-label="Adicionar tarefa"
          >
            <label htmlFor={inputId} className="sr-only">
              Nova tarefa
            </label>
            <input
              id={inputId}
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Nova tarefa…"
              maxLength={60}
              disabled={submitting}
              className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-1.5 py-1 text-[10px] text-ink outline-none focus:border-brand/40 disabled:opacity-50"
            />
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              aria-label="Designar para"
              disabled={submitting || assignees.length === 0}
              className="max-w-[72px] rounded-md border border-line bg-surface-2 text-[9px] text-ink outline-none disabled:opacity-50"
            >
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              aria-label="Atribuir tarefa"
              disabled={submitting || !newText.trim() || !assigneeId}
              className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand text-on-brand hover:bg-brand-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
              ) : (
                <Plus className="h-3 w-3" strokeWidth={2.5} />
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
