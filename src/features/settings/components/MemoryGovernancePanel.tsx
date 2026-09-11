import { useCallback, useEffect, useState } from 'react';
import {
  BrainCircuit,
  Check,
  History,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Textarea } from '../../../components/ui/Textarea';
import { api } from '../../../lib/api';
import { clientLogger } from '../../../lib/clientLogger';
import { useAuth } from '../../../contexts/AuthContext';
import { hasRequiredRole } from '../../../lib/auth/authorization';

// Consome só `/api/memory/**` (feature job-roles, dono do PROMPT 9) via HTTP — nunca importa
// nenhum módulo de `src/features/job-roles/**` diretamente (proibido por
// `no-cross-feature-imports`, `.dependency-cruiser.cjs`). Vive em `settings/components/` porque é
// o único consumidor (aba "Memória & Aprendizado" de `Settings.tsx`), não porque pertença ao
// domínio de configurações — mesmo espírito de outras abas de Settings que também só chamam a API
// de outra feature por HTTP.

type MemoryScope = 'AGENT' | 'ROLE' | 'ORGANIZATION';
type MemoryCategory =
  | 'PRICING'
  | 'DISCOUNT'
  | 'FORECAST_RULE'
  | 'CONTRACT'
  | 'FINANCE'
  | 'COMPLIANCE'
  | 'WRITE_AUTOMATION'
  | 'CAPABILITY'
  | 'OPERATIONAL';
type MemoryStatus =
  | 'PROPOSED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'ROLLED_BACK';

// Mesma matriz de `memory-policy.ts` (backend) — duplicada aqui só para feedback visual
// imediato (desabilitar o botão antes do clique); quem decide de verdade é sempre o backend,
// que rejeita com 403 se este espelho ficar desatualizado.
const SENSITIVE_CATEGORIES: readonly MemoryCategory[] = [
  'PRICING',
  'DISCOUNT',
  'FORECAST_RULE',
  'CONTRACT',
  'FINANCE',
  'COMPLIANCE',
  'WRITE_AUTOMATION',
  'CAPABILITY',
];

interface LearningCandidateDto {
  id: string;
  sourceExecutionId: string;
  agentCode: string;
  jobRoleCode: string | null;
  targetScope: MemoryScope;
  topic: string;
  category: MemoryCategory;
  proposedContent: Record<string, unknown> & { summary?: string };
  reflection: Record<string, unknown> & { rationale?: string };
  evidence: unknown[];
  sanitization: { detectedTypes: string[]; requiresManualReview: boolean } | null;
  status: MemoryStatus;
  decisionNotes: string | null;
  decidedAt: string | null;
  resultingMemoryId: string | null;
  createdAt: string;
}

interface MemoryRecordDto {
  id: string;
  topic: string;
  category: MemoryCategory;
  content: Record<string, unknown> & { summary?: string };
  version: number;
  status: MemoryStatus;
  createdAt: string;
  rolledBackReason?: string | null;
}

function categoryLabel(category: MemoryCategory): string {
  return category
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function scopeLabel(scope: MemoryScope): string {
  if (scope === 'AGENT') return 'Agente';
  if (scope === 'ROLE') return 'Cargo';
  return 'Organização';
}

/** Extrai o id da memória ativa em conflito da mensagem literal de erro do backend
 *  (`Já existe uma memória ativa (<id>) com conteúdo diferente...`, ver `memory.service.ts`) —
 *  não há campo estruturado para isso na resposta 409 hoje. */
function extractConflictMemoryId(message: string): string | null {
  const match = /memória ativa \(([^)]+)\)/.exec(message);
  return match?.[1] ?? null;
}

const EMPTY_NEW_CANDIDATE = {
  sourceExecutionId: '',
  targetScope: 'AGENT' as MemoryScope,
  topic: '',
  category: 'OPERATIONAL' as MemoryCategory,
  summary: '',
  rationale: '',
};

