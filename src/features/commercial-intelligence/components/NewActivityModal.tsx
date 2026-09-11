import type React from 'react';
import { useId, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { SoundFX } from '../../../lib/soundEffects';
import type { DailyPlanItemChannel } from '../../../shared/contracts/dailyPlan.contract';
import { commercialIntelligenceApi } from '../commercialIntelligence.api';

interface NewActivityModalProps {
  open: boolean;
  onClose: () => void;
  /** Chamado após a criação bem-sucedida, para o Plano Diário do chamador recarregar. */
  onCreated: () => void;
}

// Extraído de DailyPlanHub.tsx (ver check-hotspots.ts / HOTSPOT_EXCEPTIONS.md) — formulário de
// criação de atividade é autocontido (estado + submit próprios), sem acoplamento com o resto do
// painel além de "recarregar o plano depois de criar".
export function NewActivityModal({ open, onClose, onCreated }: NewActivityModalProps) {
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState<DailyPlanItemChannel>('CALL');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [dueTime, setDueTime] = useState('14:00');
  const [observations, setObservations] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const formId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setIsCreating(true);
      await commercialIntelligenceApi.createDailyPlanActivity({
        title,
        channel,
        contactName: contact || undefined,
        phone: phone || undefined,
        dueTime: dueTime || undefined,
        observations: observations || undefined,
      });
      SoundFX.play('success');
      setTitle('');
      setContact('');
      setPhone('');
      setObservations('');
      onClose();
      onCreated();
    } catch (err) {
      console.error('Erro ao criar atividade:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title="Nova Atividade no Plano Diário"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={isCreating} disabled={!title.trim()}>
            {isCreating ? 'Criando...' : 'Salvar & Sincronizar'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label htmlFor="activity-title" className="block font-bold text-ink mb-1">
            Título da Atividade *
          </label>
          <input
            id="activity-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Ligação de qualificação - TransLog"
            className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="activity-channel" className="block font-bold text-ink mb-1">
              Canal
            </label>
            <select
              id="activity-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as DailyPlanItemChannel)}
              className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
            >
              <option value="CALL">Ligação</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="MEETING">Reunião</option>
              <option value="EMAIL">E-mail</option>
              <option value="TASK">Tarefa Bitrix</option>
            </select>
          </div>
          <div>
            <label htmlFor="activity-duetime" className="block font-bold text-ink mb-1">
              Horário Previsto
            </label>
            <input
              id="activity-duetime"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="activity-contact" className="block font-bold text-ink mb-1">
              Contato / Decisor
            </label>
            <input
              id="activity-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Nome do cliente"
              className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label htmlFor="activity-phone" className="block font-bold text-ink mb-1">
              Telefone
            </label>
            <input
              id="activity-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <div>
          <label htmlFor="activity-obs" className="block font-bold text-ink mb-1">
            Observações Iniciais
          </label>
          <textarea
            id="activity-obs"
            rows={2}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Instruções ou contexto do lead..."
            className="w-full px-3 py-2 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:border-brand"
          />
        </div>
      </form>
    </Dialog>
  );
}

export default NewActivityModal;
