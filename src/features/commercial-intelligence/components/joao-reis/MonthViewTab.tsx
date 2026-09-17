import { Calendar, CheckCircle, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { ChannelDonut } from '../../../../components/ui/ChannelDonut';
import { DealsGrid } from '../../../../components/ui/DealsGrid';
import { FunnelBars } from '../../../../components/ui/FunnelBars';
import { KpiCard } from '../../../../components/ui/KpiCard';
import {
  CHANNEL_HEX,
  DIAGNOSTIC_DATA,
  formatCurrency,
  toDealCardData,
  toFunnelItems,
} from './data';

export function MonthViewTab({ month }: { month: 'julho' | 'agosto' }) {
  if (month === 'julho') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            icon={UserPlus}
            tone="brand"
            label="Leads Novos"
            value={DIAGNOSTIC_DATA.metJul.leadsNovos}
            caption="79 leads únicos"
          />
          <KpiCard
            icon={Users}
            tone="ink"
            label="Leads Trabalhados"
            value={DIAGNOSTIC_DATA.metJul.leadsTrabalhados}
            caption={`Taxa de contato: ${DIAGNOSTIC_DATA.metJul.taxaContato}%`}
          />
          <KpiCard
            icon={Calendar}
            tone="gold"
            label="Reuniões Agendadas"
            value={DIAGNOSTIC_DATA.metJul.reuniaoAgendada}
            caption={`Agendamento: ${DIAGNOSTIC_DATA.metJul.taxaAgendamento}%`}
          />
          <KpiCard
            icon={CheckCircle}
            tone="ok"
            label="Convertidos"
            value={DIAGNOSTIC_DATA.metJul.convertido}
            caption={`Receita ganha: ${formatCurrency(DIAGNOSTIC_DATA.metJul.ganhoValor)}`}
          />
        </div>

        <div className="space-y-4 rounded-card-lg border border-line bg-surface p-6 shadow-card">
          <h3 className="text-sm font-black text-ink">Funil de Leads — Julho de 2026</h3>
          <FunnelBars items={toFunnelItems(DIAGNOSTIC_DATA.funilJul)} />
        </div>

        <div className="space-y-3 rounded-card-lg border border-line bg-surface p-6 shadow-card">
          <h3 className="text-sm font-black text-ink">Canal das atividades — Julho</h3>
          <ChannelDonut
            data={DIAGNOSTIC_DATA.canalJul}
            colorMap={CHANNEL_HEX}
            totalLabel="atividades"
            formatLabel={(label) => label.replace(' (genérico)', '')}
          />
          <p className="text-[11px] text-ink-2">
            &quot;Contatar cliente (genérico)&quot; é o rótulo padrão da ferramenta de cadência — o
            canal real só aparece discriminado numa parte pequena dos registros.
          </p>
        </div>

        <div className="space-y-4 rounded-card-lg border border-line bg-surface p-6 shadow-card">
          <h3 className="text-sm font-black text-ink">
            Negócios rastreados a partir de Leads convertidos — Julho
          </h3>
          <DealsGrid deals={toDealCardData(DIAGNOSTIC_DATA.dealsJulDetalhe)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          icon={UserPlus}
          tone="brand"
          label="Leads Novos"
          value={DIAGNOSTIC_DATA.metAgo.leadsNovos}
          caption="131 leads novos"
        />
        <KpiCard
          icon={Users}
          tone="ink"
          label="Leads Trabalhados"
          value={DIAGNOSTIC_DATA.metAgo.leadsTrabalhados}
          caption="530 atividades no mês"
        />
        <KpiCard
          icon={Calendar}
          tone="gold"
          label="Reuniões Agendadas"
          value={DIAGNOSTIC_DATA.metAgo.reuniaoAgendada}
          caption="Realizadas: 6 / No-show: 1"
        />
        <KpiCard
          icon={CheckCircle}
          tone="ok"
          label="Convertidos"
          value={DIAGNOSTIC_DATA.metAgo.convertido}
          caption={`Receita: ${formatCurrency(DIAGNOSTIC_DATA.metAgo.ganhoValor)} (+101.8%)`}
        />
      </div>

      <div className="space-y-4 rounded-card-lg border border-line bg-surface p-6 shadow-card">
        <h3 className="text-sm font-black text-ink">Funil de Leads — Agosto de 2026</h3>
        <FunnelBars items={toFunnelItems(DIAGNOSTIC_DATA.funilAgo)} />
      </div>

      <div className="space-y-3 rounded-card-lg border border-line bg-surface p-6 shadow-card">
        <h3 className="text-sm font-black text-ink">Canal das atividades — Agosto</h3>
        <ChannelDonut
          data={DIAGNOSTIC_DATA.canalAgo}
          colorMap={CHANNEL_HEX}
          totalLabel="atividades"
          formatLabel={(label) => label.replace(' (genérico)', '')}
        />
        <p className="text-[11px] text-ink-2">
          &quot;Contatar cliente (genérico)&quot; é o rótulo padrão da ferramenta de cadência — o
          canal real só aparece discriminado numa parte pequena dos registros.
        </p>
      </div>

      <div className="space-y-4 rounded-card-lg border border-line bg-surface p-6 shadow-card">
        <h3 className="flex items-center gap-2 text-sm font-black text-ink">
          <ShieldCheck className="h-5 w-5 text-brand" />
          Reuniões Confirmadas por Transcrição (Google Meet)
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {DIAGNOSTIC_DATA.reuniaoVerificacao.confirmadas.map((c) => (
            <div key={c.empresa} className="space-y-2 rounded-2xl border border-ok/30 bg-ok/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-ok">{c.empresa}</span>
                <span className="rounded-full bg-ok/20 px-2 py-0.5 text-[10px] font-bold text-ok">
                  {c.data} · ~{c.duracaoMin}min
                </span>
              </div>
              <p className="text-xs text-ink-2">{c.resumo}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-card-lg border border-line bg-surface p-6 shadow-card">
        <h3 className="text-sm font-black text-ink">
          Negócios rastreados a partir de Leads convertidos — Agosto
        </h3>
        <DealsGrid deals={toDealCardData(DIAGNOSTIC_DATA.dealsAgoDetalhe)} />
      </div>
    </div>
  );
}
