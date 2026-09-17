import { AlertTriangle } from 'lucide-react';

export function DiagnosticoTab() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-card-lg border border-line bg-surface shadow-card space-y-4">
        <h3 className="text-lg font-black text-ink flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-critical" />
          Gargalos Críticos Identificados no Diagnóstico
        </h3>

        <div className="space-y-3">
          <div className="flex gap-3 rounded-2xl border border-critical/30 bg-critical/5 p-4 transition-transform hover:translate-x-1">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-critical/15 text-critical">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="space-y-1 text-xs text-ink-2">
              <p className="font-bold text-critical">
                1. Queda na Taxa de Agendamento (25% → 8.4%)
              </p>
              <p>
                Apesar de o volume de leads trabalhados quase triplicar (64 → 179), a conversão para
                reunião agendada caiu drasticamente. Déficit estimado de ~30 reuniões por perda de
                eficiência por lead.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-2xl border border-critical/30 bg-critical/5 p-4 transition-transform hover:translate-x-1">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-critical/15 text-critical">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="space-y-1 text-xs text-ink-2">
              <p className="font-bold text-critical">
                2. 88% das atividades registradas como &quot;Contatar cliente&quot; genérico
              </p>
              <p>
                Em agosto, 472 das 530 atividades não discriminaram se foi ligação, WhatsApp, e-mail
                ou LinkedIn. Solução: usar as tags de canal no sprint launcher.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
