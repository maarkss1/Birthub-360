import { useEffect } from 'react';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { usePomodoro } from '../hooks/usePomodoro';
import { voiceCommandBus } from '../../../lib/voiceCommandBus';

const VOICE_OWNER_ID = 'mesa-tratamento:pomodoro';

function formatClock(totalSeconds: number): string {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const PHASE_LABEL: Record<string, string> = {
  idle: 'Aguardando',
  focus: 'Foco 🔥',
  break: 'Descanso 💧',
  long_break: 'Descanso longo ☕',
};

/** Timer Pomodoro opcional da Mesa de Tratamento — apoio de produtividade, nunca um bloqueio da
 *  fila (ver comentário em usePomodoro.ts). Compacto de propósito: fica sempre visível no topo da
 *  tela sem competir com o card de tratamento, que é o conteúdo principal desta página. */
export function PomodoroWidget() {
  const {
    phase,
    remaining,
    paused,
    cycleIndex,
    cyclesBeforeLongBreak,
    focusMin,
    startFocus,
    pause,
    resume,
    reset,
  } = usePomodoro();

  const isRunning = phase !== 'idle';
  const isBreak = phase === 'break' || phase === 'long_break';

  // Comando de voz mãos-livres — portado do protótipo standalone `acompanhamento-sdr` (js/
  // voice-service.js, comandos "iniciar foco"/"sincronizar"), mas via o assistente de voz global
  // já existente (`VoiceCommandWidget`, ver `voiceCommandBus.ts`) em vez de um segundo microfone
  // sempre ativo — só o ditado pontual (useVoiceDictation) fica embutido no formulário. Cada
  // comando só entra na lista quando a ação correspondente é realmente possível no estado atual
  // (ex.: "pausar" não aparece se já está pausado), pelo mesmo motivo que os botões acima também
  // somem/aparecem condicionalmente.
  useEffect(() => {
    const commands = [
      !isRunning && {
        keywords: ['iniciar foco', 'começar foco', 'iniciar pomodoro'],
        phrase: 'iniciar foco',
        confirmationLabel: 'Bloco de foco iniciado',
        handler: startFocus,
      },
      isRunning &&
        !isBreak &&
        !paused && {
          keywords: ['pausar'],
          phrase: 'pausar',
          confirmationLabel: 'Cronômetro pausado',
          handler: pause,
        },
      isRunning &&
        !isBreak &&
        paused && {
          keywords: ['retomar', 'continuar'],
          phrase: 'retomar',
          confirmationLabel: 'Cronômetro retomado',
          handler: resume,
        },
      isRunning && {
        keywords: ['reiniciar cronômetro', 'reiniciar timer', 'reiniciar pomodoro'],
        phrase: 'reiniciar cronômetro',
        confirmationLabel: 'Cronômetro reiniciado',
        handler: reset,
      },
    ].filter((c): c is Exclude<typeof c, false> => !!c);

    voiceCommandBus.registerCommands(VOICE_OWNER_ID, commands);
    return () => voiceCommandBus.unregister(VOICE_OWNER_ID);
  }, [isRunning, isBreak, paused, startFocus, pause, resume, reset]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-2.5 shadow-card">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${isBreak ? 'bg-ok/15 text-ok-active dark:text-ok' : 'bg-brand/10 text-brand'}`}
      >
        <Timer className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-2">
          {PHASE_LABEL[phase]}
          {isRunning && !isBreak && (
            <span className="ml-1.5 font-normal normal-case text-ink-2">
              · ciclo {cycleIndex}/{cyclesBeforeLongBreak}
            </span>
          )}
        </p>
        <p className="font-mono text-lg font-bold tabular-nums text-ink">
          {isRunning ? formatClock(remaining) : `${focusMin}:00`}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {!isRunning && (
          <button
            type="button"
            onClick={startFocus}
            className="flex items-center gap-1.5 rounded-xl bg-brand-active px-3 py-1.5 text-xs font-bold text-on-brand transition-colors duration-200 hover:bg-brand-2"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" /> Iniciar foco
          </button>
        )}
        {isRunning && !isBreak && !paused && (
          <button
            type="button"
            onClick={pause}
            aria-label="Pausar cronômetro"
            className="grid h-8 w-8 place-items-center rounded-xl border border-line text-ink-2 transition-colors duration-200 hover:bg-surface-2 hover:text-ink"
          >
            <Pause className="h-4 w-4" />
          </button>
        )}
        {isRunning && !isBreak && paused && (
          <button
            type="button"
            onClick={resume}
            aria-label="Retomar cronômetro"
            className="grid h-8 w-8 place-items-center rounded-xl border border-line text-ink-2 transition-colors duration-200 hover:bg-surface-2 hover:text-ink"
          >
            <Play className="h-4 w-4" />
          </button>
        )}
        {isRunning && (
          <button
            type="button"
            onClick={reset}
            aria-label="Reiniciar cronômetro"
            className="grid h-8 w-8 place-items-center rounded-xl border border-line text-ink-2 transition-colors duration-200 hover:bg-surface-2 hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
