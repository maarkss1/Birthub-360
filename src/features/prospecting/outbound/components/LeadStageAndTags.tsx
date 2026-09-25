import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import type { Lead, LeadStage, ThemeMode } from '../types';
import { PREDEFINED_TAGS_SUGGESTIONS } from '../utils/searchOptions';
import { 
  Tag, 
  Plus, 
  X, 
  ChevronDown, 
  Check, 
  Layers, 
  Filter, 
  Flame, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  TrendingUp,
  Sparkles
} from 'lucide-react';

interface LeadStageAndTagsProps {
  lead: Lead;
  theme?: ThemeMode;
  onUpdateStage?: (leadId: string, stage: LeadStage) => void;
  onUpdateTags?: (leadId: string, tags: string[]) => void;
  userId?: string;
}

export const STAGE_CONFIG: {
  [key in LeadStage]: {
    label: string;
    description: string;
    color: string;
    bgDark: string;
    bgLight: string;
    borderDark: string;
    borderLight: string;
    textColor: string;
    icon: React.ReactNode;
  };
} = {
  prospecto: {
    label: 'Prospecto (Novo)',
    description: 'Lead recém-prospectado aguardando primeiro contato.',
    color: 'orange',
    bgDark: 'bg-[#008FCE]/15',
    bgLight: 'bg-slate-100',
    borderDark: 'border-[#008FCE]/40',
    borderLight: 'border-[#93DBF2]',
    textColor: 'text-[#93DBF2]',
    icon: <Clock className="w-3 h-3" />
  },
  qualificado: {
    label: 'Qualificado',
    description: 'Decisor e perfil de frota validados com dados completos.',
    color: 'purple',
    bgDark: 'bg-purple-500/15',
    bgLight: 'bg-purple-50',
    borderDark: 'border-purple-500/40',
    borderLight: 'border-purple-300',
    textColor: 'text-purple-400',
    icon: <Sparkles className="w-3 h-3" />
  },
  contatado: {
    label: 'Contatado',
    description: 'Abordagem disparada por Cold Call, E-mail ou WhatsApp.',
    color: 'orange',
    bgDark: 'bg-[var(--brand-primary)]/15',
    bgLight: 'bg-orange-50',
    borderDark: 'border-[var(--brand-primary)]/40',
    borderLight: 'border-orange-300',
    textColor: 'text-[var(--brand-primary)]',
    icon: <Flame className="w-3 h-3" />
  },
  negociacao: {
    label: 'Em Negociação',
    description: 'Reunião ou proposta técnica Atlas em andamento.',
    color: 'amber',
    bgDark: 'bg-amber-500/15',
    bgLight: 'bg-amber-50',
    borderDark: 'border-amber-500/40',
    borderLight: 'border-amber-300',
    textColor: 'text-amber-400',
    icon: <TrendingUp className="w-3 h-3" />
  },
  ganho: {
    label: 'Fechado / Ganho',
    description: 'Contrato firmado ou lead convertido em cliente.',
    color: 'emerald',
    bgDark: 'bg-emerald-500/15',
    bgLight: 'bg-emerald-50',
    borderDark: 'border-emerald-500/40',
    borderLight: 'border-emerald-300',
    textColor: 'text-emerald-400',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  perdido: {
    label: 'Perdido / Desqualificado',
    description: 'Sem fit ou sem interesse no momento.',
    color: 'slate',
    bgDark: 'bg-slate-800/60',
    bgLight: 'bg-slate-100',
    borderDark: 'border-slate-700',
    borderLight: 'border-slate-300',
    textColor: 'text-slate-400',
    icon: <XCircle className="w-3 h-3" />
  }
};

// Motivo estruturado ao perder um lead — vira relatório por causa de perda em vez de
// texto solto numa nota, que ninguém consegue agregar depois.
export const LOSS_REASONS = [
  'Preço',
  'Sem orçamento',
  'Perdeu para concorrente',
  'Timing / não é o momento',
  'Sem resposta do lead',
  'Outro'
] as const;

// Wave 13 (CPI) - Feedback Loop: contraparte simétrica de LOSS_REASONS para
// quando o lead vai para "ganho" — mesma ideia de motivo estruturado, para
// permitir agregar depois por que os leads convertem.
export const WIN_REASONS = [
  'Preço competitivo',
  'Melhor relacionamento/atendimento',
  'Prazo de entrega',
  'Indicação/confiança na marca',
  'Diferencial técnico/operacional',
  'Outro'
] as const;

export const LeadStageAndTags: React.FC<LeadStageAndTagsProps> = ({
  lead,
  theme = 'dark',
  onUpdateStage,
  onUpdateTags,
  userId
}) => {
  const isDark = theme === 'dark';
  const currentStage: LeadStage = lead.stage || 'prospecto';
  const currentTags: string[] = Array.isArray(lead.tags) ? lead.tags : [];

  const [isStageOpen, setIsStageOpen] = useState(false);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingLossReason, setIsPickingLossReason] = useState(false);
  const [isPickingWinReason, setIsPickingWinReason] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stageRef.current && !stageRef.current.contains(event.target as Node)) {
        setIsStageOpen(false);
        setIsPickingLossReason(false);
        setIsPickingWinReason(false);
      }
      if (tagRef.current && !tagRef.current.contains(event.target as Node)) {
        setIsTagPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStageChange = async (newStage: LeadStage, lossReason?: string, winReason?: string) => {
    setIsStageOpen(false);
    setIsPickingLossReason(false);
    setIsPickingWinReason(false);
    if (newStage === currentStage) return;

    if (onUpdateStage && lead.id) {
      onUpdateStage(lead.id, newStage);
    }

    // Persist to server backend SQLite
    if (lead.id) {
      try {
        setIsSaving(true);
        await fetch(`/api/leads/${lead.id}/stage`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: newStage, userId, lossReason, winReason })
        });
      } catch (err) {
        console.error('Erro ao persistir novo stage:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleStageOptionClick = (stageKey: LeadStage) => {
    if (stageKey === currentStage) {
      setIsStageOpen(false);
      return;
    }
    if (stageKey === 'perdido') {
      // Perdido exige motivo estruturado antes de persistir — troca a lista de
      // estágios pela lista de motivos, sem fechar o dropdown.
      setIsPickingLossReason(true);
      return;
    }
    if (stageKey === 'ganho') {
      // Ganho exige motivo estruturado antes de persistir (Wave 13/CPI) —
      // mesmo padrão de UX que "perdido".
      setIsPickingWinReason(true);
      return;
    }
    handleStageChange(stageKey);
  };

  const handleAddTag = async (tagName: string) => {
    const cleanTag = tagName.trim();
    if (!cleanTag || currentTags.includes(cleanTag)) return;

    const newTags = [...currentTags, cleanTag];
    if (onUpdateTags && lead.id) {
      onUpdateTags(lead.id, newTags);
    }

    if (lead.id) {
      try {
        await fetch(`/api/leads/${lead.id}/tags`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: newTags, userId })
        });
      } catch (err) {
        console.error('Erro ao salvar tags:', err);
      }
    }

    setCustomTagInput('');
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = currentTags.filter(t => t !== tagToRemove);
    if (onUpdateTags && lead.id) {
      onUpdateTags(lead.id, newTags);
    }

    if (lead.id) {
      try {
        await fetch(`/api/leads/${lead.id}/tags`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: newTags, userId })
        });
      } catch (err) {
        console.error('Erro ao remover tag:', err);
      }
    }
  };

  const currentStageConfig = STAGE_CONFIG[currentStage] || STAGE_CONFIG.prospecto;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
      {/* 1. SELETOR DE ESTÁGIO DE FUNIL */}
      <div className="relative" ref={stageRef}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-[var(--brand-primary)]" /> Funil:
          </span>
          <button
            type="button"
            onClick={() => { setIsStageOpen(!isStageOpen); setIsPickingLossReason(false); setIsPickingWinReason(false); }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
              isDark ? currentStageConfig.bgDark : currentStageConfig.bgLight
            } ${
              isDark ? currentStageConfig.borderDark : currentStageConfig.borderLight
            } ${currentStageConfig.textColor} hover:brightness-110`}
          >
            {currentStageConfig.icon}
            <span>{currentStageConfig.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isStageOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dropdown de Estágios */}
        {isStageOpen && (
          <div className={`absolute left-0 top-full mt-1.5 z-40 w-56 rounded-xl border shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-slate-200 shadow-black/80'
              : 'bg-white border-slate-300 text-slate-800 shadow-slate-300/80'
          }`}>
            {isPickingLossReason ? (
              <>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono border-b border-slate-700/40 flex items-center justify-between">
                  <span>Motivo da Perda</span>
                  <button type="button" onClick={() => setIsPickingLossReason(false)} className="hover:text-slate-200">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {LOSS_REASONS.map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => handleStageChange('perdido', reason)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition ${
                      isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </>
            ) : isPickingWinReason ? (
              <>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono border-b border-slate-700/40 flex items-center justify-between">
                  <span>Motivo do Ganho</span>
                  <button type="button" onClick={() => setIsPickingWinReason(false)} className="hover:text-slate-200">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {WIN_REASONS.map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => handleStageChange('ganho', undefined, reason)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition ${
                      isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono border-b border-slate-700/40">
                  Estágio do Lead no Funil
                </div>
                {(Object.keys(STAGE_CONFIG) as LeadStage[]).map(stageKey => {
                  const cfg = STAGE_CONFIG[stageKey];
                  const isSelected = stageKey === currentStage;
                  return (
                    <button
                      key={stageKey}
                      type="button"
                      onClick={() => handleStageOptionClick(stageKey)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? `${isDark ? cfg.bgDark : cfg.bgLight} font-bold ${cfg.textColor} border ${isDark ? cfg.borderDark : cfg.borderLight}`
                          : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cfg.textColor}>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-current shrink-0" />}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. SISTEMA DE TAGS E CATEGORIAS */}
      <div className="flex flex-wrap items-center gap-1.5" ref={tagRef}>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
          <Tag className="w-3 h-3 text-[var(--brand-primary)]" /> Tags:
        </span>

        {/* Existing Tags */}
        {currentTags.map((tag, idx) => (
          <span
            key={idx}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border flex items-center gap-1.5 transition ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700 text-slate-200' 
                : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="text-slate-400 hover:text-red-400 transition-colors p-0.5 rounded"
              title={`Remover tag "${tag}"`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}

        {/* Add Tag Button & Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border border-dashed transition flex items-center gap-1 ${
              isDark 
                ? 'border-slate-700 text-slate-400 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/50 hover:bg-slate-800/60' 
                : 'border-slate-300 text-slate-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/50 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>Tag</span>
          </button>

          {/* Add Tag Popover */}
          {isTagPopoverOpen && (
            <div className={`absolute right-0 sm:left-0 top-full mt-1.5 z-40 w-64 rounded-xl border shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 ${
              isDark 
                ? 'bg-slate-900 border-slate-700 text-slate-200 shadow-black/80' 
                : 'bg-white border-slate-300 text-slate-800 shadow-slate-300/80'
            }`}>
              {/* Header */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1.5 border-slate-700/40">
                <span>Adicionar Tag ao Lead</span>
                <button onClick={() => setIsTagPopoverOpen(false)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Custom Tag Input */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(customTagInput);
                    }
                  }}
                  placeholder="Nova tag personalizada..."
                  autoFocus
                  className={`w-full px-2.5 py-1 text-xs rounded-lg border outline-none ${
                    isDark 
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-[var(--brand-primary)]' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[var(--brand-primary)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(customTagInput)}
                  disabled={!customTagInput.trim()}
                  className="px-2 py-1 bg-[var(--brand-primary)] hover:bg-[#e04a12] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
                >
                  OK
                </button>
              </div>

              {/* Suggested Tags Quick Click */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Sugestões Rápidas:</div>
                <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                  {PREDEFINED_TAGS_SUGGESTIONS.map((tagSuggest, sIdx) => {
                    const isAlreadyAdded = currentTags.includes(tagSuggest);
                    return (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => !isAlreadyAdded && handleAddTag(tagSuggest)}
                        disabled={isAlreadyAdded}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition ${
                          isAlreadyAdded
                            ? 'opacity-40 border-slate-700 line-through cursor-not-allowed'
                            : isDark
                              ? 'bg-slate-800 hover:bg-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)] border-slate-700 text-slate-300'
                              : 'bg-slate-100 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 border-slate-200 text-slate-700'
                        }`}
                      >
                        + {tagSuggest}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
