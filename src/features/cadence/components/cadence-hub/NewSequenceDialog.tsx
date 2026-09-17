import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { toast } from '../../../../lib/toast';
import { type CadenceChannel, type CadenceTouchInput, cadenceApi } from '../../cadence.api';
import { CHANNEL_LABEL } from './types';

const CHANNEL_OPTIONS: CadenceChannel[] = ['email', 'whatsapp', 'voice'];
const EMPTY_TOUCH: CadenceTouchInput = {
  order: 1,
  channel: 'email',
  delayHoursFromPrevious: 0,
  templateRef: '',
};

export function NewSequenceDialog({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [touches, setTouches] = useState<CadenceTouchInput[]>([{ ...EMPTY_TOUCH }]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName('');
    setDescription('');
    setTouches([{ ...EMPTY_TOUCH }]);
  };

  const addTouch = () => {
    setTouches((prev) => [...prev, { ...EMPTY_TOUCH, order: prev.length + 1 }]);
  };

  const removeTouch = (index: number) => {
    setTouches((prev) =>
      prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, order: i + 1 })),
    );
  };

  const updateTouch = (index: number, patch: Partial<CadenceTouchInput>) => {
    setTouches((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Dê um nome para a sequência.');
      return;
    }
    if (touches.some((t) => !t.templateRef?.trim())) {
      toast.error('Toda mensagem precisa de conteúdo — nenhum toque pode ficar vazio.');
      return;
    }
    setSubmitting(true);
    try {
      await cadenceApi.createSequence({
        name: name.trim(),
        description: description.trim() || undefined,
        touches,
      });
      toast.success('Sequência criada.');
      reset();
      onCreated();
      onClose();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível criar a sequência.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) {
          reset();
          onClose();
        }
      }}
      title="Nova sequência de cadência"
      maxWidth="max-w-2xl"
      preventClose={submitting}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Criando…' : 'Criar sequência'}
          </Button>
        </>
      }
    >
      {/* Corpo só renderiza aberto — o <dialog> nativo não desmonta filhos ao fechar, e um
                <select> de canal sempre presente no DOM (mesmo fechado) colidiria com badges de
                canal renderizados em outras seções da mesma tela para queries de teste/a11y. */}
      {isOpen && (
        <div className="space-y-4">
          <div>
            <label htmlFor="sequence-name" className="block text-xs font-semibold text-ink-2 mb-1">
              Nome da sequência
            </label>
            <input
              id="sequence-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: E-mail → WhatsApp (follow-up padrão)"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </div>

          <div>
            <label
              htmlFor="sequence-description"
              className="block text-xs font-semibold text-ink-2 mb-1"
            >
              Descrição (opcional)
            </label>
            <textarea
              id="sequence-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Para que serve esta sequência e quando usá-la"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-2">
                Toques (na ordem em que disparam)
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addTouch}>
                <Plus className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Adicionar toque
              </Button>
            </div>
            {touches.map((touch, index) => (
              <div key={index} className="rounded-lg border border-line p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Toque {touch.order}</span>
                  {touches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTouch(index)}
                      aria-label={`Remover toque ${touch.order}`}
                      className="p-1 text-ink-2 hover:text-danger-active dark:hover:text-danger rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label
                      htmlFor={`touch-channel-${index}`}
                      className="block text-[11px] font-semibold text-ink-2 mb-1"
                    >
                      Canal
                    </label>
                    <select
                      id={`touch-channel-${index}`}
                      value={touch.channel}
                      onChange={(e) =>
                        updateTouch(index, { channel: e.target.value as CadenceChannel })
                      }
                      className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {CHANNEL_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {CHANNEL_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`touch-delay-${index}`}
                      className="block text-[11px] font-semibold text-ink-2 mb-1"
                    >
                      Horas após o anterior
                    </label>
                    <input
                      id={`touch-delay-${index}`}
                      type="number"
                      min={0}
                      max={720}
                      value={touch.delayHoursFromPrevious}
                      onChange={(e) =>
                        updateTouch(index, {
                          delayHoursFromPrevious: Math.min(
                            720,
                            Math.max(0, Number(e.target.value)),
                          ),
                        })
                      }
                      className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`touch-max-attempts-${index}`}
                      className="block text-[11px] font-semibold text-ink-2 mb-1"
                    >
                      Tentativas se falhar
                    </label>
                    <input
                      id={`touch-max-attempts-${index}`}
                      type="number"
                      min={1}
                      max={5}
                      value={touch.maxAttempts ?? 1}
                      onChange={(e) =>
                        updateTouch(index, {
                          maxAttempts: Math.min(5, Math.max(1, Number(e.target.value))),
                        })
                      }
                      className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor={`touch-content-${index}`}
                    className="block text-[11px] font-semibold text-ink-2 mb-1"
                  >
                    Conteúdo da mensagem (sem sistema de template ainda — é o texto final)
                  </label>
                  <textarea
                    id={`touch-content-${index}`}
                    value={touch.templateRef ?? ''}
                    onChange={(e) => updateTouch(index, { templateRef: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}
