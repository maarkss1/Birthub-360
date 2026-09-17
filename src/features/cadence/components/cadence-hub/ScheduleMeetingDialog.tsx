import { useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { toast } from '../../../../lib/toast';
import { cadenceApi } from '../../cadence.api';

export function ScheduleMeetingDialog({
  leadId,
  isOpen,
  onClose,
}: {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStart('');
    setEnd('');
  };

  const handleSubmit = async () => {
    if (!leadId || !start || !end) {
      toast.error('Informe o início e o fim da reunião.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await cadenceApi.scheduleMeeting(leadId, {
        proposedStart: new Date(start).toISOString(),
        proposedEnd: new Date(end).toISOString(),
      });
      toast.success(
        result.meetUrl
          ? 'Reunião confirmada com Google Meet — convite enviado ao lead por e-mail.'
          : 'Reunião confirmada e registrada no calendário.',
      );
      reset();
      onClose();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível registrar a reunião.');
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
      title="Agendar reunião confirmada"
      preventClose={submitting}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Registrando…' : 'Confirmar reunião'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-2">
          Use somente após confirmação verbal/escrita real do lead — esta ação registra a reunião
          como confirmada manualmente e cria o evento no calendário.
        </p>
        <div>
          <label htmlFor="meeting-start" className="block text-xs font-semibold text-ink-2 mb-1">
            Início
          </label>
          <input
            id="meeting-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="meeting-end" className="block text-xs font-semibold text-ink-2 mb-1">
            Fim
          </label>
          <input
            id="meeting-end"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </div>
      </div>
    </Dialog>
  );
}
