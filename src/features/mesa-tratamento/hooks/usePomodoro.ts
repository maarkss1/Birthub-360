import { useCallback, useEffect, useRef, useState } from 'react';
import { SoundFX } from '../../../lib/soundEffects';
import { mesaTratamentoApi } from '../mesaTratamento.api';
import { toast } from '../../../lib/toast';

type PomodoroPhase = 'idle' | 'focus' | 'break' | 'long_break';

interface PomodoroSettings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  cyclesBeforeLongBreak: number;
}

interface PomodoroState {
  phase: PomodoroPhase;
  /** Epoch ms em que o bloco atual termina — 0 quando parado. */
  endAt: number;
  paused: boolean;
  remainingWhenPaused: number;
  cycleIndex: number;
  settings: PomodoroSettings;
}

const STORAGE_KEY = 'atlasgr:mesa-pomodoro-state';

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  cyclesBeforeLongBreak: 4,
};

function defaultState(): PomodoroState {
  return {
    phase: 'idle',
    endAt: 0,
    paused: false,
    remainingWhenPaused: 0,
    cycleIndex: 0,
    settings: DEFAULT_SETTINGS,
  };
}

function loadState(): PomodoroState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState(), ...(JSON.parse(raw) as Partial<PomodoroState>) };
  } catch {
    // localStorage indisponível (modo privado etc.) — segue com o estado padrão.
  }
  return defaultState();
}

function persist(state: PomodoroState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Idem — timer só não sobrevive a um reload, sem quebrar o resto da tela.
  }
}

function computeRemaining(state: PomodoroState): number {
  if (state.paused) return state.remainingWhenPaused;
  if (!state.endAt || state.phase === 'idle') return state.settings.focusMin * 60;
  return Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
}

/**
 * Timer Pomodoro da Mesa de Tratamento — portado do protótipo standalone `acompanhamento-sdr`
 * (js/pomodoro-engine.js), mas deliberadamente SEM o bloqueio do botão "Registrar" fora de um
 * bloco de foco ativo (`strictLock` do protótipo): ninguém no time usa Pomodoro ainda, travar a
 * ação principal da tela por trás de um recurso novo e opcional quebraria o fluxo atual (ver
 * Constituição §6/§10) — aqui o timer é só um apoio de produtividade, motivacional, nunca um gate.
 * Estado do timer em si fica no localStorage (é preferência pessoal efêmera de uma aba; não faz
 * sentido sincronizar entre dispositivos) — só os blocos de foco CONCLUÍDOS são enviados ao
 * backend (`logPomodoroSession`), porque esses sim alimentam o dashboard do time inteiro.
 */
export function usePomodoro() {
  const [state, setState] = useState<PomodoroState>(loadState);
  const [remaining, setRemaining] = useState<number>(() => computeRemaining(loadState()));
  const stateRef = useRef(state);
  stateRef.current = state;

  const logCompletedFocus = useCallback((durationMinutes: number, cycleNumber: number) => {
    mesaTratamentoApi.logPomodoroSession({ durationMinutes, cycleNumber }).catch(() => {
      // Não interrompe o timer nem incomoda o usuário por uma falha de rede aqui — só o
      // dashboard fica sem esse bloco, sem afetar o uso do timer em si.
    });
  }, []);

  useEffect(() => {
    const tick = () => {
      const current = stateRef.current;
      if (current.phase === 'idle' || current.paused) {
        setRemaining(computeRemaining(current));
        return;
      }
      const rem = computeRemaining(current);
      if (current.phase === 'focus' && rem <= 0) {
        logCompletedFocus(current.settings.focusMin, current.cycleIndex);
        SoundFX.play('success');
        setState((s) => {
          const isLongBreak = s.cycleIndex >= s.settings.cyclesBeforeLongBreak;
          const min = isLongBreak ? s.settings.longBreakMin : s.settings.shortBreakMin;
          toast.success(
            isLongBreak ? 'Descanso longo iniciado (15 min) ☕' : 'Descanso de 5 min iniciado 💧',
          );
          return {
            ...s,
            phase: isLongBreak ? 'long_break' : 'break',
            endAt: Date.now() + min * 60_000,
            paused: false,
            remainingWhenPaused: 0,
          };
        });
        return;
      }
      if ((current.phase === 'break' || current.phase === 'long_break') && rem <= 0) {
        SoundFX.play('confirm');
        toast.success('Descanso concluído! Pronto para o próximo bloco de foco.');
        setState((s) => ({ ...s, phase: 'idle', endAt: 0, paused: false, remainingWhenPaused: 0 }));
        return;
      }
      setRemaining(rem);
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [logCompletedFocus]);

  useEffect(() => {
    persist(state);
    setRemaining(computeRemaining(state));
  }, [state]);

  const startFocus = useCallback(() => {
    SoundFX.play('focus');
    setState((s) => ({
      ...s,
      phase: 'focus',
      endAt: Date.now() + s.settings.focusMin * 60_000,
      paused: false,
      remainingWhenPaused: 0,
      cycleIndex: (s.cycleIndex % s.settings.cyclesBeforeLongBreak) + 1,
    }));
  }, []);

  const pause = useCallback(() => {
    setState((s) => {
      if (s.phase === 'idle' || s.paused) return s;
      return { ...s, paused: true, remainingWhenPaused: computeRemaining(s) };
    });
  }, []);

  const resume = useCallback(() => {
    SoundFX.play('focus');
    setState((s) => {
      if (!s.paused) return s;
      return {
        ...s,
        paused: false,
        endAt: Date.now() + s.remainingWhenPaused * 1000,
        remainingWhenPaused: 0,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, phase: 'idle', endAt: 0, paused: false, remainingWhenPaused: 0 }));
  }, []);

  return {
    phase: state.phase,
    remaining,
    paused: state.paused,
    cycleIndex: state.cycleIndex,
    cyclesBeforeLongBreak: state.settings.cyclesBeforeLongBreak,
    focusMin: state.settings.focusMin,
    startFocus,
    pause,
    resume,
    reset,
  };
}
