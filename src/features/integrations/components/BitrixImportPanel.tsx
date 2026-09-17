import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import { hasRequiredRole } from '../../../lib/auth/authorization';
import { BitrixBulkEditModal } from './bitrix-import/BitrixBulkEditModal';
import { BitrixFilterToolbar } from './bitrix-import/BitrixFilterToolbar';
import { BitrixImportAlerts } from './bitrix-import/BitrixImportAlerts';
import { BitrixItemsList } from './bitrix-import/BitrixItemsList';
import type {
  BitrixDealPipeline,
  BitrixDealStage,
  BitrixDealSummary,
  BitrixFieldOption,
  BitrixImportPanelProps,
  BitrixLeadSummary,
  BitrixUserOption,
} from './bitrix-import/types';

export function BitrixImportPanel({ connectionId }: BitrixImportPanelProps) {
  const { currentUser } = useAuth();
  const canPickAnyVendor = !!currentUser && hasRequiredRole(currentUser.role, ['ADMIN', 'GESTOR']);
  const [mode, setMode] = useState<'deals' | 'leads'>('deals');

  // ── Modo Negócios ──
  const [pipelines, setPipelines] = useState<BitrixDealPipeline[]>([]);
  const [stages, setStages] = useState<BitrixDealStage[]>([]);
  const [users, setUsers] = useState<BitrixUserOption[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [stageId, setStageId] = useState('');
  const [assignedById, setAssignedById] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [deals, setDeals] = useState<BitrixDealSummary[]>([]);

  // ── Modo Leads ──
  const [leads, setLeads] = useState<BitrixLeadSummary[]>([]);

  // ── Filtros Locais & Ordenação ──
  const [quickFilter, setQuickFilter] = useState<'all' | 'unimported' | 'has_phone' | 'has_value'>(
    'all',
  );
  const [sortBy, setSortBy] = useState<'recent' | 'value' | 'name'>('recent');

  // ── Busca por Nome ──
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const [fields, setFields] = useState<BitrixFieldOption[]>([]);
  const [customFieldCode, setCustomFieldCode] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [debouncedCustomFieldValue, setDebouncedCustomFieldValue] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCustomFieldValue(customFieldValue), 400);
    return () => clearTimeout(timer);
  }, [customFieldValue]);

  // ── Estado Compartilhado ──
  const [start, setStart] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importingSingleId, setImportingSingleId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    skippedConflicts: number;
    skippedNotOwned: number;
    failed?: number;
  } | null>(null);
  const [restrictedWarning, setRestrictedWarning] = useState('');

  // ── Modal de Edição em Lote ──
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkTemperature, setBulkTemperature] = useState<'Frio' | 'Morno' | 'Quente'>('Morno');

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    api
      .get<BitrixDealPipeline[]>(`/api/bitrix/deal-pipelines?connectionId=${connectionId}`)
      .then((data) => {
        setPipelines(data);
        setCategoryId(data[0]?.id ?? '');
      })
      .catch(() => {
        setPipelines([]);
        setCategoryId('');
      });
    api
      .get<BitrixUserOption[]>(`/api/bitrix/users?connectionId=${connectionId}`)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [connectionId]);

  useEffect(() => {
    setCustomFieldCode('');
    setCustomFieldValue('');
    const entity = mode === 'deals' ? 'deal' : 'lead';
    api
      .get<BitrixFieldOption[]>(`/api/bitrix/fields?connectionId=${connectionId}&entity=${entity}`)
      .then(setFields)
      .catch(() => setFields([]));
  }, [connectionId, mode]);

  useEffect(() => {
    setStageId('');
    if (!categoryId) {
      setStages([]);
      return;
    }
    api
      .get<BitrixDealStage[]>(
        `/api/bitrix/deal-stages?connectionId=${connectionId}&categoryId=${categoryId}`,
      )
      .then(setStages)
      .catch(() => setStages([]));
  }, [connectionId, categoryId]);

  const loadDeals = useCallback(
    async (from: number) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ start: String(from), connectionId });
        if (categoryId) params.set('categoryId', categoryId);
        if (stageId) params.set('stageId', stageId);
        if (assignedById) params.set('assignedById', assignedById);
        if (month) params.set('month', month);
        if (year) params.set('year', year);
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (customFieldCode && debouncedCustomFieldValue.trim()) {
          params.set('customFieldCode', customFieldCode);
          params.set('customFieldValue', debouncedCustomFieldValue.trim());
        }
        const { data, meta } = await api.get<{
          data: { deals: BitrixDealSummary[]; next: number | null; total: number };
          meta: { restricted: boolean; warning?: string };
        }>(`/api/bitrix/deals?${params}`);
        setDeals(data.deals);
        setNext(data.next);
        setTotal(data.total);
        setStart(from);
        setRestrictedWarning(meta.warning || '');
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Não foi possível carregar os negócios do Bitrix24.',
        );
      } finally {
        setLoading(false);
      }
    },
    [
      assignedById,
      categoryId,
      connectionId,
      customFieldCode,
      debouncedCustomFieldValue,
      debouncedSearch,
      month,
      stageId,
      year,
    ],
  );

  const loadLeads = useCallback(
    async (from: number) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ start: String(from), connectionId });
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (customFieldCode && debouncedCustomFieldValue.trim()) {
          params.set('customFieldCode', customFieldCode);
          params.set('customFieldValue', debouncedCustomFieldValue.trim());
        }
        const { data, meta } = await api.get<{
          data: { leads: BitrixLeadSummary[]; next: number | null; total: number };
          meta: { restricted: boolean; warning?: string };
        }>(`/api/bitrix/leads?${params}`);
        setLeads(data.leads);
        setNext(data.next);
        setTotal(data.total);
        setStart(from);
        setRestrictedWarning(meta.warning || '');
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Não foi possível carregar os leads do Bitrix24.',
        );
      } finally {
        setLoading(false);
      }
    },
    [connectionId, customFieldCode, debouncedCustomFieldValue, debouncedSearch],
  );

  const load = useCallback(
    (from: number) => (mode === 'deals' ? loadDeals(from) : loadLeads(from)),
    [loadDeals, loadLeads, mode],
  );

  useEffect(() => {
    setSelected(new Set());
    setImportResult(null);
    load(0);
  }, [load]);

  // ── Processamento dos dados na tela (Quick Filter + Sorting) ──
  const processedDeals = useMemo(() => {
    let list = [...deals];
    if (quickFilter === 'unimported') list = list.filter((d) => !d.alreadyImported);
    if (quickFilter === 'has_value') list = list.filter((d) => Number(d.opportunity || 0) > 0);

    if (sortBy === 'value') {
      list.sort((a, b) => Number(b.opportunity || 0) - Number(a.opportunity || 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'recent') {
      list.sort(
        (a, b) => new Date(b.dateCreate || 0).getTime() - new Date(a.dateCreate || 0).getTime(),
      );
    }
    return list;
  }, [deals, quickFilter, sortBy]);

  const processedLeads = useMemo(() => {
    let list = [...leads];
    if (quickFilter === 'unimported') list = list.filter((l) => !l.alreadyImported);
    if (quickFilter === 'has_phone') list = list.filter((l) => Boolean(l.phone));

    if (sortBy === 'name') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'recent') {
      list.sort(
        (a, b) => new Date(b.dateCreate || 0).getTime() - new Date(a.dateCreate || 0).getTime(),
      );
    }
    return list;
  }, [leads, quickFilter, sortBy]);

  const availableItems =
    mode === 'deals'
      ? processedDeals.filter((d) => !d.alreadyImported)
      : processedLeads.filter((l) => !l.alreadyImported);

  const totalSelectedValue = useMemo(() => {
    if (mode !== 'deals') return 0;
    return deals
      .filter((d) => selected.has(d.id))
      .reduce((acc, d) => acc + Number(d.opportunity || 0), 0);
  }, [deals, selected, mode]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  };

  const allPageSelected =
    availableItems.length > 0 && availableItems.every((item) => selected.has(item.id));

  const toggleAllPage = () => {
    if (allPageSelected) {
      setSelected(new Set());
    } else {
      const nextSet = new Set(selected);
      availableItems.forEach((item) => {
        nextSet.add(item.id);
      });
      setSelected(nextSet);
    }
  };

  const selectAllAvailable = () => {
    const nextSet = new Set(selected);
    availableItems.forEach((item) => {
      nextSet.add(item.id);
    });
    setSelected(nextSet);
  };

  // Importação em Lote
  const importSelected = async () => {
    if (selected.size === 0) return null;
    setImporting(true);
    setError('');
    setImportResult(null);
    try {
      const endpoint = mode === 'deals' ? '/api/bitrix/deals/import' : '/api/bitrix/leads/import';
      const body =
        mode === 'deals'
          ? { connectionId, bitrixDealIds: Array.from(selected) }
          : { connectionId, bitrixLeadIds: Array.from(selected) };
      const result = await api.post<{
        imported: number;
        skipped: number;
        skippedConflicts: number;
        skippedNotOwned: number;
        failed: number;
        importedLeadIds: string[];
      }>(endpoint, body, { timeoutMs: 90_000 });
      setImportResult(result);
      setSelected(new Set());
      setShowBulkEditModal(false);
      await load(start);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao importar os itens selecionados.');
      return null;
    } finally {
      setImporting(false);
    }
  };

  // Confirmação do modal "Editar em Lote": importa e, em seguida, aplica a temperatura inicial
  // escolhida a cada lead realmente criado. Antes desta correção, bulkTemperature/bulkTriggerVoice
  // eram só estado local — o usuário configurava, via importSelected (mesma função do botão
  // "Importar Selecionados" simples), recebia toast de sucesso, e nada era de fato aplicado.
  const applyBulkEditAndImport = async () => {
    const result = await importSelected();
    if (!result?.importedLeadIds?.length) return;

    const outcomes = await Promise.allSettled(
      result.importedLeadIds.map((id) =>
        api.put(`/api/leads/${id}`, { temperature: bulkTemperature }),
      ),
    );
    const failedCount = outcomes.filter((o) => o.status === 'rejected').length;
    if (failedCount > 0) {
      setError(
        `Importação concluída, mas a temperatura inicial não pôde ser aplicada a ${failedCount} de ${result.importedLeadIds.length} lead(s) — os demais foram atualizados normalmente.`,
      );
    }
  };

  // Importação Individual de 1 Clique
  const importSingle = async (id: string) => {
    setImportingSingleId(id);
    setError('');
    try {
      const endpoint = mode === 'deals' ? '/api/bitrix/deals/import' : '/api/bitrix/leads/import';
      const body =
        mode === 'deals'
          ? { connectionId, bitrixDealIds: [id] }
          : { connectionId, bitrixLeadIds: [id] };
      const result = await api.post<{
        imported: number;
        skipped: number;
        skippedConflicts: number;
        skippedNotOwned: number;
        failed: number;
      }>(endpoint, body, { timeoutMs: 30_000 });
      setImportResult(result);
      await load(start);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao importar o item.');
    } finally {
      setImportingSingleId(null);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-line space-y-4">
      <BitrixFilterToolbar
        mode={mode}
        setMode={setMode}
        total={total}
        loading={loading}
        onRefresh={() => load(start)}
        search={search}
        setSearch={setSearch}
        quickFilter={quickFilter}
        setQuickFilter={setQuickFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        deals={processedDeals}
        leads={processedLeads}
        pipelines={pipelines}
        stages={stages}
        users={users}
        fields={fields}
        stageId={stageId}
        setStageId={setStageId}
        assignedById={assignedById}
        setAssignedById={setAssignedById}
        month={month}
        setMonth={setMonth}
        year={year}
        setYear={setYear}
        customFieldCode={customFieldCode}
        setCustomFieldCode={setCustomFieldCode}
        customFieldValue={customFieldValue}
        setCustomFieldValue={setCustomFieldValue}
        canPickAnyVendor={canPickAnyVendor}
        currentYear={currentYear}
        totalSelectedValue={totalSelectedValue}
        selectedCount={selected.size}
        onBulkEdit={() => setShowBulkEditModal(true)}
        onImportSelected={importSelected}
        importing={importing}
      />

      <BitrixImportAlerts
        error={error}
        restrictedWarning={restrictedWarning}
        importResult={importResult}
      />

      <BitrixItemsList
        mode={mode}
        loading={loading}
        availableItems={availableItems}
        allPageSelected={allPageSelected}
        toggleAllPage={toggleAllPage}
        selectAllAvailable={selectAllAvailable}
        selected={selected}
        clearSelection={() => setSelected(new Set())}
        processedDeals={processedDeals}
        processedLeads={processedLeads}
        importingSingleId={importingSingleId}
        importing={importing}
        toggle={toggle}
        importSingle={importSingle}
        users={users}
        start={start}
        next={next}
        total={total}
        onPaginate={load}
        onBulkEdit={() => setShowBulkEditModal(true)}
        onImportSelected={importSelected}
      />

      <BitrixBulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        selectedCount={selected.size}
        bulkTemperature={bulkTemperature}
        setBulkTemperature={setBulkTemperature}
        importing={importing}
        onConfirm={applyBulkEditAndImport}
      />
    </div>
  );
}
