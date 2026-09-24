import React from 'react';
import { RecentSearch, ThemeMode } from '../types';
import { 
  X, 
  Search, 
  Clock, 
  Layers, 
  MapPin, 
  Truck, 
  Package, 
  UserCheck, 
  Sparkles, 
  Play, 
  ArrowUpRight, 
  Trash2, 
  Copy, 
  Check, 
  Database
} from 'lucide-react';

interface RecentSearchModalProps {
  search: RecentSearch | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyAndSearch: (search: RecentSearch) => void;
  onApplyToForm: (search: RecentSearch) => void;
  onDeleteSearch: (id: string) => void;
  theme?: ThemeMode;
}

export const RecentSearchModal: React.FC<RecentSearchModalProps> = ({
  search,
  isOpen,
  onClose,
  onApplyAndSearch,
  onApplyToForm,
  onDeleteSearch,
  theme = 'dark'
}) => {
  const [copied, setCopied] = React.useState(false);
  const isDark = theme === 'dark';

  if (!isOpen || !search) return null;

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(search.query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFullDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark 
            ? 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-black/80' 
            : 'bg-white border-slate-300 text-slate-900 shadow-slate-400/40'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/30 flex items-center justify-center text-[var(--brand-primary)]">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>Detalhes da Busca Recente</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 font-semibold">
                  Histórico
                </span>
              </h3>
              <p className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Registrado em {formatFullDate(search.timestamp)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              isDark 
                ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Query Banner */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/70 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                Expressão de Busca (Google Places & Apollo Pipeline)
              </span>
              <button
                onClick={handleCopyQuery}
                className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1 font-mono"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado!' : 'Copiar Expressão'}</span>
              </button>
            </div>
            <p className={`font-mono text-xs leading-relaxed break-words p-2.5 rounded-lg border ${
              isDark ? 'bg-slate-900 border-slate-800 text-amber-300' : 'bg-white border-slate-200 text-amber-800'
            }`}>
              "{search.query}"
            </p>
          </div>

          {/* Structured Parameters Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              Parâmetros Estruturados do Filtro
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Quantidade */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[var(--brand-primary)]" /> Qtd. Leads Solicitados
                </span>
                <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {search.limit} {search.limit === 1 ? 'lead' : 'leads'}
                </span>
              </div>

              {/* Segmento */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-500" /> Segmento
                </span>
                <span className="font-semibold text-right truncate max-w-[170px]" title={search.params?.segment || 'Carga Geral'}>
                  {search.params?.segment || 'Personalizado'}
                </span>
              </div>

              {/* Região / Polo */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500" /> Região / Polo
                </span>
                <span className="font-semibold text-right truncate max-w-[170px]" title={search.params?.region || search.params?.state || 'Brasil'}>
                  {search.params?.region || search.params?.state || 'Brasil / SP'}
                </span>
              </div>

              {/* Porte da Frota */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#008FCE]" /> Porte da Frota
                </span>
                <span className="font-semibold text-right truncate max-w-[170px]">
                  {search.params?.fleetSize || 'Todos os Portes'}
                </span>
              </div>

              {/* Tipo de Carga */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-teal-500" /> Tipo de Carga
                </span>
                <span className="font-semibold text-right truncate max-w-[170px]">
                  {search.params?.cargoType || 'Carga Geral'}
                </span>
              </div>

              {/* Decisor Alvo */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-500" /> Decisor Prioritário
                </span>
                <span className="font-semibold text-right truncate max-w-[170px]">
                  {search.params?.decisionMakerRole || 'Operações / GR'}
                </span>
              </div>

              {/* Tom de Voz */}
              <div className={`p-3 rounded-xl border flex items-center justify-between sm:col-span-2 ${
                isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Tom de Abordagem Copywriting
                </span>
                <span className="font-semibold capitalize text-[var(--brand-primary)]">
                  {search.params?.tone || 'Consultivo & Estratégico'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 sm:px-6 border-t flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={() => {
              onDeleteSearch(search.id);
              onClose();
            }}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-xl transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir do Histórico</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                onApplyToForm(search);
                onClose();
              }}
              className={`text-xs font-semibold px-4 py-2 rounded-xl border transition flex items-center gap-1.5 ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Carregar no Formulário</span>
            </button>

            <button
              onClick={() => {
                onApplyAndSearch(search);
                onClose();
              }}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[#e04a12] text-white shadow-lg shadow-[var(--brand-primary)]/25 transition flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Executar Prospecção Agora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
