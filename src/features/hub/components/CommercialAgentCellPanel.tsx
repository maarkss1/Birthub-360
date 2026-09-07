import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Badge, type BadgeProps } from '../../../components/ui/Badge';
import {
  commercialAgentCellApi,
  type CommercialAgentDefinition,
  type CommercialAgentStatus,
} from '../commercialAgentCell.api';
// Nota de arquitetura: este painel vive em `src/features/hub/` (não em `intelligence/`) de
// propósito — chama só a rota HTTP `/api/agent/commercial-cell` (nunca um import direto de
// `intelligence/agents/**`), e `no-cross-feature-imports` (dependency-cruiser) proibiria
// `hub/components/HubScreen.tsx` de importar um componente de dentro de `intelligence/` mesmo que
// ele fosse só de apresentação.

/**
 * Painel "Equipe IA Comercial" — catálogo somente leitura dos 12 agentes da Célula Comercial
 * (onda 43, ver .agents/runs/onda-43.md). Mostra o estado REAL de cada agente (produção, novo
 * sobre serviço real, fonte parcial, mapeado e não implementado) — nunca "ativo" para algo que
 * não roda de verdade, ver /AGENTS.md → "Dados reais x demonstração". Sem nenhuma ação/escrita:
 * puramente informativo, dentro do próprio Hub Executivo (rota e menu do Hub são compartilhados
 * com o Agente 02, mas esta seção não adiciona rota nova — só um bloco dentro da tela existente).
 */
const STATUS_CONFIG: Record<CommercialAgentStatus, { label: string; variant: BadgeProps['variant'] }> = {
  REAL_EM_PRODUCAO: { label: 'Em produção', variant: 'success' },
  NOVO_SOBRE_SERVICO_REAL: { label: 'Novo · dado real', variant: 'info' },
  NOVO_FONTE_PARCIAL: { label: 'Fonte parcial', variant: 'warning' },
  MAPEADO_NAO_IMPLEMENTADO: { label: 'Não implementado', variant: 'outline' },
};

function AgentStatusBadge({ status }: { status: CommercialAgentStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function CommercialAgentCellPanel() {
  const [agents, setAgents] = useState<CommercialAgentDefinition[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    commercialAgentCellApi
      .list()
      .then((data) => {
        if (!cancelled) setAgents(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar a Equipe IA Comercial.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="hub-agentes-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <h2
          id="hub-agentes-heading"
          className="font-display text-sm font-black uppercase tracking-[0.14em] text-ink-2"
        >
          Equipe IA Comercial
        </h2>
        <span className="h-px flex-1 bg-gradient-to-r from-line to-transparent" aria-hidden="true" />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-card border border-danger/25 bg-danger/5 p-4 text-sm text-danger-active dark:text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!agents && !error && (
        <div className="flex items-center gap-2 text-sm text-ink-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Carregando agentes…
        </div>
      )}

      {agents && agents.length === 0 && (
        <p className="text-xs text-ink-2">Nenhum agente registrado no catálogo ainda.</p>
      )}

      {agents && agents.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <li
              key={agent.id}
              className="rounded-card border border-line bg-surface p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-xs font-bold text-ink">{agent.name}</p>
                  <p className="text-[11px] text-ink-2">{agent.role}</p>
                </div>
                <AgentStatusBadge status={agent.status} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-2">{agent.mission}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
