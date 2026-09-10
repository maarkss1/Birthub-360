import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Bot,
  BrainCircuit,
  CalendarClock,
  Check,
  Mail,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { clientLogger } from '../../../lib/clientLogger';

interface PendingActionPayload {
  to?: string;
  subject?: string;
  body?: string;
  leadId?: string;
  synthesis?: string;
  trigger?: string;
  triggerDetail?: string;
  role?: string;
  date?: string;
  observations?: string;
}

interface PendingAction {
  id: string;
  entity: string;
  action: string;
  payload: PendingActionPayload;
  agentRole?: string | null;
  riskLevel?: string;
  confidence?: number | null;
  createdAt?: string;
  executedAt?: string | null;
}

interface ActionPresentation {
  title: string;
  approveLabel: string;
  approveTitle: string;
  icon: ReactNode;
}

function presentationFor(action: PendingAction): ActionPresentation {
  if (action.action === 'send_email') {
    return {
      title: 'Primeiro contato do SDR',
      approveLabel: 'Aprovar e enviar',
      approveTitle: 'Envia via SMTP; sem SMTP, abre o rascunho no cliente de e-mail.',
      icon: <Mail className="w-4 h-4 mr-2" />,
    };
  }
  if (action.action === 'create_follow_up') {
    return {
      title: 'Atividade sugerida',
      approveLabel: 'Criar atividade',
      approveTitle: 'Cria a atividade vinculada ao lead no CRM.',
      icon: <CalendarClock className="w-4 h-4 mr-2" />,
    };
  }
  return {
    title: `${action.agentRole || action.payload.role || 'IA'} · recomendação`,
    approveLabel: 'Salvar no CRM',
    approveTitle: 'Salva a recomendação como nota auditável no histórico do lead.',
    icon: <BrainCircuit className="w-4 h-4 mr-2" />,
  };
}

function riskLabel(level?: string): string {
  if (level === 'high') return 'Risco alto';
  if (level === 'low') return 'Risco baixo';
  return 'Risco médio';
}

