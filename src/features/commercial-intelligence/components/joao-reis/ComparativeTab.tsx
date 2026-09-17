import { CompareBar, DeltaPill } from '../../../../components/ui/CompareBar';
import { DIAGNOSTIC_DATA, formatCurrency } from './data';

export function ComparativeTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-card-lg border border-line bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-black text-ink">Julho vs. Agosto — visão geral</h3>
          <p className="text-[11px] text-ink-2">Barra maior = valor mais alto entre os meses</p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-sm bg-brand/30" />
            Julho
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-sm bg-brand" />
            Agosto
          </span>
        </div>
        <div className="space-y-3">
          <CompareBar
            label="Leads novos"
            seriesA={{ label: 'Julho', value: DIAGNOSTIC_DATA.metJul.leadsNovos }}
            seriesB={{ label: 'Agosto', value: DIAGNOSTIC_DATA.metAgo.leadsNovos }}
          />
          <CompareBar
            label="Leads trabalhados"
            seriesA={{ label: 'Julho', value: DIAGNOSTIC_DATA.metJul.leadsTrabalhados }}
            seriesB={{ label: 'Agosto', value: DIAGNOSTIC_DATA.metAgo.leadsTrabalhados }}
          />
          <CompareBar
            label="Atividades totais"
            seriesA={{ label: 'Julho', value: DIAGNOSTIC_DATA.metJul.atividadesTotais }}
            seriesB={{ label: 'Agosto', value: DIAGNOSTIC_DATA.metAgo.atividadesTotais }}
          />
          <CompareBar
            label="Reunião Agendada"
            seriesA={{ label: 'Julho', value: DIAGNOSTIC_DATA.metJul.reuniaoAgendada }}
            seriesB={{ label: 'Agosto', value: DIAGNOSTIC_DATA.metAgo.reuniaoAgendada }}
          />
          <CompareBar
            label="Receita ganha"
            seriesA={{ label: 'Julho', value: DIAGNOSTIC_DATA.metJul.ganhoValor }}
            seriesB={{ label: 'Agosto', value: DIAGNOSTIC_DATA.metAgo.ganhoValor }}
            format={formatCurrency}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-card-lg border border-line bg-surface p-6 shadow-card">
        <h3 className="text-sm font-black text-ink">Todos os indicadores, lado a lado</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2 text-[10px] font-bold uppercase text-ink-2">
              <tr>
                <th className="p-3">Indicador</th>
                <th className="p-3 text-right">Julho</th>
                <th className="p-3 text-right">Agosto</th>
                <th className="p-3 text-right">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium">
              <tr>
                <td className="p-3 font-bold text-ink">Leads Novos</td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {DIAGNOSTIC_DATA.metJul.leadsNovos}
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {DIAGNOSTIC_DATA.metAgo.leadsNovos}
                </td>
                <td className="p-3 text-right">
                  <DeltaPill value={65.8} />
                </td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-ink">Leads Trabalhados</td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {DIAGNOSTIC_DATA.metJul.leadsTrabalhados}
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {DIAGNOSTIC_DATA.metAgo.leadsTrabalhados}
                </td>
                <td className="p-3 text-right">
                  <DeltaPill value={179.7} />
                </td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-ink">Atividades Totais</td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {DIAGNOSTIC_DATA.metJul.atividadesTotais}
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {DIAGNOSTIC_DATA.metAgo.atividadesTotais}
                </td>
                <td className="p-3 text-right">
                  <DeltaPill value={148.8} />
                </td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-ink">Reuniões Agendadas</td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {DIAGNOSTIC_DATA.metJul.reuniaoAgendada}
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {DIAGNOSTIC_DATA.metAgo.reuniaoAgendada}
                </td>
                <td className="p-3 text-right">
                  <DeltaPill value={-6.25} />
                </td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-ink">Taxa de Agendamento</td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {DIAGNOSTIC_DATA.metJul.taxaAgendamento}%
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {DIAGNOSTIC_DATA.metAgo.taxaAgendamento}%
                </td>
                <td className="p-3 text-right">
                  <DeltaPill value={-66.4} note="gargalo" />
                </td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-ink">Receita Ganha (João)</td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {formatCurrency(DIAGNOSTIC_DATA.metJul.ganhoValor)}
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {formatCurrency(DIAGNOSTIC_DATA.metAgo.ganhoValor)}
                </td>
                <td className="p-3 text-right">
                  <DeltaPill value={101.8} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
