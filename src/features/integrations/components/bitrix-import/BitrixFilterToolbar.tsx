import {
  ArrowUpDown,
  Building2,
  CalendarDays,
  DollarSign,
  Download,
  Edit3,
  Filter,
  Info,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Tag,
  Users,
  X,
} from 'lucide-react';
import type {
  BitrixDealPipeline,
  BitrixDealStage,
  BitrixDealSummary,
  BitrixFieldOption,
  BitrixLeadSummary,
  BitrixUserOption,
} from './types';
import { filterLabelClass, MONTHS, selectClass } from './types';

export function BitrixFilterToolbar({
  mode,
  setMode,
  total,
  loading,
  onRefresh,
  search,
  setSearch,
  quickFilter,
  setQuickFilter,
  sortBy,
  setSortBy,
  deals,
  leads,
  pipelines,
  stages,
  users,
  fields,
    stageId,
  setStageId,
  assignedById,
  setAssignedById,
  month,
  setMonth,
  year,
  setYear,
  customFieldCode,
  setCustomFieldCode,
  customFieldValue,
  setCustomFieldValue,
  canPickAnyVendor,
  currentYear,
  totalSelectedValue,
  selectedCount,
  onBulkEdit,
  onImportSelected,
  importing,
}: {
  mode: 'deals' | 'leads';
  setMode: (m: 'deals' | 'leads') => void;
  total: number;
  loading: boolean;
  onRefresh: () => void;
  search: string;
  setSearch: (s: string) => void;
  quickFilter: 'all' | 'unimported' | 'has_phone' | 'has_value';
  setQuickFilter: (f: 'all' | 'unimported' | 'has_phone' | 'has_value') => void;
  sortBy: 'recent' | 'value' | 'name';
  setSortBy: (s: 'recent' | 'value' | 'name') => void;
  deals: BitrixDealSummary[];
  leads: BitrixLeadSummary[];
  pipelines: BitrixDealPipeline[];
  stages: BitrixDealStage[];
  users: BitrixUserOption[];
  fields: BitrixFieldOption[];
    stageId: string;
  setStageId: (s: string) => void;
  assignedById: string;
  setAssignedById: (a: string) => void;
  month: string;
  setMonth: (m: string) => void;
  year: string;
  setYear: (y: string) => void;
  customFieldCode: string;
  setCustomFieldCode: (c: string) => void;
  customFieldValue: string;
  setCustomFieldValue: (v: string) => void;
  canPickAnyVendor: boolean;
  currentYear: number;
  totalSelectedValue: number;
  selectedCount: number;
  onBulkEdit: () => void;
  onImportSelected: () => void;
  importing: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Header com Indicador de Saúde do Portal Bitrix */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-brand/10 via-brand-2/5 to-transparent p-5 rounded-3xl border border-brand/20 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center text-on-brand shadow-lg shadow-brand/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              Importador Inteligente Bitrix24
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Conexão Segura & Ativa
              </span>
            </h3>
            <p className="text-xs text-ink-2">
              Filtre por vendedor, etapa e oportunidade. Importe com 1 clique.{' '}
              {total > 0 && (
                <strong className="text-ink font-bold">{total} registro(s) no portal.</strong>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-ink-2 hover:text-ink bg-surface border border-line rounded-2xl shadow-sm hover:shadow transition-colors disabled:opacity-50"
            title="Recarregar dados do Bitrix24"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Portal
          </button>
        </div>
      </div>

      {/* Alternador de Modo: Negócios x Leads + Indicadores de Valor */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1.5 p-1.5 bg-surface-2 rounded-2xl border border-line w-fit">
          <button
            type="button"
            onClick={() => setMode('deals')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-colors ${mode === 'deals' ? 'bg-gradient-to-r from-brand-active to-brand-2 text-on-brand shadow-md shadow-brand-active/30' : 'text-ink-2 hover:text-ink'}`}
          >
            <Building2 className="w-4 h-4" />
            Negócios (Comercial)
          </button>
          <button
            type="button"
            onClick={() => setMode('leads')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-colors ${mode === 'leads' ? 'bg-gradient-to-r from-brand-active to-brand-2 text-on-brand shadow-md shadow-brand-active/30' : 'text-ink-2 hover:text-ink'}`}
          >
            <Users className="w-4 h-4" />
            Leads (Todos)
          </button>
        </div>

        {/* Métricas dos Selecionados */}
        <div className="flex items-center gap-3">
          {mode === 'deals' && totalSelectedValue > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs font-bold">
              <DollarSign className="w-4 h-4" />
              Total Selecionado: R$ {totalSelectedValue.toLocaleString('pt-BR')}
            </div>
          )}

          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onBulkEdit()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-2 hover:bg-line text-ink text-xs font-bold rounded-xl transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar em Lote ({selectedCount})
              </button>
              <button
                type="button"
                onClick={onImportSelected}
                disabled={importing}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-active to-brand-2 hover:brightness-110 text-on-brand text-xs font-bold rounded-xl shadow-md shadow-brand-active/20 transition-colors disabled:opacity-50"
              >
                {importing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {importing ? 'Importando...' : `Importar Selecionados (${selectedCount})`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Painel Avançado de Filtros e Busca */}
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                mode === 'deals'
                  ? 'Buscar por empresa, oportunidade ou negócio...'
                  : 'Buscar por nome do lead, empresa, e-mail...'
              }
              className="w-full h-10 text-sm rounded-2xl border border-line bg-surface-2 text-ink pl-10 pr-9 placeholder:text-ink-2 focus:bg-surface focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink p-1"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros Rápidos (Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${quickFilter === 'all' ? 'bg-ink text-surface shadow-sm' : 'bg-surface-2 text-ink-2 hover:text-ink'}`}
            >
              Todos ({mode === 'deals' ? deals.length : leads.length})
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter('unimported')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${quickFilter === 'unimported' ? 'bg-brand-active text-on-brand shadow-sm shadow-brand-active/20' : 'bg-surface-2 text-ink-2 hover:text-ink'}`}
            >
              Disponíveis para Importar
            </button>
            {mode === 'deals' && (
              <button
                type="button"
                onClick={() => setQuickFilter('has_value')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${quickFilter === 'has_value' ? 'bg-green-600 text-white shadow-sm shadow-green-600/20' : 'bg-surface-2 text-ink-2 hover:text-ink'}`}
              >
                Com Valor (R$)
              </button>
            )}
            {mode === 'leads' && (
              <button
                type="button"
                onClick={() => setQuickFilter('has_phone')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${quickFilter === 'has_phone' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' : 'bg-surface-2 text-ink-2 hover:text-ink'}`}
              >
                Com Telefone
              </button>
            )}
          </div>
        </div>

        {mode === 'deals' &&
          (pipelines.length === 0 ? (
            <p className="text-xs text-ink-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Este portal não tem um pipeline &quot;Comercial&quot; — as vendas dele provavelmente
              ficam na aba Leads, não em Negócios.
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-line">
              <div className="flex flex-col gap-1">
                <span className={filterLabelClass}>
                  <Filter className="w-3 h-3" /> Pipeline
                </span>
                <span className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-soft border border-brand/20 text-brand-ink dark:text-brand text-sm font-bold whitespace-nowrap">
                  {pipelines[0].name}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="bitrix-filter-stage" className={filterLabelClass}>
                  <Tag className="w-3 h-3" /> Etapa
                </label>
                <select
                  id="bitrix-filter-stage"
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Todas as etapas</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="bitrix-filter-vendor" className={filterLabelClass}>
                  {canPickAnyVendor ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />}{' '}
                  Vendedor
                </label>
                {canPickAnyVendor ? (
                  <select
                    id="bitrix-filter-vendor"
                    value={assignedById}
                    onChange={(e) => setAssignedById(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Todos os vendedores</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    id="bitrix-filter-vendor"
                    className="flex items-center h-9 px-3 rounded-xl bg-surface-2 text-ink-2 text-sm font-medium"
                    title="Você só vê e importa o seu próprio dado do Bitrix24 (Trava de Isolamento por Vendedor)."
                  >
                    Exclusivo do Seu Usuário
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="bitrix-filter-month" className={filterLabelClass}>
                  <CalendarDays className="w-3 h-3" /> Mês
                </label>
                <select
                  id="bitrix-filter-month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className={`${selectClass} min-w-[7rem]`}
                >
                  <option value="">Todos</option>
                  {MONTHS.map((m: string, i: number) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="bitrix-filter-year" className={filterLabelClass}>
                  Ano
                </label>
                <select
                  id="bitrix-filter-year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className={`${selectClass} min-w-[5rem]`}
                >
                  <option value="">Todos</option>
                  {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 ml-auto">
                <label htmlFor="bitrix-filter-sort" className={filterLabelClass}>
                  <ArrowUpDown className="w-3 h-3" /> Ordenar Por
                </label>
                <select
                  id="bitrix-filter-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'value' | 'name')}
                  className={selectClass}
                >
                  <option value="recent">Mais Recentes</option>
                  <option value="value">Maior Valor (R$)</option>
                  <option value="name">Nome (A-Z)</option>
                </select>
              </div>
            </div>
          ))}

        {fields.length > 0 && (
          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-line">
            <div className="flex flex-col gap-1">
              <label htmlFor="bitrix-import-custom-field" className={filterLabelClass}>
                <SlidersHorizontal className="w-3 h-3" /> Campo personalizado
              </label>
              <select
                id="bitrix-import-custom-field"
                value={customFieldCode}
                onChange={(e) => setCustomFieldCode(e.target.value)}
                className={`${selectClass} min-w-[13rem]`}
              >
                <option value="">Nenhum (não filtrar)</option>
                {fields.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            {customFieldCode && (
              <div className="flex flex-col gap-1">
                <label htmlFor="bitrix-import-custom-field-value" className={filterLabelClass}>
                  Valor exato a filtrar
                </label>
                <input
                  id="bitrix-import-custom-field-value"
                  type="text"
                  value={customFieldValue}
                  onChange={(e) => setCustomFieldValue(e.target.value)}
                  placeholder="Ex: Transportadora"
                  className="h-9 text-sm rounded-xl border border-line bg-surface-2 text-ink px-3 min-w-[11rem] placeholder:text-ink-2 focus:bg-surface focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
