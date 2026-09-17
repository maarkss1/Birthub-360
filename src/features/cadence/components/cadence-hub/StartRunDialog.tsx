import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { leadsDB } from '../../../../lib/db';
import { toast } from '../../../../lib/toast';
import type { Lead } from '../../../../types';
import { type CadenceSequenceDTO, cadenceApi } from '../../cadence.api';
import { leadLabel } from './types';

export function StartRunDialog({
  isOpen,
  onClose,
  onStarted,
}: {
  isOpen: boolean;
  onClose: () => void;
  onStarted: () => void;
}) {
  const [leadId, setLeadId] = useState('');
  const [sequenceId, setSequenceId] = useState('');
  const [sequences, setSequences] = useState<CadenceSequenceDTO[] | null>(null);
  const [loadingSequences, setLoadingSequences] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Busca de lead por nome/empresa como atalho — antes só existia um campo de texto livre pedindo
  // pra colar o cuid do lead, que ninguém sabe de cor (achado do Piloto 016). O E2E oficial
  // (`tests/e2e/cadence.spec.ts`) já automatiza `getByLabel('ID do lead').fill(leadId)` direto —
  // por isso o campo continua sendo o próprio `leadId` (mesmo id/label/comportamento de sempre), só
  // com uma lista de sugestões por baixo que, ao clicar, preenche esse mesmo campo.
  const [leadResults, setLeadResults] = useState<Lead[]>([]);
  const [leadSearchLoading, setLeadSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!isOpen || !showResults || leadId.trim().length < 2) {
      setLeadResults([]);
      return;
    }
    let cancelled = false;
    setLeadSearchLoading(true);
    const timer = window.setTimeout(() => {
      leadsDB
        .list({ search: leadId, limit: 6 })
        .then((res) => {
          if (!cancelled) setLeadResults(res.data);
        })
        .catch(() => {
          if (!cancelled) setLeadResults([]);
        })
        .finally(() => {
          if (!cancelled) setLeadSearchLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [leadId, isOpen, showResults]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingSequences(true);
    cadenceApi
      .sequences()
      .then((result) => {
        if (!cancelled) {
          setSequences(result);
          if (result[0]) setSequenceId(result[0].id);
        }
      })
      .catch(
        (err) =>
          !cancelled &&
          toast.error((err as Error).message || 'Não foi possível carregar as sequências.'),
      )
      .finally(() => !cancelled && setLoadingSequences(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!leadId.trim() || !sequenceId) {
      toast.error('Informe o lead e escolha uma sequência.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await cadenceApi.startRun({ leadId: leadId.trim(), sequenceId });
      toast.success(`Cadência "${result.sequenceName}" iniciada para o lead.`);
      setLeadId('');
      onStarted();
      onClose();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível iniciar a cadência.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Iniciar cadência para um lead"
      preventClose={submitting}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !sequences || sequences.length === 0}
          >
            {submitting ? 'Iniciando…' : 'Iniciar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <label htmlFor="run-lead-id" className="block text-xs font-semibold text-ink-2 mb-1">
            ID do lead
          </label>
          <input
            id="run-lead-id"
            type="text"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            onFocus={() => setShowResults(true)}
            onBlur={() => window.setTimeout(() => setShowResults(false), 150)}
            placeholder="Cole o ID do lead ou busque por nome/empresa"
            autoComplete="off"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          {leadSearchLoading && (
            <div className="absolute right-3 top-9">
              <Loader2 className="w-4 h-4 animate-spin text-ink-2" />
            </div>
          )}
          {showResults && leadResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-surface border border-line rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {leadResults.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => {
                    setLeadId(lead.id);
                    setShowResults(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-2 transition-colors border-b border-line last:border-b-0"
                >
                  {leadLabel(lead)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="run-sequence" className="block text-xs font-semibold text-ink-2 mb-1">
            Sequência
          </label>
          {loadingSequences ? (
            <Skeleton className="h-9 w-full" />
          ) : !sequences || sequences.length === 0 ? (
            <p className="text-xs text-ink-2">
              Nenhuma sequência criada ainda — crie uma primeiro em &ldquo;Nova sequência&rdquo;.
            </p>
          ) : (
            <select
              id="run-sequence"
              value={sequenceId}
              onChange={(e) => setSequenceId(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {sequences.map((seq) => (
                <option key={seq.id} value={seq.id}>
                  {seq.name} ({seq.touches.length} toque{seq.touches.length === 1 ? '' : 's'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </Dialog>
  );
}
