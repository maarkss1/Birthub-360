import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import type { ThemeMode } from '../types.js';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface ComboboxOption {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  group?: string;
  icon?: React.ReactNode;
}

interface SearchComboboxProps {
  label?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  icon?: React.ReactNode;
  allowCustomInput?: boolean;
  theme?: ThemeMode;
  className?: string;
  // Modo múltipla escolha: quando true, ignora value/onChange em favor de
  // values/onChangeMultiple e mantém o dropdown aberto entre seleções.
  multiple?: boolean;
  values?: string[];
  onChangeMultiple?: (values: string[]) => void;
}

export const SearchCombobox: React.FC<SearchComboboxProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção...',
  searchPlaceholder = 'Buscar opção...',
  icon,
  allowCustomInput = false,
  theme = 'dark',
  className = '',
  multiple = false,
  values = [],
  onChangeMultiple
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const selectedOption = options.find(opt => opt.id === value);
  const selectedMultipleLabels = multiple
    ? options.filter(opt => values.includes(opt.id)).map(opt => opt.label)
    : [];
  const displayLabel = multiple
    ? (selectedMultipleLabels.length === 0
        ? placeholder
        : selectedMultipleLabels.length === 1
          ? selectedMultipleLabels[0]
          : `${selectedMultipleLabels.length} cargos selecionados`)
    : (selectedOption ? selectedOption.label : (value || placeholder));

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

  const filteredOptions = options.filter(opt => {
    const term = searchTerm.toLowerCase();
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.description && opt.description.toLowerCase().includes(term)) ||
      (opt.badge && opt.badge.toLowerCase().includes(term)) ||
      (opt.group && opt.group.toLowerCase().includes(term))
    );
  });

  // Group options if group property exists
  const groupedOptions: { [group: string]: ComboboxOption[] } = {};
  filteredOptions.forEach(opt => {
    const groupName = opt.group || 'Opções Principais';
    if (!groupedOptions[groupName]) {
      groupedOptions[groupName] = [];
    }
    groupedOptions[groupName].push(opt);
  });

  const handleSelect = (id: string) => {
    if (multiple) {
      const next = values.includes(id) ? values.filter(v => v !== id) : [...values, id];
      onChangeMultiple?.(next);
      // Mantém o dropdown aberto para permitir marcar mais de um cargo em seguida.
      return;
    }
    onChange(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomSubmit = () => {
    if (searchTerm.trim()) {
      onChange(searchTerm.trim());
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className={`relative space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className={`block text-xs font-semibold uppercase tracking-wider ${
          isDark ? 'text-slate-300' : 'text-slate-700'
        }`}>
          {label}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition flex items-center justify-between gap-2 shadow-sm ${
          isDark 
            ? 'bg-slate-900/90 border-slate-700/80 hover:border-[var(--brand-primary)]/60 text-slate-200 focus:ring-2 focus:ring-[var(--brand-primary)]/30' 
            : 'bg-white border-slate-300 hover:border-[var(--brand-primary)]/60 text-slate-800 focus:ring-2 focus:ring-[var(--brand-primary)]/30'
        } ${isOpen ? 'ring-2 ring-[var(--brand-primary)]/40 border-[var(--brand-primary)]' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-[var(--brand-primary)] shrink-0">{icon}</span>}
          <span className={`truncate ${!selectedOption && !value ? 'text-slate-400 font-normal' : 'font-semibold'}`}>
            {displayLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedOption?.badge && (
            <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 font-semibold">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--brand-primary)]' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-150 ${
          isDark 
            ? 'bg-slate-900 border-slate-700 text-slate-200 shadow-black/80' 
            : 'bg-white border-slate-300 text-slate-800 shadow-slate-300/60'
        }`}>
          {/* Search bar inside dropdown */}
          <div className={`p-2 border-b flex items-center gap-2 ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
          }`}>
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && allowCustomInput) {
                  e.preventDefault();
                  handleCustomSubmit();
                }
              }}
              placeholder={searchPlaceholder}
              autoFocus
              className={`w-full bg-transparent text-xs outline-none ${
                isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-200 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto p-1.5 space-y-2 flex-1">
            {Object.keys(groupedOptions).length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 space-y-2">
                <p>Nenhuma opção encontrada para "{searchTerm}".</p>
                {allowCustomInput && searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={handleCustomSubmit}
                    className="px-3 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-bold hover:bg-[#e04a12] transition"
                  >
                    Usar "{searchTerm}" como valor
                  </button>
                )}
              </div>
            ) : (
              Object.entries(groupedOptions).map(([groupName, groupOpts]) => (
                <div key={groupName} className="space-y-1">
                  {Object.keys(groupedOptions).length > 1 && (
                    <div className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded font-mono ${
                      isDark ? 'text-slate-400 bg-slate-950/50' : 'text-slate-500 bg-slate-100'
                    }`}>
                      {groupName}
                    </div>
                  )}

                  {groupOpts.map(opt => {
                    const isSelected = multiple ? values.includes(opt.id) : (opt.id === value || opt.label === value);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelect(opt.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? isDark 
                              ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] font-bold border border-[var(--brand-primary)]/40' 
                              : 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold border border-[var(--brand-primary)]/30'
                            : isDark
                              ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                              : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                            <span className="truncate">{opt.label}</span>
                          </div>
                          {opt.description && (
                            <span className={`text-[10px] line-clamp-1 mt-0.5 ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              {opt.description}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {opt.badge && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {opt.badge}
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {multiple && (
            <div className={`flex items-center justify-between px-2.5 py-2 border-t text-[11px] ${
              isDark ? 'border-slate-800 bg-slate-950/70 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}>
              <span>{values.length} {values.length === 1 ? 'cargo selecionado' : 'cargos selecionados'}</span>
              <div className="flex items-center gap-3">
                {values.length > 0 && (
                  <button type="button" onClick={() => onChangeMultiple?.([])} className="font-semibold hover:underline">
                    Limpar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); setSearchTerm(''); }}
                  className="font-semibold text-[var(--brand-primary)] hover:underline"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
