import React, { useState, useRef, useEffect } from 'react';
import { Lead, ThemeMode } from '../types.js';
import { calculateLeadQuality } from '../utils/leadQuality.js';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Check, 
  X, 
  Info, 
  Sparkles, 
  UserCheck, 
  Mail, 
  // Linkedin removed
  Phone, 
  Globe, 
  Briefcase 
} from 'lucide-react';
import { LinkedinIcon as Linkedin } from '../../../../components/ui/icons/LinkedinIcon.js';

interface LeadQualityBadgeProps {
  lead: Lead;
  theme?: ThemeMode;
  showDetailsPopover?: boolean;
}

export const LeadQualityBadge: React.FC<LeadQualityBadgeProps> = ({
  lead,
  theme = 'dark',
  showDetailsPopover = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';
  const metric = calculateLeadQuality(lead);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const badgeStyles = {
    green: {
      bg: isDark ? 'bg-emerald-500/15' : 'bg-emerald-50',
      border: isDark ? 'border-emerald-500/40' : 'border-emerald-300',
      text: isDark ? 'text-emerald-400' : 'text-emerald-700',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
      dot: 'bg-emerald-400'
    },
    yellow: {
      bg: isDark ? 'bg-amber-500/15' : 'bg-amber-50',
      border: isDark ? 'border-amber-500/40' : 'border-amber-300',
      text: isDark ? 'text-amber-400' : 'text-amber-700',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      dot: 'bg-amber-400'
    },
    red: {
      bg: isDark ? 'bg-rose-500/15' : 'bg-rose-50',
      border: isDark ? 'border-rose-500/40' : 'border-rose-300',
      text: isDark ? 'text-rose-400' : 'text-rose-700',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
      dot: 'bg-rose-400'
    }
  }[metric.tier];

  const checklistItems = [
    {
      label: 'Decisor Nomeado (Apollo.io)',
      valid: metric.hasDecisionMaker,
      detail: lead.decision_maker_name || 'Não identificado',
      icon: <UserCheck className="w-3.5 h-3.5" />
    },
    {
      label: 'Cargo Executivo / C-Level',
      valid: metric.hasTitle,
      detail: lead.decision_maker_title || 'Não informado',
      icon: <Briefcase className="w-3.5 h-3.5" />
    },
    {
      label: 'E-mail Corporativo Direto',
      valid: metric.hasEmail,
      detail: lead.decision_maker_email || 'Não revelado',
      icon: <Mail className="w-3.5 h-3.5" />
    },
    {
      label: 'Perfil LinkedIn Corporativo',
      valid: metric.hasLinkedin,
      detail: lead.decision_maker_linkedin ? 'Link disponível' : 'Sem perfil direto',
      icon: <Linkedin className="w-3.5 h-3.5" />
    },
    {
      label: 'Telefone Corporativo / Fone',
      valid: metric.hasPhone,
      detail: lead.phone || 'Sem telefone',
      icon: <Phone className="w-3.5 h-3.5" />
    },
    {
      label: 'Website & Domínio Corporativo',
      valid: metric.hasWebsite,
      detail: lead.website || lead.domain || 'Sem domínio',
      icon: <Globe className="w-3.5 h-3.5" />
    }
  ];

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => showDetailsPopover && setIsOpen(!isOpen)}
        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
          badgeStyles.bg
        } ${badgeStyles.border} ${badgeStyles.text} ${
          showDetailsPopover ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'
        }`}
        title="Clique para ver o relatório de completude do lead"
      >
        <span className={`w-2 h-2 rounded-full ${badgeStyles.dot} animate-pulse`} />
        {badgeStyles.icon}
        <span className="font-bold">{metric.score}%</span>
        <span className="hidden sm:inline font-medium">({metric.tierLabel.split(' ')[0]})</span>
        {showDetailsPopover && <Info className="w-3 h-3 opacity-60 ml-0.5" />}
      </button>

      {/* Popover Detalhado de Qualidade */}
      {isOpen && showDetailsPopover && (
        <div className={`absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border shadow-2xl p-4 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150 ${
          isDark 
            ? 'bg-slate-900 border-slate-700 text-slate-200 shadow-black/80' 
            : 'bg-white border-slate-300 text-slate-800 shadow-slate-300/80'
        }`}>
          {/* Popover Header */}
          <div className="flex items-center justify-between border-b pb-2.5 border-slate-700/50">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Qualidade do Lead (Apollo.io)</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              badgeStyles.bg
            } ${badgeStyles.text} ${badgeStyles.border} border`}>
              Score: {metric.score}/100
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-medium text-slate-400">
              <span>Nível de Completude</span>
              <span className="font-bold text-white">{metric.completionCount} de {metric.totalFields} critérios</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  metric.tier === 'green' ? 'bg-emerald-500' : metric.tier === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${metric.score}%` }}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-1.5 pt-1">
            {checklistItems.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-1.5 rounded-lg border flex items-center justify-between gap-2 text-[11px] ${
                  item.valid 
                    ? isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={item.valid ? 'text-emerald-400' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span className="truncate font-medium">{item.label}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.valid ? (
                    <span className="flex items-center gap-0.5 text-emerald-400 font-semibold font-mono text-[10px]">
                      <Check className="w-3 h-3" /> OK
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-rose-400 font-semibold font-mono text-[10px]">
                      <X className="w-3 h-3" /> Ausente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tips for Conversion */}
          <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-800/60">
            💡 <strong className="text-slate-300">Dica Atlas:</strong> Leads com pontuação verde possuem decisores validados para abordagem multicanal direta com taxa de conversão superior.
          </p>
        </div>
      )}
    </div>
  );
};
