import {
  AlertTriangle,
  Bot,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Copy,
  FileText,
  Flame,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  User,
  X,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { SoundFX } from '../../../lib/soundEffects';
import type {
  DailyPlanItem,
  DailyPlanItemChannel,
  DailyPlanPriorityLevel,
  UserDailyPlanSummary,
} from '../../../shared/contracts/dailyPlan.contract';
import { commercialIntelligenceApi } from '../commercialIntelligence.api';
import type { DailyPlanTeamMember } from '../commercialIntelligence.api';
import { DEFAULT_DAILY_PLAN, type DailyTask, PITCHES_BY_SEGMENT } from './dailyPlanHub.content';
import { DailyPlanTeamOverview } from './DailyPlanTeamOverview';

export function DailyPlanHub() {
  const { currentUser, canAccessCommercialIntelligence } = useAuth();
  const [activeTab, setActiveTab] = useState<'daily' | 'roteiro' | 'iacoach' | 'pauta1to1'>(
    'daily',
  );

  // Estado do Plano Diário Bitrix
  const [planData, setPlanData] = useState<UserDailyPlanSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<DailyPlanTeamMember | null>(null);
  const [ownBitrixUserId, setOwnBitrixUserId] = useState<string | null>(null);

  // Estados de Interação nos Itens
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  // Modal de Nova Atividade
  const [showNewActivityModal, setShowNewActivityModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newChannel, setNewChannel] = useState<DailyPlanItemChannel>('CALL');
  const [newContact, setNewContact] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newDueTime, setNewDueTime] = useState<string>('14:00');
  const [newObs, setNewObs] = useState<string>('');
  const [isCreatingActivity, setIsCreatingActivity] = useState<boolean>(false);

  // Roteiro Diário Tradicional (Checklist)
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(DEFAULT_DAILY_PLAN);
  const [selectedSegment, setSelectedSegment] =
    useState<keyof typeof PITCHES_BY_SEGMENT>('transportadora');
  const [copiedPauta, setCopiedPauta] = useState(false);

  // Carregar Plano do Usuário
  const loadDailyPlan = useCallback(async (assignedById?: string) => {
    try {
      setIsLoading(true);
      setPlanError(null);
      setPlanData(null);
      const res = await commercialIntelligenceApi.getDailyPlan(assignedById);
      if (res) {
        setPlanData(res);
        if (!assignedById) setOwnBitrixUserId(res.bitrixUserId);
      }
    } catch (err) {
      console.error('Erro ao carregar plano diário:', err);
      setPlanError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o plano diário. Tente novamente.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDailyPlan();
  }, [loadDailyPlan]);

  const handleMemberSelect = useCallback(
    (member: DailyPlanTeamMember) => {
      setSelectedMember(member);
      setActiveTab('daily');
      setActiveNoteItemId(null);
      void loadDailyPlan(member.id);
    },
    [loadDailyPlan],
  );

  // Sincronizar com Bitrix
  const handleSyncBitrix = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      SoundFX.play('focus');
      const res = await commercialIntelligenceApi.syncDailyPlan(selectedMember?.id);
      if (res) {
        setPlanData(res);
      }
      setSyncFeedback('Sincronizado com sucesso!');
      SoundFX.play('success');
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch {
      setSyncFeedback('Falha na sincronização com Bitrix24.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Concluir Item
  const handleCompleteItem = async (item: DailyPlanItem) => {
    try {
      SoundFX.play('success');
      // Atualização otimista na UI
      setPlanData((prev) => {
        if (!prev) return prev;
        const updated = prev.items.map((i) =>
          i.id === item.id
            ? { ...i, completed: true, priority: 'COMPLETED' as DailyPlanPriorityLevel }
            : i,
        );
        const comp = updated.filter((i) => i.completed).length;
        return {
          ...prev,
          kpis: {
            ...prev.kpis,
            completedItems: comp,
            pendingItems: updated.length - comp,
            completionRate: Math.round((comp / updated.length) * 100),
          },
          items: updated,
        };
      });

      await commercialIntelligenceApi.completeDailyPlanItem(item.origin, item.id);
    } catch (err) {
      console.error('Erro ao concluir item:', err);
      void loadDailyPlan(selectedMember?.id);
    }
  };

  // Adicionar Observação e Sincronizar no Bitrix
  const handleSaveNote = async (item: DailyPlanItem) => {
    if (!noteText.trim()) return;
    try {
      setIsSubmittingNote(true);
      await commercialIntelligenceApi.addDailyPlanNote(item.origin, item.id, noteText);
      SoundFX.play('success');

      // Atualiza nota no item localmente
      setPlanData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === item.id ? { ...i, notes: [...i.notes, noteText] } : i,
          ),
        };
      });

      setNoteText('');
      setActiveNoteItemId(null);
    } catch (err) {
      console.error('Erro ao salvar observação:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Criar Nova Atividade
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setIsCreatingActivity(true);
      await commercialIntelligenceApi.createDailyPlanActivity({
        title: newTitle,
        channel: newChannel,
        contactName: newContact || undefined,
        phone: newPhone || undefined,
        dueTime: newDueTime || undefined,
        observations: newObs || undefined,
      });
      SoundFX.play('success');
      setShowNewActivityModal(false);
      setNewTitle('');
      setNewContact('');
      setNewPhone('');
      setNewObs('');
      void loadDailyPlan(selectedMember?.id);
    } catch (err) {
      console.error('Erro ao criar atividade:', err);
    } finally {
      setIsCreatingActivity(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScriptId(id);
    SoundFX.play('success');
    setTimeout(() => setCopiedScriptId(null), 2000);
  };

  // Roteiro / Tarefas Check
  const toggleTask = (id: string) => {
    setDailyTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );
    SoundFX.play('focus');
  };

  const resetDailyTasks = () => {
    setDailyTasks(DEFAULT_DAILY_PLAN.map((t) => ({ ...t, completed: false })));
  };

  // Agrupamento por Prioridade
  const urgentItems = planData?.items.filter((i) => !i.completed && i.priority === 'URGENT') || [];
  const highItems = planData?.items.filter((i) => !i.completed && i.priority === 'HIGH') || [];
  const mediumItems = planData?.items.filter((i) => !i.completed && i.priority === 'MEDIUM') || [];
  const completedItems = planData?.items.filter((i) => i.completed) || [];
  const selectedMemberId = selectedMember?.id ?? ownBitrixUserId ?? '';
  const isViewingAnotherMember = Boolean(selectedMember && selectedMember.id !== ownBitrixUserId);

  const completedCount = dailyTasks.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedCount / dailyTasks.length) * 100);

  const getChannelBadge = (channel: DailyPlanItemChannel) => {
    switch (channel) {
      case 'CALL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Phone className="w-3 h-3" /> Ligação
          </span>
        );
      case 'WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </span>
        );
      case 'MEETING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <CalendarCheck className="w-3 h-3" /> Reunião
          </span>
        );
      case 'EMAIL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <FileText className="w-3 h-3" /> E-mail
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-brand/10 text-brand border border-brand/20">
            <ClipboardCheck className="w-3 h-3" /> Tarefa
          </span>
        );
    }
  };

  const renderCard = (item: DailyPlanItem) => {
    const isNoteOpen = activeNoteItemId === item.id;
    return (
      <div
        key={item.id}
        className={`p-4 rounded-2xl border transition-all duration-200 bg-surface shadow-card hover:shadow-card-hover ${
          item.completed ? 'opacity-60 border-line' : 'border-line hover:border-brand/30'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => handleCompleteItem(item)}
              disabled={item.completed || isViewingAnotherMember}
              title={
                isViewingAnotherMember
                  ? 'A visão de outro integrante é somente leitura'
                  : item.completed
                    ? 'Concluído'
                    : 'Marcar como concluído'
              }
              className={`mt-0.5 shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                item.completed
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-line hover:border-emerald-500 hover:bg-emerald-50 text-transparent'
              }`}
            >
              <Check className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {getChannelBadge(item.channel)}
                {item.dueTime && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-2">
                    <Clock className="w-3 h-3" /> {item.dueTime}
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  {item.origin === 'BITRIX_TASK'
                    ? 'Bitrix Tarefa'
                    : item.origin === 'BITRIX_ACTIVITY'
                      ? 'Bitrix CRM'
                      : item.origin === 'BITRIX_LEAD'
                        ? 'Bitrix Lead'
                        : 'Central AtlasGR'}
                </span>
              </div>

              <h4
                className={`text-sm font-bold text-ink ${item.completed ? 'line-through text-ink-3' : ''}`}
              >
                {item.title}
              </h4>

              {(item.contactName || item.companyName || item.phone) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-2 mt-1">
                  {item.contactName && (
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" /> {item.contactName}
                    </span>
                  )}
                  {item.companyName && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {item.companyName}
                    </span>
                  )}
                  {item.phone && (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                      <Phone className="w-3 h-3" /> {item.phone}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {item.phone && !item.completed && (
              <a
                href={`https://wa.me/55${item.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}

            <button
              type="button"
              onClick={() => setActiveNoteItemId(isNoteOpen ? null : item.id)}
              disabled={isViewingAnotherMember}
              title={
                isViewingAnotherMember ? 'A visão de outro integrante é somente leitura' : undefined
              }
              className="px-3 py-1.5 rounded-xl border border-line hover:border-brand/30 text-xs font-bold text-ink transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-brand" />
              Observação
              {isNoteOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Box Tático Inteligente: "Como Fazer" */}
        {item.tacticalGuidance && !item.completed && (
          <div className="mt-3 p-3 rounded-xl bg-bg border border-line text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-brand">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-brand" /> Como Fazer (Diretriz Tática)
              </span>
              {item.tacticalGuidance.scriptOrPrompt && (
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(item.tacticalGuidance.scriptOrPrompt ?? '', item.id)
                  }
                  className="text-ink-2 hover:text-brand inline-flex items-center gap-1 cursor-pointer font-bold"
                >
                  {copiedScriptId === item.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copiar Script
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-ink font-medium leading-relaxed">
              {item.tacticalGuidance.recommendedAction}
            </p>
            {item.tacticalGuidance.scriptOrPrompt && (
              <p className="text-ink-2 italic font-serif bg-surface p-2 rounded-lg border border-line/60">
                &quot;{item.tacticalGuidance.scriptOrPrompt}&quot;
              </p>
            )}
            {item.tacticalGuidance.suggestedHook && (
              <p className="text-[11px] text-amber-600 font-medium">
                💡 <strong>Gancho:</strong> {item.tacticalGuidance.suggestedHook}
              </p>
            )}
          </div>
        )}

        {/* Gaveta de Observação Direta com Bitrix */}
        {isNoteOpen && (
          <div className="mt-3 pt-3 border-t border-line space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span>Adicionar Observação (Sincroniza com Bitrix24):</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                aria-label="Observação da tarefa ou atividade"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ex: Cliente pediu retorno às 16h / Reunião confirmada..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-line bg-surface text-ink focus:outline-none focus:border-brand"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveNote(item);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleSaveNote(item)}
                disabled={isSubmittingNote || !noteText.trim()}
                className="px-4 py-2 bg-brand text-white text-xs font-black rounded-xl hover:bg-brand-active transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                {isSubmittingNote ? 'Salvando...' : 'Salvar no Bitrix'}
              </button>
            </div>

            {item.notes && item.notes.length > 0 && (
              <div className="space-y-1 mt-2">
                <span className="text-[10px] font-black uppercase text-ink-3">Histórico:</span>
                {item.notes.map((n, idx) => (
                  <p
                    key={idx}
                    className="text-xs text-ink-2 bg-bg px-2.5 py-1.5 rounded-lg border border-line/60"
                  >
                    {n}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg p-4 md:p-8 space-y-6 min-h-screen text-ink">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner de Identificação & Ações Globais */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-brand/10 via-brand-2/10 to-gold/10 border border-brand/20 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand mb-1">
              <Sparkles className="w-4 h-4 text-brand" />
              Plano Diário Operacional
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-ink">
              {selectedMember?.name || currentUser?.name || 'Comercial'}
            </h1>
            <p className="text-sm text-ink-2 mt-1 flex items-center gap-2 flex-wrap">
              <span>
                {selectedMember ? 'Equipe comercial · Bitrix24' : currentUser?.role || 'Comercial'}
              </span>
              <span>•</span>
              <span className="font-mono text-xs">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              {planData?.isBitrixConnected && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                    <CheckCircle className="w-3.5 h-3.5" /> Bitrix Conectado
                    {planData.bitrixUserName && ` (${planData.bitrixUserName})`}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSyncBitrix}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-2xl bg-surface border border-line hover:border-brand/40 text-xs font-black text-ink shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:shadow"
            >
              <RefreshCw className={`w-4 h-4 text-brand ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar com Bitrix'}
            </button>

            <button
              type="button"
              onClick={() => setShowNewActivityModal(true)}
              disabled={isViewingAnotherMember}
              title={
                isViewingAnotherMember ? 'A visão de outro integrante é somente leitura' : undefined
              }
              className="px-4 py-2.5 rounded-2xl bg-brand-active text-white hover:bg-brand-active text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Nova Atividade
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="p-3 rounded-2xl bg-surface border border-brand/30 text-xs font-bold text-brand shadow-sm flex items-center justify-between">
            <span>{syncFeedback}</span>
            <button type="button" onClick={() => setSyncFeedback(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {canAccessCommercialIntelligence && (
          <DailyPlanTeamOverview
            selectedMemberId={selectedMemberId}
            activePlan={planData}
            onMemberSelect={handleMemberSelect}
          />
        )}

        {isViewingAnotherMember && (
          <div
            className="rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 text-xs font-medium text-ink-2"
            role="status"
          >
            Você está visualizando a fila de{' '}
            <strong className="text-ink">{selectedMember?.name}</strong> em modo somente leitura.
          </div>
        )}

        {/* KPIs do Dia */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-line shadow-card">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-2">
              Total no Radar
            </span>
            <div className="text-2xl font-black text-ink mt-1">
              {isLoading ? '…' : (planData?.kpis.totalItems ?? '—')}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-line shadow-card">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">
              Pendentes
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {isLoading ? '…' : (planData?.kpis.pendingItems ?? '—')}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-line shadow-card">
            <span className="text-[11px] font-black uppercase tracking-wider text-red-500">
              Urgentes / Atrasadas
            </span>
            <div className="text-2xl font-black text-red-500 mt-1">
              {isLoading ? '…' : (planData?.kpis.urgentItems ?? '—')}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-line shadow-card">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600">
              Concluídas Hoje
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {isLoading
                ? '…'
                : planData
                  ? `${planData.kpis.completedItems} (${planData.kpis.completionRate}%)`
                  : '—'}
            </div>
          </div>
        </div>

        {/* Navegação por Abas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'daily', title: 'Meu Plano Diário', subtitle: 'Fila de Prioridades' },
            {
              id: 'roteiro',
              title: 'Roteiro & Blocos',
              subtitle: `${completedCount}/${dailyTasks.length} (${progressPercent}%)`,
            },
            { id: 'iacoach', title: 'IA Coach SDR', subtitle: 'Pitches & Meet' },
            { id: 'pauta1to1', title: 'Pauta de 1:1', subtitle: 'Alinhamento Gestor' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'border-brand bg-surface shadow-card-hover'
                    : 'border-line bg-surface hover:border-brand/20'
                }`}
              >
                <div className={`text-xs font-black ${active ? 'text-brand' : 'text-ink'}`}>
                  {tab.title}
                </div>
                <div className="text-[10px] text-ink-2 mt-0.5">{tab.subtitle}</div>
              </button>
            );
          })}
        </div>

        {/* Conteúdo da Aba Ativa */}
        {activeTab === 'daily' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="p-12 text-center text-ink-2 space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-brand" />
                <p className="text-sm font-bold">Carregando plano diário e dados do Bitrix24...</p>
              </div>
            ) : planError ? (
              <div
                className="flex items-start gap-3 rounded-2xl border border-critical/20 bg-critical/5 p-5 text-sm text-critical"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-black">Não foi possível abrir este plano.</p>
                  <p className="mt-1 text-xs">{planError}</p>
                  <button
                    type="button"
                    onClick={() => void loadDailyPlan(selectedMember?.id)}
                    className="mt-3 rounded-xl border border-critical/30 px-3 py-2 text-xs font-bold hover:bg-critical/10"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            ) : !planData ? (
              <div className="rounded-2xl border border-dashed border-line p-8 text-center">
                <p className="text-sm font-bold text-ink">Plano não disponível</p>
                <p className="mt-1 text-xs text-ink-2">
                  Selecione outro integrante ou atualize a equipe para tentar novamente.
                </p>
              </div>
            ) : (
              <>
                {/* 🔴 Nível 1: Urgente / Atrasadas & Reuniões */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Alta Prioridade · Reuniões de Hoje &amp; Prazos Críticos ({urgentItems.length}
                      )
                    </h3>
                  </div>
                  {urgentItems.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-surface border border-line text-xs text-ink-2">
                      Nenhuma tarefa ou reunião urgente pendente no momento. Bom ritmo!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">{urgentItems.map(renderCard)}</div>
                  )}
                </div>

                {/* 🟡 Nível 2: Follow-ups e Leads em Cadência */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                      <Flame className="w-4 h-4" />
                      Follow-ups &amp; Leads Quentes em Cadência ({highItems.length})
                    </h3>
                  </div>
                  {highItems.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-surface border border-line text-xs text-ink-2">
                      Nenhum follow-up com prazo marcado para hoje.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">{highItems.map(renderCard)}</div>
                  )}
                </div>

                {/* 🟢 Nível 3: Prospecção & Tarefas de Rotina */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Prospecção &amp; Rotinas Operacionais ({mediumItems.length})
                    </h3>
                  </div>
                  {mediumItems.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-surface border border-line text-xs text-ink-2">
                      Sem tarefas de rotina pendentes.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">{mediumItems.map(renderCard)}</div>
                  )}
                </div>

                {/* ✅ Nível 4: Concluídas Hoje */}
                {completedItems.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-line">
                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Concluídas Hoje ({completedItems.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-3">{completedItems.map(renderCard)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Aba Roteiro & Blocos de Horários */}
        {activeTab === 'roteiro' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-ink">Checklist de Ritmo Operacional</h3>
              <button
                type="button"
                onClick={resetDailyTasks}
                className="px-3 py-1.5 rounded-xl border border-line hover:border-brand/40 text-xs font-bold text-ink-2 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Resetar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {dailyTasks.map((task) => (
                <button
                  type="button"
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer bg-surface ${
                    task.completed
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-line hover:border-brand/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-line'
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-brand">{task.time}</span>
                        <span className="text-[10px] uppercase font-bold text-ink-3">
                          {task.channel}
                        </span>
                      </div>
                      <h4
                        className={`text-sm font-bold ${task.completed ? 'line-through text-ink-3' : 'text-ink'}`}
                      >
                        {task.title}
                      </h4>
                      <p className="text-xs text-ink-2 mt-0.5">{task.target}</p>
                      <p className="text-[11px] text-amber-600 mt-1 italic">💡 {task.script}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Aba IA Coach SDR */}
        {activeTab === 'iacoach' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-surface border border-line shadow-card space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand flex items-center gap-2">
                <Bot className="w-4 h-4" /> Simulador de Pitch por Segmento
              </h3>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(PITCHES_BY_SEGMENT) as (keyof typeof PITCHES_BY_SEGMENT)[]).map(
                  (seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setSelectedSegment(seg)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedSegment === seg
                          ? 'bg-brand text-white shadow-sm'
                          : 'bg-bg border border-line text-ink hover:border-brand/30'
                      }`}
                    >
                      {PITCHES_BY_SEGMENT[seg].nome}
                    </button>
                  ),
                )}
              </div>

              <div className="p-4 rounded-2xl bg-bg border border-line space-y-2 text-xs">
                <div>
                  <span className="font-bold text-red-500">Dor Principal do Segmento:</span>
                  <p className="text-ink mt-0.5">{PITCHES_BY_SEGMENT[selectedSegment].dor}</p>
                </div>
                <div>
                  <span className="font-bold text-amber-600">Pergunta de Gancho (Abertura):</span>
                  <p className="text-ink font-serif italic mt-0.5">
                    &quot;{PITCHES_BY_SEGMENT[selectedSegment].gancho}&quot;
                  </p>
                </div>
                <div>
                  <span className="font-bold text-emerald-600">Script Recomendado:</span>
                  <p className="text-ink mt-0.5 bg-surface p-3 rounded-xl border border-line/60">
                    {PITCHES_BY_SEGMENT[selectedSegment].script}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Aba Pauta de 1:1 */}
        {activeTab === 'pauta1to1' && (
          <div className="p-6 rounded-3xl bg-surface border border-line shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand flex items-center gap-2">
                <FileText className="w-4 h-4" /> Pauta Automática de 1:1 com a Gestão
              </h3>
              <button
                type="button"
                onClick={() => {
                  const text = `# Pauta 1:1 — ${currentUser?.name || 'Comercial'}
Data: ${new Date().toLocaleDateString('pt-BR')}
Total de Tarefas/Atividades no Dia: ${planData?.kpis.totalItems || 0}
Concluídas: ${planData?.kpis.completedItems || 0} (${planData?.kpis.completionRate || 0}%)
Urgentes: ${planData?.kpis.urgentItems || 0}`;
                  navigator.clipboard.writeText(text);
                  setCopiedPauta(true);
                  setTimeout(() => setCopiedPauta(false), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-black hover:bg-brand-active transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copiedPauta ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPauta ? 'Pauta Copiada!' : 'Copiar Pauta'}
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-bg border border-line text-xs font-mono space-y-2 text-ink">
              <p className="font-bold"># Pauta 1:1 — {currentUser?.name || 'Comercial'}</p>
              <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
              <p>• Total de Itens: {planData?.kpis.totalItems || 0}</p>
              <p>
                • Concluídos: {planData?.kpis.completedItems || 0} (
                {planData?.kpis.completionRate || 0}%)
              </p>
              <p>• Urgentes no radar: {planData?.kpis.urgentItems || 0}</p>
            </div>
          </div>
        )}

        {/* Modal de Criação de Atividade */}
        {showNewActivityModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface border border-line rounded-3xl p-6 max-w-lg w-full shadow-modal space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-ink">Nova Atividade no Plano Diário</h3>
                <button
                  type="button"
                  onClick={() => setShowNewActivityModal(false)}
                  className="text-ink-2 hover:text-ink cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateActivity} className="space-y-3 text-xs">
                <div>
                  <label htmlFor="activity-title" className="block font-bold text-ink mb-1">
                    Título da Atividade *
                  </label>
                  <input
                    id="activity-title"
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Ligação de qualificação - TransLog"
                    className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="activity-channel" className="block font-bold text-ink mb-1">
                      Canal
                    </label>
                    <select
                      id="activity-channel"
                      value={newChannel}
                      onChange={(e) => setNewChannel(e.target.value as DailyPlanItemChannel)}
                      className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
                    >
                      <option value="CALL">Ligação</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="MEETING">Reunião</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="TASK">Tarefa Bitrix</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="activity-duetime" className="block font-bold text-ink mb-1">
                      Horário Previsto
                    </label>
                    <input
                      id="activity-duetime"
                      type="time"
                      value={newDueTime}
                      onChange={(e) => setNewDueTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="activity-contact" className="block font-bold text-ink mb-1">
                      Contato / Decisor
                    </label>
                    <input
                      id="activity-contact"
                      type="text"
                      value={newContact}
                      onChange={(e) => setNewContact(e.target.value)}
                      placeholder="Nome do cliente"
                      className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label htmlFor="activity-phone" className="block font-bold text-ink mb-1">
                      Telefone
                    </label>
                    <input
                      id="activity-phone"
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="activity-obs" className="block font-bold text-ink mb-1">
                    Observações Iniciais
                  </label>
                  <textarea
                    id="activity-obs"
                    rows={2}
                    value={newObs}
                    onChange={(e) => setNewObs(e.target.value)}
                    placeholder="Instruções ou contexto do lead..."
                    className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewActivityModal(false)}
                    className="px-4 py-2 rounded-xl border border-line text-ink-2 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingActivity || !newTitle.trim()}
                    className="px-4 py-2 rounded-xl bg-brand text-white font-black hover:bg-brand-active transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isCreatingActivity ? 'Criando...' : 'Salvar & Sincronizar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyPlanHub;
