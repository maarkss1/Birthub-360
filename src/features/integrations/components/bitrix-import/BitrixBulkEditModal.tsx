import { Download, Edit3, Flame, Loader2, Sparkles } from 'lucide-react';
import { Dialog } from '../../../../components/ui/Dialog';

export function BitrixBulkEditModal({
  isOpen,
  onClose,
  selectedCount,
  bulkTemperature,
  setBulkTemperature,
  importing,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  bulkTemperature: 'Frio' | 'Morno' | 'Quente';
  setBulkTemperature: (t: 'Frio' | 'Morno' | 'Quente') => void;
  importing: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => onClose()}
      maxWidth="max-w-md"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-soft text-brand-ink dark:text-brand flex items-center justify-center font-bold">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-base font-bold text-ink">
              Editar em Lote ({selectedCount} itens)
            </span>
            <span className="block text-[11px] font-normal text-ink-2">
              Defina os parâmetros padrão de importação.
            </span>
          </div>
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={() => onClose()}
            className="px-4 py-2.5 text-xs font-bold text-ink-2 hover:bg-surface-2 rounded-2xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={importing}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-brand-active to-brand-2 hover:brightness-110 text-on-brand text-xs font-bold rounded-2xl shadow-md shadow-brand-active/20 transition-colors disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Aplicar & Importar ({selectedCount})
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <span id="bulk-temperature-label" className="block text-xs font-bold text-ink mb-2">
            Temperatura Inicial do Lead no Birth Hub 360
          </span>
          {/* Toolbar de botões toggle (não campos de formulário) — <fieldset> não traria
                    ganho real de acessibilidade aqui, só estilo. */}
          {/* biome-ignore lint/a11y/useSemanticElements: ver comentário acima */}
          <div
            role="group"
            aria-labelledby="bulk-temperature-label"
            className="grid grid-cols-3 gap-2"
          >
            {(['Frio', 'Morno', 'Quente'] as const).map((temp) => (
              <button
                key={temp}
                type="button"
                onClick={() => setBulkTemperature(temp)}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-2xl border transition-colors ${
                  bulkTemperature === temp
                    ? 'bg-gradient-to-r from-brand-active to-brand-2 text-on-brand border-brand-active shadow-md shadow-brand-active/20'
                    : 'bg-surface-2 border-line text-ink hover:bg-line'
                }`}
              >
                <Flame
                  className={`w-3.5 h-3.5 ${temp === 'Quente' ? 'text-red-400' : temp === 'Morno' ? 'text-amber-400' : 'text-blue-400'}`}
                />
                {temp}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-line">
          {/* SEC/UX (achado de auditoria): este controle disparava até 100 ligações reais via
                   provedor pago (Bland AI/Birthub Voices) sem nenhuma proteção de volume — a opção
                   nunca foi de fato conectada ao backend (o usuário configurava, recebia toast de
                   sucesso, e nenhuma ligação saía). Em vez de ligar isso silenciosamente numa
                   correção de bug (decisão de produto/custo/compliance que exige throttling
                   dedicado, não algo para decidir aqui), o controle fica desabilitado e honesto até
                   ter uma implementação própria — qualificação por voz individual já funciona (ver
                   o lead importado no CRM). */}
          <div className="flex items-start gap-3 p-3.5 bg-surface-2 border border-line rounded-2xl opacity-70">
            <input
              type="checkbox"
              checked={false}
              disabled
              aria-label="Qualificar via Voz — ainda não disponível para importação em lote"
              className="w-4 h-4 rounded border-line mt-0.5 cursor-not-allowed"
            />
            <div>
              <span className="block text-xs font-bold text-ink-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Qualificar via Voz — em breve
              </span>
              <span className="block text-[11px] text-ink-2 mt-0.5">
                Disparo em lote ainda não está disponível. Depois de importado, você pode qualificar
                cada lead individualmente pela ficha dele no CRM.
              </span>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
