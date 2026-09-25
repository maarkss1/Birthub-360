import React from 'react';
import {
  Coins,
  X,
  Zap,
  RotateCcw,
  TrendingUp,
  Cpu,
  DollarSign,
  Activity
} from 'lucide-react';
import { TokenUsageStats } from '../types/agent';

interface TokenStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: TokenUsageStats;
  onResetStats: () => void;
  currentProvider: string;
  currentModel: string;
}

export const TokenStatsModal: React.FC<TokenStatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  onResetStats,
  currentProvider,
  currentModel
}) => {
  if (!isOpen) return null;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const estimatedBrl = (stats.estimatedCostUsd * 5.6).toFixed(4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f141f] border border-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#131a29]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Consumo de Tokens & Custos
              </h2>
              <p className="text-xs text-slate-400">
                Monitor em tempo real de chamadas aos modelos de IA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Stats */}
        <div className="p-5 space-y-4">
          {/* Active Model Indicator */}
          <div className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-teal-400" />
              <span className="text-slate-400">Modelo em uso:</span>
            </div>
            <span className="font-mono font-semibold text-teal-300">
              {currentModel} ({currentProvider})
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-[11px] text-slate-400 block mb-1">Total de Tokens</span>
              <span className="text-xl font-bold font-mono text-slate-100">
                {formatNumber(stats.totalTokens)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">acumulados</span>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-[11px] text-slate-400 block mb-1">Custo Estimado</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                ${stats.estimatedCostUsd < 0.0001 && stats.estimatedCostUsd > 0
                  ? '< $0.0001'
                  : `$${stats.estimatedCostUsd.toFixed(4)}`}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">≈ R$ {estimatedBrl}</span>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-[11px] text-slate-400 block mb-1">Tokens de Entrada (Prompt)</span>
              <span className="text-base font-bold font-mono text-slate-200">
                {formatNumber(stats.promptTokens)}
              </span>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-[11px] text-slate-400 block mb-1">Tokens de Saída (Geração)</span>
              <span className="text-base font-bold font-mono text-slate-200">
                {formatNumber(stats.completionTokens)}
              </span>
            </div>
          </div>

          {/* Calls count */}
          <div className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-800/80 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Total de requisições de API</span>
            </div>
            <span className="font-mono text-slate-200 font-semibold">{stats.callCount} chamadas</span>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed">
            * O custo é estimado com base nas tabelas oficiais de preço por milhão de tokens (ex: Gemini 2.5 Flash, Groq e Ollama com custo local zero). Modelos locais Ollama são 100% gratuitos.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#131a29] flex items-center justify-between">
          <button
            onClick={onResetStats}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Zerar Estatísticas</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
