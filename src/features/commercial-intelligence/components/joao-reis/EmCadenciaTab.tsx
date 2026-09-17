import { AlertTriangle, CheckCircle, Inbox } from 'lucide-react';
import { KpiCard } from '../../../../components/ui/KpiCard';
import { DIAGNOSTIC_DATA } from './data';

export function EmCadenciaTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          icon={Inbox}
          tone="ink"
          label="Total em cadência"
          value={DIAGNOSTIC_DATA.emCadencia.resumo.total}
          caption={`${DIAGNOSTIC_DATA.emCadencia.resumo.totalAtividadesSoma} atividades somadas`}
        />
        <KpiCard
          icon={AlertTriangle}
          tone="critical"
          label="30+ dias parado"
          value={DIAGNOSTIC_DATA.emCadencia.resumo.parado30d}
          caption="Prioridade de corte"
        />
        <KpiCard
          icon={AlertTriangle}
          tone="critical"
          label="Sem nenhuma atividade"
          value={DIAGNOSTIC_DATA.emCadencia.resumo.semAtividade}
          caption="Nunca tocados"
        />
        <KpiCard
          icon={CheckCircle}
          tone="ok"
          label="Ativos"
          value={DIAGNOSTIC_DATA.emCadencia.resumo.ok}
          caption={`Gap médio geral: ${DIAGNOSTIC_DATA.emCadencia.resumo.mediaGapGeral}d`}
        />
      </div>

      <div className="space-y-4 rounded-card-lg border border-line bg-surface p-6 shadow-card">
        <h3 className="text-sm font-black text-ink">
          Estoque de Leads em &quot;Em Cadência&quot; ({DIAGNOSTIC_DATA.emCadencia.resumo.total}{' '}
          Leads)
        </h3>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2 text-[10px] font-bold uppercase text-ink-2">
              <tr>
                <th className="p-3">Empresa / Lead</th>
                <th className="p-3 text-right">Dias Parado</th>
                <th className="p-3 text-right">Atividades</th>
                <th className="p-3 text-right">Gap Médio</th>
                <th className="p-3">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {DIAGNOSTIC_DATA.emCadencia.topLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-surface-2/50">
                  <td className="p-3 font-bold text-ink">{lead.nome}</td>
                  <td className="p-3 text-right font-mono tabular-nums">{lead.diasParado}d</td>
                  <td className="p-3 text-right font-mono tabular-nums">{lead.atividades}</td>
                  <td className="p-3 text-right font-mono tabular-nums">{lead.gap}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        lead.status.includes('30+') || lead.status.includes('Sem')
                          ? 'bg-critical/20 text-critical'
                          : 'bg-gold/20 text-gold'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
