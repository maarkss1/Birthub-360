import React, { useEffect, useState } from 'react';
import { Loader2, XCircle, Sparkles, Cpu } from 'lucide-react';

interface ExecutionBeamProps {
  isBusy: boolean;
  statusText?: string;
  onCancel?: () => void;
  model: string;
}

export const ExecutionBeam: React.FC<ExecutionBeamProps> = ({
  isBusy,
  statusText,
  onCancel,
  model
}) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isBusy) {
      setSeconds(0);
      timer = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isBusy]);

  if (!isBusy) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
      {/* Quad-Color Laser Gradient Beam animation: Dourado, Rosa, Vermelho, Azul */}
      <div className="h-[3px] w-full bg-slate-900 overflow-hidden relative shadow-lg shadow-pink-500/10">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-pink-500 via-red-500 to-blue-500 animate-pulse w-full h-full opacity-60" />
        <div
          className="absolute h-full w-1/3 bg-gradient-to-r from-amber-300 via-pink-400 via-red-400 to-blue-400 blur-[1px]"
          style={{
            animation: 'laserScan 1.6s infinite ease-in-out'
          }}
        />
      </div>

      {/* Floating Thinking Pill */}
      <div className="flex justify-center mt-2">
        <div className="pointer-events-auto bg-[#0a0e1c]/95 backdrop-blur-md border border-pink-500/30 px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs text-slate-200 ring-1 ring-amber-400/20">
          <Loader2 className="w-3.5 h-3.5 text-pink-400 animate-spin" />
          <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-blue-400 text-[11px] font-mono">
            {model}
          </span>
          <span className="text-slate-600">|</span>
          <span className="truncate max-w-xs text-[11px] text-slate-300">
            {statusText || 'Agente processando...'}
          </span>
          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
            {seconds}s
          </span>

          {onCancel && (
            <button
              onClick={onCancel}
              className="ml-1 text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 text-[11px]"
              title="Cancelar execução"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes laserScan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
};
