/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type ExperienceMode = 'STANDARD' | 'IMMERSIVE' | 'REDUCED_MOTION';

interface ExperienceModeContextType {
  mode: ExperienceMode;
  setMode: (mode: ExperienceMode) => void;
  isImmersive: boolean;
  isReducedMotion: boolean;
  isStandard: boolean;
}

const STORAGE_KEY = 'atlas_experience_mode';

const ExperienceModeContext = createContext<ExperienceModeContextType | undefined>(undefined);

export function ExperienceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ExperienceMode>(() => {
    if (typeof window === 'undefined') return 'STANDARD';
    const saved = localStorage.getItem(STORAGE_KEY) as ExperienceMode | null;
    if (saved === 'STANDARD' || saved === 'IMMERSIVE' || saved === 'REDUCED_MOTION') {
      return saved;
    }
    // Auto-detect prefers-reduced-motion
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return 'REDUCED_MOTION';
    }
    return 'STANDARD';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore storage write errors
    }

    const root = document.documentElement;
    root.setAttribute('data-experience-mode', mode.toLowerCase());
  }, [mode]);

  const setMode = (newMode: ExperienceMode) => {
    setModeState(newMode);
  };

  const isImmersive = mode === 'IMMERSIVE';
  const isReducedMotion = mode === 'REDUCED_MOTION';
  const isStandard = mode === 'STANDARD';

  return (
    <ExperienceModeContext.Provider
      value={{
        mode,
        setMode,
        isImmersive,
        isReducedMotion,
        isStandard,
      }}
    >
      {children}
    </ExperienceModeContext.Provider>
  );
}

export function useExperienceMode() {
  const context = useContext(ExperienceModeContext);
  if (!context) {
    throw new Error('useExperienceMode must be used within an ExperienceModeProvider');
  }
  return context;
}
