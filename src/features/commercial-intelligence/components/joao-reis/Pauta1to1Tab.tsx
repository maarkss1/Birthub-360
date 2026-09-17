import { Check, Copy, FileText, Printer } from 'lucide-react';
import { useState } from 'react';

export function Pauta1to1Tab() {
  const [copiedPauta, setCopiedPauta] = useState(false);

  const generatePautaMarkdown = () => {
    return `# Pauta de Acompanhamento 1:1 — João Reis (Birth Hub 360)
Data: 01/09/2026 | BDR ID: 392

## 1. Resumo Executivo de Desempenho
- **Leads Trabalhados**: 179 em Agosto (vs. 64 em Julho — crescimento de +179.7%)
- **Atividades Lançadas**: 530 em Agosto (Média de 25.2/dia útil vs. 9.3 em Julho)
- **Reuniões Agendadas**: 15 em Agosto (Déficit de taxa: 8.4% vs 25.0% em Julho)
- **Receita Ganha**: R$ 363,20 (+101.8% de crescimento em negócios próprios)
- **Win Rate de Deals**: 71.4% (5 ganhos de 7 fechados)

## 2. Status dos Gargalos Operacionais
- [x] **Estoque Em Cadência**: 130 leads mapeados (55 parados > 30d — plano de corte em andamento).
- [x] **SLA de 1º Contato**: Mediana reduzida de 17.7 dias em Julho para 3.5 dias em Agosto.
- [ ] **Padronização de Registro**: Em transição de "Contatar cliente" genérico para tags reais ([WhatsApp], [Ligação], [E-mail]).
- [ ] **Carimbo no CRM**: Exigência de marcar "Reunião Realizada" ou "No-Show" no próprio dia.

## 3. Qualidade em Calls (Feedback de Transcrições Meet)
- **Pontos Fortes**: Rapport excelente, pesquisa prévia do lead e honestidade comercial.
- **Plano de Ajuste**: Qualificar frota nos primeiros 3 minutos de call e controlar tempo de fala.

## 4. Compromissos para os Próximos 7 Dias
1. Aumentar densidade diária para 60+ toques/dia usando o checklist operacional.
2. Limpar os 8 leads novos sem atividade.
3. Carimbar 100% das reuniões agendadas pós-call.`;
  };

  const copyPautaToClipboard = () => {
    navigator.clipboard.writeText(generatePautaMarkdown());
    setCopiedPauta(true);
    setTimeout(() => setCopiedPauta(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-card-lg border border-line bg-surface shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-ink flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand" />
              Pauta de Acompanhamento 1:1 — João Reis &amp; Gestor
            </h3>
            <p className="text-xs text-ink-2">
              Relatório executivo formatado pronto para apresentação na reunião individual de
              alinhamento.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyPautaToClipboard}
              className="px-4 py-2.5 rounded-xl bg-brand-active text-on-brand font-bold text-xs shadow-md hover:brightness-105 transition-colors cursor-pointer flex items-center gap-2"
            >
              {copiedPauta ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedPauta ? 'Copiado!' : 'Copiar Pauta (Markdown)'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2.5 rounded-xl border border-line bg-surface-2 text-ink-2 font-bold text-xs hover:text-ink transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-line bg-surface-2 font-mono text-xs text-ink leading-relaxed space-y-4 whitespace-pre-wrap select-all">
          {generatePautaMarkdown()}
        </div>
      </div>
    </div>
  );
}