export function AIPendingActions() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [awaitingOutcome, setAwaitingOutcome] = useState<PendingAction[]>([]);
  const [outcomeNotes, setOutcomeNotes] = useState<Record<string, string>>({});
  const [recordingOutcomeId, setRecordingOutcomeId] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    try {
      const response = await api.get<PendingAction[]>('/api/intelligence/pending');
      setActions(Array.isArray(response) ? response : []);
    } catch (error) {
      clientLogger.error({ err: error }, 'Error fetching AI actions');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAwaitingOutcome = useCallback(async () => {
    try {
      const response = await api.get<{ actions: PendingAction[] }>(
        '/api/intelligence/pending/awaiting-outcome',
      );
      setAwaitingOutcome(response.actions || []);
    } catch (error) {
      clientLogger.error({ err: error }, 'Error fetching actions awaiting outcome');
    }
  }, []);

  useEffect(() => {
    void fetchActions();
    void fetchAwaitingOutcome();
  }, [fetchActions, fetchAwaitingOutcome]);

  const handleRecordOutcome = async (id: string, status: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL') => {
    setRecordingOutcomeId(id);
    try {
      await api.post(`/api/intelligence/pending/${id}/outcome`, {
        status,
        notes: outcomeNotes[id]?.trim() || undefined,
      });
      setAwaitingOutcome((previous) => previous.filter((item) => item.id !== id));
    } catch (error) {
      clientLogger.error({ err: error }, 'Error recording action outcome');
    } finally {
      setRecordingOutcomeId(null);
    }
  };

  const handleApprove = async (action: PendingAction) => {
    setProcessingId(action.id);
    try {
      const result = await api.post<{ execution: { sent: boolean; reason?: string } }>(
        `/api/intelligence/pending/${action.id}/approve`,
      );

      // O fallback manual só faz sentido para e-mail. Recomendações antes abriam um mailto
      // vazio porque toda ação era renderizada como se fosse mensagem externa.
      if (!result.execution.sent && action.action === 'send_email') {
        const to = encodeURIComponent(action.payload.to || '');
        const subject = encodeURIComponent(action.payload.subject || '');
        const body = encodeURIComponent(action.payload.body || '');
        window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank');
      }

      setActions((previous) => previous.filter((item) => item.id !== action.id));
    } catch (error) {
      clientLogger.error({ err: error }, 'Error approving AI action');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDiscard = async (id: string) => {
    setProcessingId(id);
    try {
      await api.delete(`/api/intelligence/pending/${id}`);
      setActions((previous) => previous.filter((action) => action.id !== id));
    } catch (error) {
      clientLogger.error({ err: error }, 'Error discarding AI action');
    } finally {
      setProcessingId(null);
    }
  };

  const outcomeSection = awaitingOutcome.length > 0 && (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-ink flex items-center">
          <Sparkles className="mr-2 w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Fechando o ciclo — o que aconteceu depois?
        </h2>
        <p className="text-sm text-ink-2 mt-1">
          Estas ações já foram executadas. Registrar o resultado real é o que permite o enxame
          aprender o que funciona — nada aqui é medido automaticamente.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {awaitingOutcome.map((action) => {
          const presentation = presentationFor(action);
          const busy = recordingOutcomeId === action.id;
          return (
            <article
              key={action.id}
              className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden"
            >
              <header className="bg-surface-2 border-b border-line px-4 py-2.5 flex items-center gap-2 text-ink text-sm font-medium">
                {presentation.icon}
                <span className="truncate">{presentation.title}</span>
              </header>
              <div className="p-3 space-y-2">
                <p className="text-xs text-ink-2">
                  {action.entity}
                  {action.executedAt
                    ? ` · executada em ${new Date(action.executedAt).toLocaleDateString('pt-BR')}`
                    : ''}
                </p>
                <textarea
                  value={outcomeNotes[action.id] ?? ''}
                  onChange={(e) =>
                    setOutcomeNotes((prev) => ({ ...prev, [action.id]: e.target.value }))
                  }
                  placeholder="O que aconteceu depois? (opcional)"
                  className="w-full min-h-[50px] text-xs rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-ink placeholder:text-ink-2 outline-none"
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRecordOutcome(action.id, 'POSITIVE')}
                    className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-60 text-emerald-700 dark:text-emerald-300 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Funcionou
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRecordOutcome(action.id, 'NEGATIVE')}
                    className="flex-1 flex items-center justify-center gap-1 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-60 text-red-600 dark:text-red-400 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> Não funcionou
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRecordOutcome(action.id, 'NEUTRAL')}
                    className="flex items-center justify-center bg-surface-2 hover:bg-line disabled:opacity-60 text-ink-2 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    title="Sem efeito claro observado"
                  >
                    Neutro
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  if (loading) return <div className="p-4 text-ink-2">Carregando ações da IA...</div>;

  if (actions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-surface rounded-lg shadow-sm border border-line p-8 text-center flex flex-col items-center">
          <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-full mb-4">
            <Bot className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-ink mb-1">Nenhuma ação pendente</h3>
          <p className="text-ink-2">
            O piloto automático segue monitorando o funil em segundo plano.
          </p>
        </div>
        {outcomeSection}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-ink flex items-center">
              <Bot className="mr-2 w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Central de decisões autônomas
            </h2>
            <p className="text-sm text-ink-2 mt-1">
              Cada ação mostra origem, risco, confiança e evidência antes da execução.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 rounded-full px-3 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {actions.length} decisão{actions.length === 1 ? '' : 'ões'} aguardando revisão
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => {
            const presentation = presentationFor(action);
            const isEmail = action.action === 'send_email';
            const busy = processingId === action.id;
            return (
              <article
                key={action.id}
                className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden hover:shadow-md transition-shadow"
              >
                <header className="bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center text-indigo-800 dark:text-indigo-300 font-medium text-sm min-w-0">
                    {presentation.icon}
                    <span className="truncate">{presentation.title}</span>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-1 rounded-full font-semibold whitespace-nowrap ${action.riskLevel === 'high' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300'}`}
                  >
                    {riskLabel(action.riskLevel)}
                  </span>
                </header>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-ink-2">
                    <span>
                      {action.entity}
                      {action.payload.leadId ? ` · ${action.payload.leadId.slice(0, 10)}…` : ''}
                    </span>
                    {action.confidence != null && (
                      <span>Confiança {Math.round(action.confidence * 100)}%</span>
                    )}
                  </div>

                  {isEmail ? (
                    <>
                      <div>
                        <p className="text-xs text-ink-2 font-medium">Para</p>
                        <p className="text-sm text-ink font-medium truncate">
                          {action.payload.to || 'Destinatário não identificado'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-2 font-medium">Assunto</p>
                        <p className="text-sm text-ink">
                          {action.payload.subject || 'Sem assunto'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-2 font-medium mb-1">
                          Mensagem gerada com playbook
                        </p>
                        <div className="bg-surface-2 rounded-md p-3 text-sm text-ink-2 h-36 overflow-y-auto whitespace-pre-wrap">
                          {action.payload.body}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {action.payload.triggerDetail && (
                        <div>
                          <p className="text-xs text-ink-2 font-medium mb-1">
                            Evidência que ativou o agente
                          </p>
                          <p className="text-sm text-ink">{action.payload.triggerDetail}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-ink-2 font-medium mb-1">Decisão recomendada</p>
                        <div className="bg-surface-2 rounded-md p-3 text-sm text-ink-2 h-40 overflow-y-auto whitespace-pre-wrap">
                          {action.payload.synthesis ||
                            action.payload.observations ||
                            'Sem detalhamento textual.'}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <footer className="border-t border-line p-3 bg-surface-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleApprove(action)}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    title={presentation.approveTitle}
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    {busy ? 'Processando...' : presentation.approveLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDiscard(action.id)}
                    disabled={busy}
                    className="flex items-center justify-center bg-surface hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-60 text-red-600 dark:text-red-400 border border-line py-2 px-3 rounded-lg text-sm transition-colors cursor-pointer"
                    title="Descartar mantendo o registro de auditoria"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      </div>
      {outcomeSection}
    </div>
  );
}
