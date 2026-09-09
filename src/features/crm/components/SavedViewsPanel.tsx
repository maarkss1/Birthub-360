import { Bookmark, Loader2, Play, Plus, Save, Trash2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Dialog } from '../../../components/ui/Dialog';
import { api } from '../../../lib/api';
import { toast } from '../../../lib/toast';

export interface SavedViewFilters {
  owner?: string;
  q?: string;
}

export interface SavedViewItem {
  id: string;
  name: string;
  funnel: 'Lead' | 'Negocio';
  filters: SavedViewFilters;
  createdAt: string;
}

interface SavedViewsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentFunnel: 'Lead' | 'Negocio';
  currentFilters: SavedViewFilters;
  /** Nome do dono atualmente selecionado no filtro, só para exibir a lista de forma legível
   *  (a view guarda o id, não o nome). */
  ownerNameById: Record<string, string>;
  onApply: (view: SavedViewItem) => void;
}

/**
 * Onda B2b (Agente 00, Commercial AI OS) — Saved Views do pipeline CRM: pessoais (SavedView.userId
 * é o dono exclusivo, reforçado no backend). Mesmo padrão visual de SavedSearchesModal.tsx
 * (prospecção) — lista + formulário de criação dentro do mesmo Dialog — mas sem conceito de
 * agendamento/execução: aqui "aplicar" só navega para a combinação de funil+filtros salva.
 */
export function SavedViewsPanel({
  isOpen,
  onClose,
  currentFunnel,
  currentFilters,
  ownerNameById,
  onApply,
}: SavedViewsPanelProps) {
  const [views, setViews] = useState<SavedViewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const loadViews = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<SavedViewItem[]>('/api/crm/saved-views');
      setViews(data || []);
    } catch {
      toast.error('Erro ao carregar views salvas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadViews();
      setShowCreateForm(false);
      setNewName('');
    }
  }, [isOpen, loadViews]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setCreating(true);
      await api.post('/api/crm/saved-views', {
        name: newName.trim(),
        funnel: currentFunnel,
        filters: currentFilters,
      });
      toast.success('View salva com sucesso!');
      setNewName('');
      setShowCreateForm(false);
      loadViews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar view');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (view: SavedViewItem) => {
    if (
      !(await confirm({
        title: 'Excluir view salva',
        description: `Excluir a view "${view.name}"?`,
        confirmLabel: 'Excluir',
        variant: 'danger',
      }))
    )
      return;
    try {
      await api.delete(`/api/crm/saved-views/${view.id}`);
      toast.success('View removida');
      setViews((prev) => prev.filter((v) => v.id !== view.id));
    } catch {
      toast.error('Erro ao excluir view');
    }
  };

  const describeView = (view: SavedViewItem) => {
    const parts = [view.funnel === 'Lead' ? 'Leads' : 'Negócios'];
    if (view.filters.owner) {
      parts.push(`dono: ${ownerNameById[view.filters.owner] ?? view.filters.owner}`);
    }
    if (view.filters.q) {
      parts.push(`busca: "${view.filters.q}"`);
    }
    return parts.join(' · ');
  };

  const dialogTitle = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand-active dark:text-brand-2 flex items-center justify-center font-bold shrink-0">
        <Bookmark size={20} />
      </div>
      <div>
        <div className="text-xl font-bold text-ink leading-tight">Views Salvas</div>
        <p className="text-xs text-ink-2 font-normal">
          Combinações de funil e filtros que você usa com frequência — pessoais, só você vê
        </p>
      </div>
    </div>
  );

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={dialogTitle}
        maxWidth="max-w-xl"
        footer={
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-surface-2 text-xs font-bold text-ink hover:bg-surface-3 transition-colors"
          >
            Fechar
          </button>
        }
      >
        <div className="space-y-4">
          {!showCreateForm ? (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-line hover:border-brand/40 text-sm font-bold text-brand-active dark:text-brand-2 flex items-center justify-center gap-2 hover:bg-brand/5 transition-all"
            >
              <Plus size={18} /> Salvar Filtro Atual como Nova View
            </button>
          ) : (
            <form
              onSubmit={handleCreate}
              className="p-4 rounded-2xl bg-surface-2/60 border border-line space-y-3"
            >
              <h3 className="text-xs font-bold uppercase text-ink-2">Nova View</h3>
              <div>
                <label
                  htmlFor="saved-view-name"
                  className="text-xs font-medium text-ink block mb-1"
                >
                  Nome da View
                </label>
                <input
                  id="saved-view-name"
                  type="text"
                  required
                  placeholder="Ex: Meus leads quentes"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-brand"
                />
              </div>
              <p className="text-[11px] text-ink-2">
                Vai salvar:{' '}
                {describeView({
                  id: '',
                  name: '',
                  createdAt: '',
                  funnel: currentFunnel,
                  filters: currentFilters,
                })}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-ink-2 hover:bg-surface-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-xl bg-brand-active text-white text-xs font-bold hover:brightness-110 flex items-center gap-1.5"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{' '}
                  Salvar View
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
            </div>
          ) : views.length === 0 ? (
            <div className="py-8 text-center text-ink-2 text-xs font-medium">
              Nenhuma view salva ainda. Configure seus filtros e clique acima para salvar!
            </div>
          ) : (
            views.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-2xl bg-surface border border-line hover:border-brand/30 transition-all flex items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <span className="text-sm font-bold text-ink block truncate">{v.name}</span>
                  <span className="text-[11px] text-ink-2 block truncate">{describeView(v)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onApply(v);
                      onClose();
                    }}
                    title="Aplicar esta view"
                    className="px-3 py-1.5 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand-active dark:text-brand-2 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Play size={14} />
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(v)}
                    title="Excluir view salva"
                    className="p-2 text-ink-2 hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Dialog>

      {dialog}
    </>
  );
}
