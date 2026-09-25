import { GitMerge, Loader2, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/Card.js';
import { api } from '../../../lib/api.js';
import { clientLogger } from '../../../lib/clientLogger.js';
import { toast } from '../../../lib/toast.js';

// CRM-002/003 (auditoria de débito técnico): vive em settings/components/, não em
// features/crm/components/, porque é o único consumidor desta rota e consome só
// /api/leads/dedup/** via HTTP — mesmo padrão de MemoryGovernancePanel.tsx (nunca importa nenhum
// módulo de src/features/crm/** diretamente, proibido por no-cross-feature-imports).

interface DedupLead {
  id: string;
  title: string | null;
  amount: number | null;
  currency: string;
  status: string;
  createdAt: string;
}

interface DedupGroup {
  contactId: string;
  survivorId: string;
  duplicateIds: string[];
  leads: DedupLead[];
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount == null) return '—';
  return amount.toLocaleString('pt-BR', { style: 'currency', currency });
}

export function LeadDedupPanel() {
  const [groups, setGroups] = useState<DedupGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<{ groups: DedupGroup[] }>('/api/leads/dedup/preview');
      setGroups(result.groups);
    } catch (err: any) {
      clientLogger.error({ err }, 'Erro ao carregar preview de deduplicação de leads');
      setError(err instanceof Error ? err.message : 'Erro ao carregar duplicados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const totalDuplicates = groups.reduce((sum, g) => sum + g.duplicateIds.length, 0);

  const handleMerge = async () => {
    setMerging(true);
    try {
      const result = await api.post<{ merged: number }>('/api/leads/dedup/merge');
      toast.success(`${result.merged} lead(s) duplicado(s) mesclado(s) com sucesso.`);
      await loadPreview();
    } catch (err: any) {
      clientLogger.error({ err }, 'Erro ao mesclar leads duplicados');
      toast.error(err instanceof Error ? err.message : 'Erro ao mesclar leads duplicados.');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-brand" /> Deduplicação de Leads
          </CardTitle>
          <CardDescription>
            Leads do mesmo contato acumulados por duplicidade de importação/sincronização. O lead de
            maior valor comercial é mantido; os demais são mesclados nele — notas, atividades,
            histórico de etapas, anexos e todo o restante do histórico comercial são preservados,
            reatribuídos ao sobrevivente antes de os duplicados serem removidos (soft-delete,
            recuperável via auditoria).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-ink-2">Carregando…</p>
          ) : error ? (
            <p className="text-sm text-danger-active dark:text-danger">{error}</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-ink-2">Nenhuma duplicidade encontrada.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-ink flex items-center gap-2">
                  <Users className="w-4 h-4 text-ink-2" />
                  {groups.length} grupo(s) · {totalDuplicates} lead(s) a mesclar
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadPreview()}
                    disabled={loading}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Recarregar
                  </Button>
                  <Button size="sm" onClick={handleMerge} disabled={merging}>
                    {merging ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <GitMerge className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {merging ? 'Mesclando…' : `Mesclar ${totalDuplicates} lead(s)`}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {groups.map((group) => (
                  <div
                    key={group.contactId}
                    className="p-4 bg-surface-2/40 rounded-2xl border border-line space-y-2"
                  >
                    {group.leads.map((lead) => (
                      <div
                        key={lead.id}
                        className={`flex items-center justify-between gap-3 text-xs p-2 rounded-lg ${
                          lead.id === group.survivorId
                            ? 'bg-success/10 border border-success/20'
                            : 'text-ink-2'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-ink truncate">
                            {lead.title || 'Negócio sem título'}
                            {lead.id === group.survivorId && (
                              <span className="ml-2 text-[10px] font-bold text-success-active dark:text-success uppercase">
                                Sobrevivente
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-ink-2">
                            {lead.status} · {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className="font-bold text-ink shrink-0">
                          {formatAmount(lead.amount, lead.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
