import { Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/Card';
import { api } from '../../../lib/api';

// Consome só `/api/agent/swarm/learn/**` (feature intelligence) via HTTP — mesmo motivo de
// `MemoryGovernancePanel.tsx` viver aqui em vez de na feature dona da rota
// (`no-cross-feature-imports`, `.dependency-cruiser.cjs`). Sempre self-service: a API só devolve
// e só decide sobre o perfil do próprio usuário autenticado (ver comentário em
// `agent.routes.ts` acima de `/swarm/learn/history`).

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface LearningProfileVersionEntry {
  version: number;
  guidelines: string;
  createdAt: string;
  approvalStatus: ApprovalStatus;
}

interface LearningProfileState {
  activeVersion: number;
  lastAuditLogAt: string | null;
  versions: LearningProfileVersionEntry[];
}

export function LearningProfilePanel() {
  const [state, setState] = useState<LearningProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reflecting, setReflecting] = useState(false);
  const [decidingVersion, setDecidingVersion] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<LearningProfileState>('/api/agent/swarm/learn/history');
      setState(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o estilo aprendido.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReflect = async () => {
    setReflecting(true);
    setError(null);
    try {
      await api.post('/api/agent/swarm/learn');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar reflexão.');
    } finally {
      setReflecting(false);
    }
  };

  const handleDecide = async (version: number, outcome: 'approve' | 'reject') => {
    setDecidingVersion(version);
    try {
      await api.post(`/api/agent/swarm/learn/${outcome}`, { targetVersion: version });
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Erro ao ${outcome === 'approve' ? 'aprovar' : 'rejeitar'}.`,
      );
    } finally {
      setDecidingVersion(null);
    }
  };

  const pending = (state?.versions ?? []).filter((v) => v.approvalStatus === 'PENDING');
  const activeEntry = state?.versions.find((v) => v.version === state.activeVersion) ?? null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand" />
            Estilo de IA aprendido com você
          </CardTitle>
          <CardDescription>
            O enxame observa suas ações no CRM e sugere um estilo para os agentes SDR/BDR/CRM
            imitarem — mas só passa a valer depois que você aprova. Nada muda sozinho.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-danger/10 border border-danger/30 text-danger-active dark:text-danger rounded-xl text-xs">
            {error}
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-ink-2 uppercase tracking-wide mb-1">
            Estilo ativo hoje
          </p>
          {activeEntry ? (
            <p className="text-sm text-ink bg-surface-2 rounded-lg p-3">{activeEntry.guidelines}</p>
          ) : (
            <p className="text-sm text-ink-2">
              Nenhum estilo aprovado ainda — os agentes usam o comportamento padrão.
            </p>
          )}
        </div>

        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-ink-2 uppercase tracking-wide">
              Aguardando sua aprovação
            </p>
            {pending.map((entry) => (
              <div key={entry.version} className="border border-line rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Versão {entry.version}</Badge>
                  <span className="text-[11px] text-ink-2">
                    {new Date(entry.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm text-ink">{entry.guidelines}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={decidingVersion === entry.version}
                    onClick={() => void handleDecide(entry.version, 'approve')}
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decidingVersion === entry.version}
                    onClick={() => void handleDecide(entry.version, 'reject')}
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={reflecting}
          onClick={() => void handleReflect()}
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          {reflecting
            ? 'Analisando seu histórico...'
            : 'Gerar novo estilo a partir do meu histórico'}
        </Button>
      </CardContent>
    </Card>
  );
}
