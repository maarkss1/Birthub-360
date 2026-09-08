/**
 * HubTaskWidget — widget de tarefas pendentes portado do portalatlasprototype.html.
 *
 * Estado local: lista inicial de demonstração de tarefas designadas por gestores.
 * Regra de dados: tarefas são estado UI (não vêm do banco), visíveis somente no Hub,
 * sem dado pessoal armazenado — estado local sem persistência é suficiente para esta
 * funcionalidade de UX do portal.
 */
import { useState, useId } from 'react';
import { Plus, Check } from 'lucide-react';

interface Task {
  text: string;
  assignee: string;
  done: boolean;
}

const INITIAL_TASKS: Task[] = [
  { text: 'Ligar para Cargas Bragança', assignee: 'Bruno Alves', done: false },
  { text: 'Enviar proposta GR — Frota Norte Log', assignee: 'Aline Souza', done: false },
  { text: 'Revisar apólice Expresso Serra Azul', assignee: 'Aline Souza', done: true },
];

const ASSIGNEES = ['Aline Souza', 'Bruno Alves', 'Marcelo Nascimento'];

export function HubTaskWidget() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [newText, setNewText] = useState('');
  const [assignee, setAssignee] = useState(ASSIGNEES[0]);
  const inputId = useId();

  const pending = tasks.filter((t) => !t.done).length;

  function toggle(index: number) {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, done: !t.done } : t)),
    );
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;
    setTasks((prev) => [{ text: newText.trim(), assignee, done: false }, ...prev]);
    setNewText('');
  }

  return (
    <div className="hub-widget flex flex-col px-3 py-2.5" style={{ width: 236 }}>
      {/* Cabeçalho */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10.5px] font-black uppercase tracking-[0.04em] text-ink-2">
          Tarefas pendentes
        </span>
        <span className="rounded-full bg-brand px-1.5 py-px text-[9.5px] font-black text-white">
          {pending}
        </span>
      </div>

      {/* Lista */}
      <div className="mb-1.5 flex max-h-[82px] flex-col gap-1 overflow-y-auto">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10.5px]">
            <button
              type="button"
              aria-label={task.done ? 'Desmarcar tarefa' : 'Marcar como concluída'}
              onClick={() => toggle(i)}
              className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border transition-colors ${
                task.done
                  ? 'border-ok bg-ok text-white'
                  : 'border-line-strong bg-transparent'
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
            <span className="shrink-0 whitespace-nowrap rounded-full bg-brand/10 px-1.5 py-px text-[8.5px] font-black text-brand-active">
              {task.assignee.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Formulário de nova tarefa */}
      <form
        onSubmit={add}
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
          className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-1.5 py-1 text-[10px] text-ink outline-none focus:border-brand/40"
        />
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          aria-label="Designar para"
          className="max-w-[72px] rounded-md border border-line bg-surface-2 text-[9px] text-ink outline-none"
        >
          {ASSIGNEES.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button
          type="submit"
          aria-label="Atribuir tarefa"
          className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand text-white hover:bg-brand-2"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
