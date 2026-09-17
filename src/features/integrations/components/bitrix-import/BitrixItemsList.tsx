import {
  Building2,
  CalendarDays,
  Check,
  CheckSquare,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  Square,
  Tag,
  Users,
  Zap,
} from 'lucide-react';
import type { BitrixDealSummary, BitrixLeadSummary, BitrixUserOption } from './types';

export function BitrixItemsList({
  mode,
  loading,
  availableItems,
  allPageSelected,
  toggleAllPage,
  selectAllAvailable,
  selected,
  clearSelection,
  processedDeals,
  processedLeads,
  importingSingleId,
  importing,
  toggle,
  importSingle,
  users,
  start,
  next,
  total,
  onPaginate,
  onBulkEdit,
  onImportSelected,
}: {
  mode: 'deals' | 'leads';
  loading: boolean;
  availableItems: Array<{ id: string }>;
  allPageSelected: boolean;
  toggleAllPage: () => void;
  selectAllAvailable: () => void;
  selected: Set<string>;
  clearSelection: () => void;
  processedDeals: BitrixDealSummary[];
  processedLeads: BitrixLeadSummary[];
  importingSingleId: string | null;
  importing: boolean;
  toggle: (id: string) => void;
  importSingle: (id: string) => void;
  users: BitrixUserOption[];
  start: number;
  next: number | null;
  total: number;
  onPaginate: (from: number) => void;
  onBulkEdit: () => void;
  onImportSelected: () => void;
}) {
  const userName = (id: string | null) =>
    (id && users.find((u) => u.id === id)?.name) || (id ? `Usuário #${id}` : null);

  return (
    <div className="space-y-3">
      {!loading && availableItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-surface-2 to-soft border border-line rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAllPage}
              className="flex items-center gap-2 text-xs font-bold text-ink hover:text-brand dark:hover:text-brand-2 transition-colors"
            >
              {allPageSelected ? (
                <CheckSquare className="w-4 h-4 text-brand" />
              ) : (
                <Square className="w-4 h-4 text-ink-2" />
              )}
              <span>Selecionar Todos da Página ({availableItems.length} disponíveis)</span>
            </button>

            <button
              type="button"
              onClick={selectAllAvailable}
              className="text-xs font-bold text-brand-ink hover:brightness-110 dark:text-brand flex items-center gap-1 underline underline-offset-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Marcar Todos
            </button>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-brand-ink dark:text-brand bg-soft px-3 py-1 rounded-full">
                {selected.size} selecionado(s)
              </span>
              <button
                type="button"
                onClick={() => clearSelection()}
                className="text-xs font-bold text-ink-2 hover:text-red-500 transition-colors"
              >
                Desmarcar Tudo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista de Cards Ricos para Registros de Clientes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-xs font-bold text-ink-2">Carregando dados do Bitrix24...</p>
        </div>
      ) : (
        <div className="max-h-[34rem] overflow-y-auto space-y-3 pr-1">
          {mode === 'deals'
            ? processedDeals.map((deal) => {
                const isSelected = selected.has(deal.id);
                const isSingleImporting = importingSingleId === deal.id;

                return (
                  <div
                    key={deal.id}
                    className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl border transition-colors ${
                      deal.alreadyImported
                        ? 'opacity-50 bg-surface-2 border-line'
                        : isSelected
                          ? 'bg-brand/10 border-brand/50 shadow-md shadow-brand/5 ring-1 ring-brand/30'
                          : 'bg-surface border-line hover:border-brand/40 hover:bg-soft shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="pt-1 shrink-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={deal.alreadyImported}
                          onChange={() => toggle(deal.id)}
                          className="w-4 h-4 rounded border-line text-brand focus:ring-brand cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-soft text-brand-ink dark:text-brand flex items-center justify-center shrink-0 font-bold text-xs">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <h4 className="font-bold text-ink text-sm truncate">{deal.title}</h4>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-soft text-brand-ink dark:text-brand border border-brand/20 text-[10px] font-bold">
                            <Tag className="w-3 h-3" />
                            {deal.stageLabel}
                          </span>
                          {deal.alreadyImported && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 text-ink-2 text-[10px] font-bold">
                              <Check className="w-3 h-3" /> Já Importado
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-ink-2">
                          {deal.assignedById && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-ink-2" />
                              {userName(deal.assignedById)}
                            </span>
                          )}
                          {deal.opportunity && (
                            <span className="flex items-center gap-1 font-bold text-green-600 dark:text-green-400">
                              <DollarSign className="w-3.5 h-3.5" />
                              R$ {Number(deal.opportunity).toLocaleString('pt-BR')}
                            </span>
                          )}
                          {deal.dateCreate && (
                            <span className="flex items-center gap-1 text-ink-2">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {new Date(deal.dateCreate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ação Individual de 1 Clique */}
                    {!deal.alreadyImported && (
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                        <button
                          type="button"
                          onClick={() => importSingle(deal.id)}
                          disabled={isSingleImporting || importing}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-soft hover:bg-brand/20 text-brand-ink dark:text-brand border border-brand/20 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {isSingleImporting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-brand" />
                          )}
                          {isSingleImporting ? 'Importando...' : 'Importar Agora'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            : processedLeads.map((lead) => {
                const isSelected = selected.has(lead.id);
                const isSingleImporting = importingSingleId === lead.id;
                const whatsappUrl = lead.phone
                  ? `https://wa.me/${lead.phone.replace(/\D/g, '')}`
                  : null;

                return (
                  <div
                    key={lead.id}
                    className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl border transition-colors ${
                      lead.alreadyImported
                        ? 'opacity-50 bg-surface-2 border-line'
                        : isSelected
                          ? 'bg-brand/10 border-brand/50 shadow-md shadow-brand/5 ring-1 ring-brand/30'
                          : 'bg-surface border-line hover:border-brand/40 hover:bg-soft shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="pt-1 shrink-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={lead.alreadyImported}
                          onChange={() => toggle(lead.id)}
                          className="w-4 h-4 rounded border-line text-brand focus:ring-brand cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-soft text-brand-ink dark:text-brand flex items-center justify-center shrink-0 font-bold text-xs">
                            <Users className="w-4 h-4" />
                          </div>
                          <h4 className="font-bold text-ink text-sm truncate">{lead.title}</h4>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-soft text-brand-ink dark:text-brand border border-brand/20 text-[10px] font-bold">
                            <Tag className="w-3 h-3" />
                            {lead.statusLabel}
                          </span>
                          {lead.alreadyImported && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 text-ink-2 text-[10px] font-bold">
                              <Check className="w-3 h-3" /> Já Importado
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-ink">
                          {lead.contactName && (
                            <span className="flex items-center gap-1 font-semibold">
                              <Users className="w-3.5 h-3.5 text-ink-2" />
                              {lead.contactName}
                            </span>
                          )}

                          {lead.phone && (
                            <span className="flex items-center gap-1 text-ink-2">
                              <Phone className="w-3.5 h-3.5 text-green-500" />
                              {lead.phone}
                              {whatsappUrl && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1 text-green-600 hover:text-green-700 inline-flex items-center gap-0.5 text-[10px] font-bold bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded"
                                  title="Abrir no WhatsApp"
                                >
                                  WhatsApp <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </span>
                          )}

                          {lead.email && (
                            <span className="flex items-center gap-1 text-ink-2">
                              <Mail className="w-3.5 h-3.5 text-blue-500" />
                              <a href={`mailto:${lead.email}`} className="hover:underline">
                                {lead.email}
                              </a>
                            </span>
                          )}

                          {lead.dateCreate && (
                            <span className="flex items-center gap-1 text-ink-2 ml-auto">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {new Date(lead.dateCreate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ação Individual de 1 Clique */}
                    {!lead.alreadyImported && (
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                        <button
                          type="button"
                          onClick={() => importSingle(lead.id)}
                          disabled={isSingleImporting || importing}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-soft hover:bg-brand/20 text-brand-ink dark:text-brand border border-brand/20 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {isSingleImporting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-brand" />
                          )}
                          {isSingleImporting ? 'Importando...' : 'Importar Agora'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

          {(mode === 'deals' ? processedDeals.length : processedLeads.length) === 0 && (
            <div className="p-10 text-center bg-surface-2 rounded-3xl border border-dashed border-line space-y-2">
              <Info className="w-8 h-8 text-ink-2 mx-auto" />
              <p className="text-sm font-bold text-ink">Nenhum registro encontrado</p>
              <p className="text-xs text-ink-2">
                Tente ajustar os filtros, mudar a busca ou selecionar outra aba.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Paginação Inferior */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPaginate(Math.max(0, start - 50))}
            disabled={loading || start === 0}
            className="px-4 py-2 border border-line rounded-2xl text-xs font-bold text-ink hover:bg-surface-2 disabled:opacity-30 transition-colors"
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={() => next != null && onPaginate(next)}
            disabled={loading || next == null}
            className="px-4 py-2 border border-line rounded-2xl text-xs font-bold text-ink hover:bg-surface-2 disabled:opacity-30 transition-colors"
          >
            Próxima →
          </button>
          <span className="text-xs text-ink-2 pl-2">
            Exibindo {start + 1}–
            {start + (mode === 'deals' ? processedDeals.length : processedLeads.length)} de {total}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => onBulkEdit()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-2 hover:bg-line text-ink text-xs font-bold rounded-2xl transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar ({selected.size})
            </button>
          )}
          <button
            type="button"
            onClick={onImportSelected}
            disabled={importing || selected.size === 0}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-brand-active to-brand-2 hover:brightness-110 text-on-brand text-xs font-bold rounded-2xl shadow-md shadow-brand-active/20 transition-colors disabled:opacity-40"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {importing
              ? 'Importando...'
              : `Importar ${selected.size > 0 ? `(${selected.size})` : 'selecionados'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