export function MemoryGovernancePanel() {
  const { currentUser } = useAuth();
  const [candidates, setCandidates] = useState<LearningCandidateDto[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [notesByCandidate, setNotesByCandidate] = useState<Record<string, string>>({});
  const [conflictByCandidate, setConflictByCandidate] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newCandidate, setNewCandidate] = useState(EMPTY_NEW_CANDIDATE);
  const [newCandidateError, setNewCandidateError] = useState<string | null>(null);
  const [creatingCandidate, setCreatingCandidate] = useState(false);

  const [scope, setScope] = useState<MemoryScope>('ORGANIZATION');
  const [codeInput, setCodeInput] = useState('');
  const [records, setRecords] = useState<MemoryRecordDto[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [rollbackReasonById, setRollbackReasonById] = useState<Record<string, string>>({});

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    setCandidateError(null);
    try {
      const res = await api.get<{ candidates: LearningCandidateDto[] }>(
        '/api/memory/candidates?status=PROPOSED',
      );
      setCandidates(res.candidates || []);
    } catch (err) {
      setCandidateError(
        err instanceof Error ? err.message : 'Erro ao carregar candidatos de memória.',
      );
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const canDecide = (category: MemoryCategory) => {
    if (!currentUser) return false;
    const minRole = SENSITIVE_CATEGORIES.includes(category) ? 'GESTOR' : 'SDR';
    return hasRequiredRole(currentUser.role, [minRole]);
  };

  const handleApprove = async (candidate: LearningCandidateDto, supersedesMemoryId?: string) => {
    setProcessingId(candidate.id);
    try {
      await api.post(`/api/memory/candidates/${candidate.id}/approve`, {
        notes: notesByCandidate[candidate.id]?.trim() || undefined,
        supersedesMemoryId,
      });
      setConflictByCandidate((prev) => {
        const next = { ...prev };
        delete next[candidate.id];
        return next;
      });
      await loadCandidates();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao aprovar memória.';
      const conflictId = extractConflictMemoryId(message);
      if (conflictId) {
        setConflictByCandidate((prev) => ({ ...prev, [candidate.id]: conflictId }));
      } else {
        clientLogger.error({ err }, 'Error approving learning candidate');
        setCandidateError(message);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (candidate: LearningCandidateDto) => {
    setProcessingId(candidate.id);
    try {
      await api.post(`/api/memory/candidates/${candidate.id}/reject`, {
        notes: notesByCandidate[candidate.id]?.trim() || undefined,
      });
      await loadCandidates();
    } catch (err) {
      clientLogger.error({ err }, 'Error rejecting learning candidate');
      setCandidateError(err instanceof Error ? err.message : 'Erro ao rejeitar memória.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateCandidate = async () => {
    setNewCandidateError(null);
    if (
      !newCandidate.sourceExecutionId.trim() ||
      !newCandidate.topic.trim() ||
      !newCandidate.summary.trim() ||
      !newCandidate.rationale.trim()
    ) {
      setNewCandidateError('Preencha execução de origem, tópico, resumo e racional.');
      return;
    }
    setCreatingCandidate(true);
    try {
      await api.post('/api/memory/candidates', {
        sourceExecutionId: newCandidate.sourceExecutionId.trim(),
        targetScope: newCandidate.targetScope,
        topic: newCandidate.topic.trim(),
        category: newCandidate.category,
        proposedContent: { summary: newCandidate.summary.trim() },
        reflection: { rationale: newCandidate.rationale.trim() },
      });
      setNewCandidate(EMPTY_NEW_CANDIDATE);
      setShowNewForm(false);
      await loadCandidates();
    } catch (err) {
      setNewCandidateError(
        err instanceof Error ? err.message : 'Erro ao propor candidato de memória.',
      );
    } finally {
      setCreatingCandidate(false);
    }
  };

  const loadRecords = useCallback(async () => {
    if (scope !== 'ORGANIZATION' && !codeInput.trim()) {
      setRecords([]);
      return;
    }
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const path =
        scope === 'ORGANIZATION'
          ? '/api/memory/organization'
          : scope === 'AGENT'
            ? `/api/memory/agent/${encodeURIComponent(codeInput.trim())}`
            : `/api/memory/role/${encodeURIComponent(codeInput.trim())}`;
      const res = await api.get<{ memory: MemoryRecordDto[] }>(path);
      setRecords(res.memory || []);
    } catch (err) {
      setRecordsError(err instanceof Error ? err.message : 'Erro ao carregar memória ativa.');
    } finally {
      setLoadingRecords(false);
    }
  }, [scope, codeInput]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const canRollback = !!currentUser && hasRequiredRole(currentUser.role, ['GESTOR']);

  const handleRollback = async (record: MemoryRecordDto) => {
    const reason = rollbackReasonById[record.id]?.trim();
    if (!reason) {
      setRecordsError('Informe o motivo do rollback antes de confirmar.');
      return;
    }
    const scopePath = scope.toLowerCase();
    try {
      await api.post(`/api/memory/${scopePath}/${record.id}/rollback`, { reason });
      await loadRecords();
    } catch (err) {
      setRecordsError(err instanceof Error ? err.message : 'Erro ao revogar memória.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-brand" />
              Memória & Aprendizado dos Agentes
            </CardTitle>
            <CardDescription>
              Aprovação humana obrigatória antes de qualquer aprendizado virar comportamento real
              dos agentes de IA — nenhuma mudança de política entra em vigor sem decisão registrada
              aqui.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNewForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Propor memória
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadCandidates()}
              disabled={loadingCandidates}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loadingCandidates ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showNewForm && (
            <div className="border border-line rounded-xl p-4 mb-4 space-y-3 bg-surface-2/40">
              <p className="text-xs text-ink-2">
                Registra manualmente o que uma execução de agente ensinou — sempre ancorado numa
                execução real e terminal (`AgentExecution.id`), nunca especulativo. Fica{' '}
                <strong>proposto</strong> aqui até um decisor aprovar.
              </p>
              {newCandidateError && (
                <div className="p-2.5 bg-danger/10 border border-danger/30 text-danger-active dark:text-danger rounded-lg text-xs">
                  {newCandidateError}
                </div>
              )}
              <input
                type="text"
                value={newCandidate.sourceExecutionId}
                onChange={(e) =>
                  setNewCandidate((prev) => ({ ...prev, sourceExecutionId: e.target.value }))
                }
                placeholder="Id da AgentExecution de origem"
                className="w-full bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink outline-none placeholder:text-ink-2"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={newCandidate.targetScope}
                  onChange={(e) =>
                    setNewCandidate((prev) => ({
                      ...prev,
                      targetScope: e.target.value as MemoryScope,
                    }))
                  }
                  className="bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink outline-none"
                >
                  <option value="AGENT">Escopo: Agente</option>
                  <option value="ROLE">Escopo: Cargo</option>
                  <option value="ORGANIZATION">Escopo: Organização</option>
                </select>
                <select
                  value={newCandidate.category}
                  onChange={(e) =>
                    setNewCandidate((prev) => ({
                      ...prev,
                      category: e.target.value as MemoryCategory,
                    }))
                  }
                  className="bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink outline-none"
                >
                  {(
                    [
                      'OPERATIONAL',
                      'PRICING',
                      'DISCOUNT',
                      'FORECAST_RULE',
                      'CONTRACT',
                      'FINANCE',
                      'COMPLIANCE',
                      'WRITE_AUTOMATION',
                      'CAPABILITY',
                    ] as MemoryCategory[]
                  ).map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newCandidate.topic}
                  onChange={(e) => setNewCandidate((prev) => ({ ...prev, topic: e.target.value }))}
                  placeholder="Tópico (ex: sdr.follow_up.melhor_horario)"
                  className="flex-1 min-w-[200px] bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink outline-none placeholder:text-ink-2"
                />
              </div>
              <Textarea
                placeholder="O que foi aprendido (resumo curto e factual)"
                value={newCandidate.summary}
                onChange={(e) => setNewCandidate((prev) => ({ ...prev, summary: e.target.value }))}
                className="min-h-[50px] text-xs"
              />
              <Textarea
                placeholder="Por que vale a pena lembrar disso (racional)"
                value={newCandidate.rationale}
                onChange={(e) =>
                  setNewCandidate((prev) => ({ ...prev, rationale: e.target.value }))
                }
                className="min-h-[50px] text-xs"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={creatingCandidate}
                  onClick={() => void handleCreateCandidate()}
                >
                  Enviar para aprovação
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {candidateError && (
            <div className="p-3 bg-danger/10 border border-danger/30 text-danger-active dark:text-danger rounded-xl text-xs flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {candidateError}
            </div>
          )}

          {loadingCandidates && candidates.length === 0 ? (
            <div className="text-center py-8 text-xs text-ink-2">Carregando candidatos...</div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8 text-xs text-ink-2 border border-dashed border-line rounded-xl">
              Nenhum aprendizado aguardando aprovação no momento.
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => {
                const eligible = canDecide(candidate.category);
                const conflictId = conflictByCandidate[candidate.id];
                return (
                  <div
                    key={candidate.id}
                    className="border border-line rounded-xl p-4 space-y-3 bg-surface-2/40"
                  >
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="neon">{categoryLabel(candidate.category)}</Badge>
                        <Badge variant="outline">
                          {scopeLabel(candidate.targetScope)}
                          {candidate.targetScope === 'AGENT' && ` · ${candidate.agentCode}`}
                          {candidate.targetScope === 'ROLE' &&
                            candidate.jobRoleCode &&
                            ` · ${candidate.jobRoleCode}`}
                        </Badge>
                        {candidate.sanitization?.requiresManualReview && (
                          <Badge variant="warning">
                            Contém dado sensível — revisão obrigatória
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-ink-2">
                        {new Date(candidate.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-ink">{candidate.topic}</p>
                      {candidate.proposedContent.summary && (
                        <p className="text-xs text-ink-2 mt-0.5">
                          {candidate.proposedContent.summary}
                        </p>
                      )}
                    </div>

                    {candidate.reflection.rationale && (
                      <p className="text-xs text-ink-2 italic border-l-2 border-line pl-3">
                        &ldquo;{candidate.reflection.rationale}&rdquo;
                      </p>
                    )}

                    <p className="text-[11px] text-ink-2">
                      {candidate.evidence.length} evidência(s) rastreável(is) · origem: execução{' '}
                      {candidate.sourceExecutionId.slice(0, 8)}...
                    </p>

                    {!eligible && (
                      <p className="text-[11px] text-warning-active dark:text-warning">
                        Esta categoria exige nível de GESTOR ou superior para decidir.
                      </p>
                    )}

                    {conflictId && (
                      <div className="p-2.5 bg-warning/10 border border-warning/30 rounded-lg text-xs text-warning-active dark:text-warning space-y-2">
                        <p>
                          Já existe uma memória ativa diferente para este tópico. Aprovar substitui
                          a versão atual (nunca some — fica versionada e reversível).
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processingId === candidate.id}
                          onClick={() => void handleApprove(candidate, conflictId)}
                        >
                          Confirmar substituição
                        </Button>
                      </div>
                    )}

                    <Textarea
                      placeholder="Nota da decisão (opcional)"
                      value={notesByCandidate[candidate.id] ?? ''}
                      onChange={(e) =>
                        setNotesByCandidate((prev) => ({
                          ...prev,
                          [candidate.id]: e.target.value,
                        }))
                      }
                      className="min-h-[60px] text-xs"
                    />

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!eligible || processingId === candidate.id}
                        onClick={() => void handleApprove(candidate)}
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!eligible || processingId === candidate.id}
                        onClick={() => void handleReject(candidate)}
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-brand" />
            Memória ativa
          </CardTitle>
          <CardDescription>
            O que está em vigor hoje para um agente, cargo ou para a organização inteira —
            versionado, com rollback disponível para GESTOR/ADMIN.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as MemoryScope)}
              className="bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink outline-none"
              aria-label="Escopo da memória"
            >
              <option value="ORGANIZATION">Organização</option>
              <option value="AGENT">Agente (por código)</option>
              <option value="ROLE">Cargo (por código)</option>
            </select>
            {scope !== 'ORGANIZATION' && (
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder={scope === 'AGENT' ? 'Código do agente (ex: sdr)' : 'Código do cargo'}
                className="bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink outline-none placeholder:text-ink-2"
              />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadRecords()}
              disabled={loadingRecords}
            >
              Buscar
            </Button>
          </div>

          {recordsError && (
            <div className="p-3 bg-danger/10 border border-danger/30 text-danger-active dark:text-danger rounded-xl text-xs">
              {recordsError}
            </div>
          )}

          {loadingRecords ? (
            <div className="text-center py-6 text-xs text-ink-2">Carregando memória ativa...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-6 text-xs text-ink-2 border border-dashed border-line rounded-xl">
              Nenhuma memória ativa encontrada para este escopo.
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="border border-line rounded-xl p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="neon">{categoryLabel(record.category)}</Badge>
                      <Badge variant="outline">v{record.version}</Badge>
                    </div>
                    <span className="text-[11px] text-ink-2">
                      {new Date(record.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-ink">{record.topic}</p>
                  {record.content.summary && (
                    <p className="text-xs text-ink-2">{record.content.summary}</p>
                  )}
                  {canRollback && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={rollbackReasonById[record.id] ?? ''}
                        onChange={(e) =>
                          setRollbackReasonById((prev) => ({
                            ...prev,
                            [record.id]: e.target.value,
                          }))
                        }
                        placeholder="Motivo do rollback"
                        className="flex-1 bg-surface-2 border border-line rounded-lg px-2.5 py-1 text-xs text-ink outline-none placeholder:text-ink-2"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleRollback(record)}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Rollback
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
