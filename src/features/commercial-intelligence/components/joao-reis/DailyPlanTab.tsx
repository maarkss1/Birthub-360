import {
  AlertTriangle,
  CheckSquare,
  FileText,
  Flame,
  RotateCcw,
  Send,
  Square,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { type DailyTask, DEFAULT_DAILY_PLAN, DIAGNOSTIC_DATA } from './data';

export function DailyPlanTab({ onNavigateToEmCadencia }: { onNavigateToEmCadencia: () => void }) {
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(DEFAULT_DAILY_PLAN);
  const [dailyNotes, setDailyNotes] = useState<string>('');
  const [todayActivitiesCount, setTodayActivitiesCount] = useState<number>(28);
  const [channelTag, setChannelTag] = useState<
    '[WhatsApp]' | '[Ligação]' | '[E-mail]' | '[LinkedIn]'
  >('[WhatsApp]');
  const [sprintLeadIndex, setSprintLeadIndex] = useState<number>(0);

  const toggleTask = (id: string) => {
    setDailyTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );
  };

  const resetDailyTasks = () => {
    setDailyTasks(DEFAULT_DAILY_PLAN.map((t: DailyTask) => ({ ...t, completed: false })));
  };

  const dailyTarget = 60;
  const currentPacePercent = Math.min(100, Math.round((todayActivitiesCount / dailyTarget) * 100));

  return (
    <div className="space-y-6">
      {/* ITEM 3: Tracker de Pace Diário ao Vivo & Alertas de SLA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pace Meter */}
        <div className="p-5 rounded-card-lg border border-line bg-surface shadow-card space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-brand" />
              <h3 className="text-sm font-black text-ink">
                Medidor de Pace Diário (Meta 60 toques)
              </h3>
            </div>
            <span className="text-xs font-bold font-mono text-brand">
              {todayActivitiesCount} / 60 toques
            </span>
          </div>
          <div className="w-full bg-surface-2 h-4 rounded-full overflow-hidden border border-line">
            <div
              className="bg-gradient-to-r from-brand to-brand-2 h-full transition-colors duration-500 rounded-full"
              style={{ width: `${currentPacePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-ink-2">
            <span>
              Ritmo atual: <b>~3.5 toques/hora</b>
            </span>
            <button
              type="button"
              onClick={() => setTodayActivitiesCount((prev) => prev + 1)}
              className="px-3 py-1 rounded-xl bg-brand/10 text-brand font-bold text-[11px] hover:bg-brand/20 transition-colors cursor-pointer"
            >
              + Registrar toque rápido (+1)
            </button>
          </div>
        </div>

        {/* Alerta de SLA Excedido */}
        <div className="p-5 rounded-card-lg border border-critical/30 bg-critical/5 shadow-card space-y-2">
          <div className="flex items-center gap-2 text-critical">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="text-xs font-black uppercase">Alerta de SLA (&lt; 24h)</h3>
          </div>
          <p className="text-xs text-ink-2">
            <b>16 leads novos de Agosto</b> estão sem contato inicial. Tempo médio de reação a ser
            corrigido.
          </p>
          <button
            type="button"
            onClick={() => onNavigateToEmCadencia()}
            className="w-full py-1.5 rounded-xl bg-critical text-white font-bold text-xs shadow-sm hover:brightness-110 transition-colors cursor-pointer"
          >
            Atacar Leads sem SLA agora
          </button>
        </div>
      </div>

      {/* ITEM 2: Sprint Launcher de Prospecção em 1 Clique & Validador Bitrix24 */}
      <div className="p-6 rounded-card-lg border border-line bg-surface shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-ink flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold" />
              Sprint Launcher de Prospecção &amp; Validador de Registros Bitrix24
            </h3>
            <p className="text-xs text-ink-2">
              Selecione a tag de canal real obrigatória antes de registrar sua atividade.
            </p>
          </div>
          {/* Seleção de Tag de Canal */}
          <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-xl border border-line">
            {(['[WhatsApp]', '[Ligação]', '[E-mail]', '[LinkedIn]'] as const).map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => setChannelTag(tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  channelTag === tag
                    ? 'bg-brand-active text-on-brand shadow-sm'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Fila do Sprint em 1 Clique */}
        <div className="p-4 rounded-2xl border border-brand/20 bg-soft flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-brand tracking-widest">
              Fila do Sprint (Lead {sprintLeadIndex + 1} de{' '}
              {DIAGNOSTIC_DATA.emCadencia.topLeads.length})
            </span>
            <h4 className="text-base font-black text-ink">
              {DIAGNOSTIC_DATA.emCadencia.topLeads[sprintLeadIndex].nome}
            </h4>
            <p className="text-xs text-ink-2">
              Status: {DIAGNOSTIC_DATA.emCadencia.topLeads[sprintLeadIndex].status} · Parado há{' '}
              {DIAGNOSTIC_DATA.emCadencia.topLeads[sprintLeadIndex].diasParado} dias
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTodayActivitiesCount((p) => p + 1);
                setSprintLeadIndex(
                  (prev) => (prev + 1) % DIAGNOSTIC_DATA.emCadencia.topLeads.length,
                );
              }}
              className="px-4 py-2.5 rounded-xl bg-brand-active text-on-brand font-bold text-xs shadow-md hover:brightness-105 transition-colors cursor-pointer flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Salvar toque como {channelTag}
            </button>
            <button
              type="button"
              onClick={() =>
                setSprintLeadIndex(
                  (prev) => (prev + 1) % DIAGNOSTIC_DATA.emCadencia.topLeads.length,
                )
              }
              className="px-3 py-2.5 rounded-xl border border-line bg-surface text-ink-2 font-bold text-xs hover:bg-surface-2 transition-colors cursor-pointer"
            >
              Pular Lead
            </button>
          </div>
        </div>
      </div>

      {/* Checklist do Roteiro Diário */}
      <div className="p-6 rounded-card-lg border border-line bg-surface shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-ink flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-brand" />
            Roteiro do Dia — Passo a Passo por Bloco de Horário
          </h3>
          <button
            type="button"
            onClick={resetDailyTasks}
            className="p-1.5 rounded-lg border border-line bg-surface-2 text-ink-2 hover:text-ink transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Resetar
          </button>
        </div>

        <div className="space-y-3">
          {dailyTasks.map((task) => (
            <button
              type="button"
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-colors cursor-pointer flex items-start gap-4 ${
                task.completed
                  ? 'bg-ok/5 border-ok/30 text-ink opacity-85'
                  : 'bg-surface-2/60 border-line hover:border-brand/40'
              }`}
            >
              <span className={`mt-1 shrink-0 ${task.completed ? 'text-ok' : 'text-ink-2'}`}>
                {task.completed ? (
                  <CheckSquare className="w-6 h-6" />
                ) : (
                  <Square className="w-6 h-6" />
                )}
              </span>

              <div className="flex-1 space-y-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                  <span className="text-xs font-black text-brand uppercase tracking-wider">
                    {task.timeBlock}
                  </span>
                  {task.targetCount && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                      Alvo: {task.targetCount}
                    </span>
                  )}
                </div>

                <h4
                  className={`text-sm font-black ${task.completed ? 'line-through text-ink-2' : 'text-ink'}`}
                >
                  {task.title}
                </h4>

                <p className="text-xs text-ink-2 leading-relaxed">{task.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bloco de Anotações Diárias */}
      <div className="p-6 rounded-card-lg border border-line bg-surface shadow-card space-y-3">
        <h3 className="text-sm font-black text-ink flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand" />
          Notas &amp; Acompanhamento do Dia — João Reis
        </h3>
        <textarea
          value={dailyNotes}
          onChange={(e) => setDailyNotes(e.target.value)}
          placeholder="Escreva aqui compromissos do dia, objeções marcantes de clientes, retornos prometidos para amanhã..."
          className="w-full h-24 p-3 rounded-xl border border-line bg-surface-2 text-ink text-xs focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
    </div>
  );
}
