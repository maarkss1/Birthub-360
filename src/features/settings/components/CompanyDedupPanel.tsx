import { Building2, GitMerge, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
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

// Item 13 (Inteligência de Dados & Enriquecimento) — mesmo padrão de LeadDedupPanel.tsx: vive em
// settings/components/ porque é o único consumidor de /api/companies/dedup/** via HTTP, nunca
// importa nada de src/features/crm/** diretamente (no-cross-feature-imports).

interface DedupCompany {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string | null;
  enrichmentStatus: string;
  createdAt: string;
}

interface DedupGroup {
  key: string;
  matchedBy: 'cnpj' | 'tradeName';
  survivorId: string;
  duplicateIds: string[];
  companies: DedupCompany[];
}

export function CompanyDedupPanel() {
  const [groups, setGroups] = useState<DedupGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<{ groups: DedupGroup[] }>('/api/companies/dedup/preview');
      setGroups(result.groups);
    } catch (err: any) {
      clientLogger.error({ err }, 'Erro ao carregar preview de deduplicação de empresas');
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
      const result = await api.post<{ merged: number; groups: number }>(
        '/api/companies/dedup/merge',
      );
      toast.success(`${result.merged} empresa(s) duplicada(s) mesclada(s) com sucesso.`);
      await loadPreview();
    } catch (err: any) {
      clientLogger.error({ err }, 'Erro ao mesclar empresas duplicadas');
      toast.error(err instanceof Error ? err.message : 'Erro ao mesclar empresas duplicadas.');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-brand" /> Deduplicação de Empresas
          </CardTitle>
          <CardDescription>
            Empresas com o mesmo CNPJ (dado legado) ou o mesmo nome fantasia sem CNPJ cadastrado
            (comum em importação do Bitrix24). A empresa com enriquecimento mais completo é mantida;
            contatos, negócios, notas, anexos, documentos comerciais e histórico de enriquecimento
            das demais são reatribuídos a ela antes de serem removidas (soft-delete, recuperável via
            auditoria).
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
                  <Building2 className="w-4 h-4 text-ink-2" />
                  {groups.length} grupo(s) · {totalDuplicates} empresa(s) a mesclar
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
                    {merging ? 'Mesclando…' : `Mesclar ${totalDuplicates} empresa(s)`}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {groups.map((group) => (
                  <div
                    key={`${group.matchedBy}:${group.key}`}
                    className="p-4 bg-surface-2/40 rounded-2xl border border-line space-y-2"
                  >
                    <p className="text-[10px] font-semibold text-ink-2 uppercase tracking-wide">
                      Casado por {group.matchedBy === 'cnpj' ? 'CNPJ' : 'nome fantasia'}
                    </p>
                    {group.companies.map((company) => (
                      <div
                        key={company.id}
                        className={`flex items-center justify-between gap-3 text-xs p-2 rounded-lg ${
                          company.id === group.survivorId
                            ? 'bg-success/10 border border-success/20'
                            : 'text-ink-2'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-ink truncate">
                            {company.tradeName || company.legalName}
                            {company.id === group.survivorId && (
                              <span className="ml-2 text-[10px] font-bold text-success-active dark:text-success uppercase">
                                Sobrevivente
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-ink-2">
                            {company.cnpj || 'sem CNPJ'} ·{' '}
                            {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge
                          variant={
                            company.enrichmentStatus === 'Enriquecido' ? 'success' : 'default'
                          }
                          className="shrink-0"
                        >
                          {company.enrichmentStatus}
                        </Badge>
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
