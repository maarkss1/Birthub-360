import React, { useState, useEffect, useMemo } from 'react';
import { Lead, AIConfig, ThemeMode, IntegrationsConfig, LeadStage, User, ProspectFilters, ProspectRunMeta } from '../types';
import { LeadCard } from './LeadCard';
import { resolveBitrixWebhook } from '../utils/bitrix';
import { SearchCombobox } from './SearchCombobox';
import { MetricsChart } from './MetricsChart';
import { ProspectRunSummary } from './ProspectRunSummary';
import { SEARCH_SCHEMA_CONFIG } from '../utils/searchOptions';
import { 
  Search, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  Flame, 
  FileCode, 
  FileSpreadsheet, 
  Send, 
  Check,
  Building2,
  MapPin,
  Truck,
  UserCheck,
  Users,
  DollarSign,
  Square,
  RefreshCw,
  SlidersHorizontal,
  Briefcase
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProspectorTabProps {
  user: User;
  query: string;
  setQuery: (q: string) => void;
  limit: number;
  setLimit: (l: number) => void;
  pitch: string;
  aiConfig: AIConfig;
  googleApiKey: string;
  apolloApiKey: string;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  isSearching: boolean;
  onStartSearch: () => Promise<void>;
  onStopSearch?: () => void;
  statusMessage: string;
  progressPercent: number;
  onUpdateMessage?: (messageId: string, content: string, status: string) => void;
  onUpdateStage?: (leadId: string, stage: LeadStage) => void;
  onUpdateTags?: (leadId: string, tags: string[]) => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  theme?: ThemeMode;
  integrationsConfig?: IntegrationsConfig;
  // Wave 1 (CPI) - Search Intent: reporta os filtros estruturados (não a string
  // composta) para o componente pai enviar individualmente ao backend.
  onFiltersChange?: (filters: ProspectFilters) => void;
  // Wave 7 + Wave 10 (CPI) - Progressive Search & Observabilidade: funil real,
  // motivo de parada, Search-ID e o aviso explícito de que a lista não está
  // ranqueada por adequação - vem da última resposta de /api/prospect (null
  // antes da primeira busca desta sessão).
  runMeta?: ProspectRunMeta | null;
}

export const ProspectorTab: React.FC<ProspectorTabProps> = ({
  user,
  query,
  setQuery,
  limit,
  setLimit,
  pitch,
  aiConfig,
  googleApiKey,
  apolloApiKey,
  leads,
  setLeads,
  isSearching,
  onStartSearch,
  onStopSearch,
  statusMessage,
  progressPercent,
  onUpdateMessage,
  onUpdateStage,
  onUpdateTags,
  onExportJSON,
  onExportCSV,
  theme = 'dark',
  integrationsConfig,
  onFiltersChange,
  runMeta = null
}) => {
  // Dropdown & Combobox States for the 7 requested fields
  const [selectedSegment, setSelectedSegment] = useState<string>('transp_geral');
  const [customSegmentText, setCustomSegmentText] = useState<string>('');
  
  const [selectedState, setSelectedState] = useState<string>('SP');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [ibgeCities, setIbgeCities] = useState<{id: string, label: string, description: string}[]>([]);
  const [searchRadius, setSearchRadius] = useState<string>('50'); // in km

  const [selectedCompanyType, setSelectedCompanyType] = useState<string>('tipo_frota_propria');
  const [selectedEmployeeCount, setSelectedEmployeeCount] = useState<string>('func_51_200');
  const [selectedAnnualRevenue, setSelectedAnnualRevenue] = useState<string>('fat_20m_50m');
  const [selectedDecisionMakerRoles, setSelectedDecisionMakerRoles] = useState<string[]>(['diretor_operacoes']);

  // Bulk Export State
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [bulkExportSuccess, setBulkExportSuccess] = useState(false);

  const [usersList, setUsersList] = useState<User[]>([]);

  useEffect(() => {
    // Auth & RBAC (CPI follow-up): GET /api/users agora exige sessão autenticada.
    // Esta aba só é renderizada pós-login, então o cookie de sessão já vai junto
    // (credentials: 'include' torna isso explícito). Se a sessão tiver expirado no
    // meio do uso, a rota devolve 401 (objeto, não array) - Array.isArray evita
    // guardar um erro no lugar da lista e quebrar downstream.
    fetch('/api/users', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUsersList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  const isDark = theme === 'dark';

  // Fetch Cities from IBGE dynamically when state changes
  useEffect(() => {
    if (!selectedState) return;
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios`)
      .then(res => res.json())
      .then(data => {
        const formatted = data.map((c: any) => ({
          id: c.nome,
          label: c.nome,
          description: `Estado de ${selectedState}`
        }));
        setIbgeCities(formatted);
        if (formatted.length > 0) {
           setSelectedCity(formatted[0].id);
        }
      })
      .catch(err => console.error('Erro ao buscar municípios do IBGE:', err));
  }, [selectedState]);

  // Build the combined query string automatically whenever dropdowns change
  useEffect(() => {
    // 1. Segmento
    let segmentLabel = '';
    if (selectedSegment === 'custom') {
      segmentLabel = customSegmentText || 'Transportadora e Logística';
    } else {
      const seg = SEARCH_SCHEMA_CONFIG.segments.find(s => s.id === selectedSegment);
      segmentLabel = seg ? seg.label : 'Transportadora de Cargas';
    }

    // 2. Localização (Cidade + Raio)
    let locationLabel = '';
    if (selectedCity) {
      locationLabel = `em ${selectedCity} - ${selectedState}`;
      if (searchRadius && searchRadius !== '0') {
        locationLabel += ` (Raio de ${searchRadius}km)`;
      }
    } else {
      locationLabel = `no Estado de ${selectedState}`;
    }

    // 3. Tipo de Empresa / Frota
    const typeObj = SEARCH_SCHEMA_CONFIG.companyTypes.find(t => t.id === selectedCompanyType);
    const typeLabel = (typeObj && typeObj.id !== 'todos_tipos') ? `(${typeObj.label})` : '';

    // 4. Porte de Funcionários
    const empObj = SEARCH_SCHEMA_CONFIG.employeeCounts.find(e => e.id === selectedEmployeeCount);
    const empLabel = (empObj && empObj.id !== 'todos_funcionarios') ? `com ${empObj.badge} colaboradores` : '';

    const combined = `${segmentLabel} ${typeLabel} ${locationLabel} ${empLabel}`.replace(/\s+/g, ' ').trim();
    if (combined) {
      setQuery(combined);
    }

    // Wave 1 (CPI) - Search Intent: além da string de exibição acima, reporta os
    // filtros estruturados para serem enviados individualmente ao backend.
    if (onFiltersChange) {
      const typeObjForFilter = SEARCH_SCHEMA_CONFIG.companyTypes.find(t => t.id === selectedCompanyType);
      const empObjForFilter = SEARCH_SCHEMA_CONFIG.employeeCounts.find(e => e.id === selectedEmployeeCount);
      const revObjForFilter = SEARCH_SCHEMA_CONFIG.annualRevenues.find(r => r.id === selectedAnnualRevenue);
      // Vários cargos podem ser marcados ao mesmo tempo: 'decisionMakerRole' vira um
      // rótulo combinado (exibição / avaliação do Requirement Engine) e
      // 'decisionMakerTitles' é a lista real de termos enviada à busca de pessoas do
      // Apollo (união dos queryFragment de cada cargo marcado).
      const dmRoleObjsForFilter = SEARCH_SCHEMA_CONFIG.decisionMakerRoles.filter(d => selectedDecisionMakerRoles.includes(d.id));
      const dmTitles = Array.from(new Set(
        dmRoleObjsForFilter.flatMap(d => d.queryFragment.split(/\s+/)).filter(Boolean)
      ));

      onFiltersChange({
        segment: segmentLabel || undefined,
        region: selectedState || undefined,
        city: selectedCity || undefined,
        radiusKm: searchRadius && searchRadius !== '0' ? Number(searchRadius) : undefined,
        companyType: typeObjForFilter && typeObjForFilter.id !== 'todos_tipos' ? typeObjForFilter.label : undefined,
        employeeCount: empObjForFilter && empObjForFilter.id !== 'todos_funcionarios' ? empObjForFilter.badge : undefined,
        annualRevenue: revObjForFilter && revObjForFilter.id !== 'todos_faturamentos' ? revObjForFilter.label : undefined,
        decisionMakerRole: dmRoleObjsForFilter.length > 0 ? dmRoleObjsForFilter.map(d => d.label).join(' / ') : undefined,
        decisionMakerTitles: dmTitles.length > 0 ? dmTitles : undefined
      });
    }
  }, [
    selectedSegment,
    customSegmentText,
    selectedState,
    selectedCity,
    searchRadius,
    selectedCompanyType,
    selectedEmployeeCount,
    selectedAnnualRevenue,
    selectedDecisionMakerRoles,
    setQuery,
    onFiltersChange
  ]);

  // When State changes, reset City
  const handleStateChange = (newUf: string) => {
    setSelectedState(newUf);
    setSelectedCity('');
  };

  const handleBulkExportBitrix = async () => {
    if (leads.length === 0 || isBulkExporting) return;
    setIsBulkExporting(true);
    setBulkExportSuccess(false);

    try {
      const webhookUrl = resolveBitrixWebhook(user, integrationsConfig);

      for (const lead of leads) {
        await fetch('/api/integrations/bitrix24/send-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead,
            webhookUrl,
            title: `[Atlas Outbound] ${lead.name} (${lead.decision_maker_name || 'Decisor'})`
          })
        });
      }

      setBulkExportSuccess(true);
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      setTimeout(() => setBulkExportSuccess(false), 4000);
    } catch (err) {
      console.error('Erro na exportação em lote:', err);
    } finally {
      setIsBulkExporting(false);
    }
  };

  // Combobox Options Maps
  const segmentComboboxOptions = SEARCH_SCHEMA_CONFIG.segments.map(s => ({
    id: s.id,
    label: s.label,
    description: s.description,
    badge: s.badge
  }));

  const companyTypeComboboxOptions = SEARCH_SCHEMA_CONFIG.companyTypes.map(t => ({
    id: t.id,
    label: t.label,
    description: t.description,
    badge: t.badge
  }));

  const employeeCountComboboxOptions = SEARCH_SCHEMA_CONFIG.employeeCounts.map(e => ({
    id: e.id,
    label: e.label,
    description: e.description,
    badge: e.badge
  }));

  const annualRevenueComboboxOptions = SEARCH_SCHEMA_CONFIG.annualRevenues.map(r => ({
    id: r.id,
    label: r.label,
    description: r.description,
    badge: r.badge
  }));

  const decisionMakerRoleComboboxOptions = SEARCH_SCHEMA_CONFIG.decisionMakerRoles.map(d => ({
    id: d.id,
    label: d.label,
    description: d.description,
    badge: d.badge
  }));

  // Handle single lead update from child card
  const handleLeadSaved = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  return (
    <div className="space-y-6">
      <MetricsChart leads={leads} isDark={isDark} />
      {/* 1. Main Search & Structured Form Panel */}
      <div className={`border rounded-2xl p-5 md:p-6 shadow-xl space-y-5 transition duration-200 ${
        isDark 
          ? 'bg-slate-900 border-slate-800 text-slate-200' 
          : 'bg-white border-slate-200 shadow-slate-100 text-slate-800'
      }`}>
        {/* Panel Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div>
            <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Painel de Busca Estruturada & Filtros Suspensos</span>
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Configure os 7 parâmetros detalhados para prospecção de alta precisão no setor logístico e corporativo.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2.5 py-1 rounded-full border font-mono ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-slate-300' 
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              Motor: <strong className="text-[var(--brand-primary)]">{aiConfig.provider.toUpperCase()}</strong> ({aiConfig.provider === 'ollama' ? aiConfig.ollamaModel : aiConfig.groqModel})
            </span>
          </div>
        </div>

        {/* Structured 7-Field Form Grid */}
        <div className="space-y-4">
          {/* Row 1: Segmento, Região (Estado), Cidade, Raio */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Field 1: Segmento */}
            <div className="md:col-span-4">
              <SearchCombobox
                label="1. Segmento de Empresa"
                options={segmentComboboxOptions}
                value={selectedSegment}
                onChange={(val) => {
                  setSelectedSegment(val);
                  if (val !== 'custom') setCustomSegmentText('');
                }}
                placeholder="Selecione o segmento..."
                searchPlaceholder="Buscar segmento (ex: Carga Geral, Frigorífico)..."
                icon={<Building2 className="w-3.5 h-3.5" />}
                allowCustomInput={true}
                theme={theme}
              />
              {selectedSegment === 'custom' && (
                <input
                  type="text"
                  value={customSegmentText}
                  onChange={(e) => setCustomSegmentText(e.target.value)}
                  placeholder="Ex: Transportadoras de Medicamentos"
                  className={`w-full border rounded-xl px-3 py-2 text-xs outline-none transition mt-2 ${
                    isDark 
                      ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[var(--brand-primary)]' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[var(--brand-primary)]'
                  }`}
                />
              )}
            </div>

            {/* Field 2: Região / Estado */}
            <div className="md:col-span-2 space-y-1.5">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                2. Estado (UF)
              </label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-xs font-semibold outline-none transition ${
                  isDark 
                    ? 'bg-slate-900 border-slate-700/80 text-slate-100 focus:border-[var(--brand-primary)]' 
                    : 'bg-white border-slate-300 text-slate-900 focus:border-[var(--brand-primary)]'
                }`}
              >
                {SEARCH_SCHEMA_CONFIG.regions.map((st) => (
                  <option key={st.stateUf} value={st.stateUf}>
                    {st.stateName} ({st.stateUf})
                  </option>
                ))}
              </select>
            </div>

            {/* Field 3: Cidade */}
            <div className="md:col-span-4">
              <SearchCombobox
                label="3. Cidade"
                options={ibgeCities}
                value={selectedCity}
                onChange={setSelectedCity}
                placeholder="Selecione a cidade..."
                searchPlaceholder="Buscar cidade..."
                icon={<MapPin className="w-3.5 h-3.5" />}
                allowCustomInput={true}
                theme={theme}
              />
            </div>

            {/* Raio de Busca */}
            <div className="md:col-span-2 space-y-1.5">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Raio (km)
              </label>
              <select
                value={searchRadius}
                onChange={(e) => setSearchRadius(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-xs font-semibold outline-none transition ${
                  isDark 
                    ? 'bg-slate-900 border-slate-700/80 text-slate-100 focus:border-[var(--brand-primary)]' 
                    : 'bg-white border-slate-300 text-slate-900 focus:border-[var(--brand-primary)]'
                }`}
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
                <option value="200">200 km</option>
                <option value="0">Sem limite</option>
              </select>
            </div>
          </div>

          {/* Row 2: Tipo de Empresa, Número de Funcionários, Faturamento Anual, Decisor */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Field 4: Tipo */}
            <div>
              <SearchCombobox
                label="4. Tipo de Empresa / Frota"
                options={companyTypeComboboxOptions}
                value={selectedCompanyType}
                onChange={setSelectedCompanyType}
                placeholder="Selecione o tipo..."
                searchPlaceholder="Buscar tipo de empresa..."
                icon={<Truck className="w-3.5 h-3.5" />}
                theme={theme}
              />
            </div>

            {/* Field 5: Número de Funcionários */}
            <div>
              <SearchCombobox
                label="5. Número de Funcionários"
                options={employeeCountComboboxOptions}
                value={selectedEmployeeCount}
                onChange={setSelectedEmployeeCount}
                placeholder="Selecione o porte..."
                searchPlaceholder="Buscar número de funcionários..."
                icon={<Users className="w-3.5 h-3.5" />}
                theme={theme}
              />
            </div>

            {/* Field 6: Faturamento Anual */}
            <div>
              <SearchCombobox
                label="6. Faturamento Anual"
                options={annualRevenueComboboxOptions}
                value={selectedAnnualRevenue}
                onChange={setSelectedAnnualRevenue}
                placeholder="Selecione a faixa de receita..."
                searchPlaceholder="Buscar faixa de faturamento..."
                icon={<DollarSign className="w-3.5 h-3.5" />}
                theme={theme}
              />
            </div>

            {/* Field 7: Decisor */}
            <div>
              <SearchCombobox
                label="7. Decisor Alvo (Apollo.io)"
                options={decisionMakerRoleComboboxOptions}
                value=""
                onChange={() => {}}
                multiple
                values={selectedDecisionMakerRoles}
                onChangeMultiple={setSelectedDecisionMakerRoles}
                placeholder="Selecione um ou mais cargos alvo..."
                searchPlaceholder="Buscar cargo do decisor..."
                icon={<UserCheck className="w-3.5 h-3.5" />}
                theme={theme}
              />
            </div>
          </div>

          {/* Row 3: Quantidade de Leads */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1">
            <div className="md:col-span-12 space-y-1.5">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Quantidade de Leads a prospectar nesta rodada
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className={`w-full max-w-sm border rounded-xl px-3 py-2.5 text-xs font-bold outline-none transition ${
                  isDark 
                    ? 'bg-slate-900 border-slate-700/80 text-[var(--brand-primary)] focus:border-[var(--brand-primary)]' 
                    : 'bg-white border-slate-300 text-[var(--brand-primary)] focus:border-[var(--brand-primary)]'
                }`}
              >
                <option value={1}>1 Lead (Teste Instantâneo)</option>
                <option value={2}>2 Leads</option>
                <option value={3}>3 Leads (Recomendado)</option>
                <option value={5}>5 Leads (Completo)</option>
                <option value={8}>8 Leads (Lote Amplo)</option>
                <option value={10}>10 Leads (Extração Máxima)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Pipeline em tempo real via IA
              </p>
            </div>
          </div>
        </div>

        {/* Live Query Viewer & Execution Bar with "Prospectar", "Parar" and "Salvar" */}
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
          isDark 
            ? 'bg-slate-950/70 border-slate-800' 
            : 'bg-slate-100/80 border-slate-200'
        }`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-primary)] flex items-center gap-1">
                <Search className="w-3 h-3" />
                Query Estruturada Gerada:
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-200'
              }`}>
                Auto-sincronizada com os seletores
              </span>
            </div>
            <p className={`text-xs sm:text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {query || 'Selecione os parâmetros acima para compor a busca...'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Parar Button (Active during search) */}
            {isSearching && (
              <button
                type="button"
                onClick={onStopSearch}
                className="py-2.5 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 font-bold rounded-xl transition text-xs flex items-center gap-1.5 shadow-sm"
                title="Interromper busca em andamento"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Parar</span>
              </button>
            )}

            {/* Main Prospect Button */}
            <button
              onClick={onStartSearch}
              disabled={isSearching || !query.trim()}
              className="py-2.5 px-6 bg-gradient-to-r from-[var(--brand-primary)] to-[#FF7010] hover:from-[var(--brand-secondary-hover)] hover:to-[var(--brand-secondary)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-lg shadow-[var(--brand-primary)]/25 flex items-center justify-center gap-2 text-sm"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Prospectando...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-amber-200" />
                  <span>Prospectar Leads com IA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Live Pipeline Status Card */}
      {isSearching && (
        <div className={`border rounded-2xl p-5 shadow-xl space-y-3 animate-pulse ${
          isDark 
            ? 'bg-slate-900 border-[var(--brand-primary)]/40' 
            : 'bg-white border-[var(--brand-primary)]/40 shadow-slate-100'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--brand-primary)] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
              {statusMessage || 'Executando pipeline de prospecção e IA...'}
            </span>
            <span className="font-mono text-slate-400 font-bold">{progressPercent}%</span>
          </div>

          <div className={`w-full rounded-full h-2.5 overflow-hidden border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <div
              className="bg-gradient-to-r from-[var(--brand-primary)] via-[#FF8008] to-[#FFC500] h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 pt-1">
            <div className={`p-1.5 rounded flex items-center gap-1.5 ${progressPercent >= 20 ? 'text-emerald-500 font-semibold bg-emerald-500/10' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> 1. Places ({limit} empresas)
            </div>
            <div className={`p-1.5 rounded flex items-center gap-1.5 ${progressPercent >= 40 ? 'text-emerald-500 font-semibold bg-emerald-500/10' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> 2. CNPJ Oficial (Receita/BrasilAPI)
            </div>
            <div className={`p-1.5 rounded flex items-center gap-1.5 ${progressPercent >= 70 ? 'text-emerald-500 font-semibold bg-emerald-500/10' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> 3. Apollo Decisores & E-mails
            </div>
            <div className={`p-1.5 rounded flex items-center gap-1.5 ${progressPercent >= 95 ? 'text-emerald-500 font-semibold bg-emerald-500/10' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> 4. Salvo no SQLite
            </div>
          </div>
        </div>
      )}

      {/* Wave 7 + Wave 10 (CPI) - Progressive Search & Observabilidade: funil real,
          motivo de parada, Search-ID copiável e o aviso de que a lista não está
          ranqueada por adequação ainda - da última busca desta sessão. */}
      {!isSearching && <ProspectRunSummary meta={runMeta} theme={theme} />}

      {/* Results Header when Leads exist */}
      {leads.length > 0 && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${
          isDark 
            ? 'bg-slate-900/60 border-slate-800' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {leads.length} Empresas Mapeadas (Places + CNPJ Oficial + Apollo)
                </h3>
                <p className="text-[11px] text-slate-400">
                  1ª Etapa concluída • Roteiros com IA e Dossiê de Notícias disponíveis sob demanda em cada card
                </p>
              </div>
            </div>
            <span className={`text-xs ml-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              (Persistidos no banco relacional SQLite)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Export to Bitrix24 */}
            <button
              onClick={handleBulkExportBitrix}
              disabled={isBulkExporting}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                bulkExportSuccess
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                  : isDark 
                    ? 'bg-[var(--brand-primary)]/20 hover:bg-[var(--brand-primary)]/30 text-[var(--brand-primary)] border-[var(--brand-primary)]/30' 
                    : 'bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20'
              }`}
              title="Exportar todos os leads encontrados para o Bitrix24"
            >
              {isBulkExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : bulkExportSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Send className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              )}
              <span>{bulkExportSuccess ? 'Todos Exportados!' : 'Exportar Todos Bitrix24'}</span>
            </button>

            <button
              onClick={onExportJSON}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              <span>Exportar JSON</span>
            </button>
            <button
              onClick={onExportCSV}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Feed of Leads */}
      <div className="space-y-6">
      <MetricsChart leads={leads} isDark={isDark} />
        {leads.map((lead, idx) => (
          <LeadCard
            key={lead.id || idx}
            lead={lead}
            index={idx}
            pitch={pitch}
            aiConfig={aiConfig}
            onUpdateMessage={onUpdateMessage}
            onUpdateStage={onUpdateStage}
            onUpdateTags={onUpdateTags}
            onLeadSaved={handleLeadSaved}
            theme={theme}
            integrationsConfig={integrationsConfig}
            usersList={usersList}
            isUserView={user.role === 'user'}
            user={user}
          />
        ))}

        {leads.length === 0 && !isSearching && (
          <div className={`border-2 border-dashed rounded-2xl p-12 text-center space-y-3 ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600 bg-white'
          }`}>
            <div className={`w-14 h-14 rounded-2xl border mx-auto flex items-center justify-center text-[var(--brand-primary)] ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <Search className="w-7 h-7" />
            </div>
            <div>
              <h4 className={`text-base font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                Nenhum lead prospectado ainda
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Selecione os parâmetros nas listas suspensas acima e clique em <strong>"Prospectar Leads com IA"</strong> para extrair as empresas, CNPJs, dados de contato e mapear decisores com copys comerciais prontas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
