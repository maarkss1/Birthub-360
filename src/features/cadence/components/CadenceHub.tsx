import { Play, Plus, Repeat, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { hasRequiredRole } from '../../../lib/auth/authorization';
import { CadenceRunsSection } from './cadence-hub/CadenceRunsSection';
import { JourneyTemplatesDialog } from './cadence-hub/JourneyTemplatesDialog';
import { NewSequenceDialog } from './cadence-hub/NewSequenceDialog';
import { OptOutsSection } from './cadence-hub/OptOutsSection';
import { SequencesSection } from './cadence-hub/SequencesSection';
import { StartRunDialog } from './cadence-hub/StartRunDialog';
import { CADENCE_WRITE_ROLES } from './cadence-hub/types';

export {
  CADENCE_WRITE_ROLES,
  CHANNEL_LABEL,
  formatDateTime,
  leadLabel,
  ORIGIN_LABEL,
  runStatusBadgeVariant,
  SCOPE_LABEL,
  STATUS_FILTERS,
  STATUS_LABEL,
  STOP_REASON_LABEL,
  scopeBadgeVariant,
  stopReasonBadgeVariant,
  TOUCH_RESULT_LABEL,
  touchResultBadgeVariant,
} from './cadence-hub/types';

export function CadenceHub() {
  const { currentUser } = useAuth();
  // Mesmo achado de RBAC do Piloto 017 (Playbook): o botão de encerrar sequência só some pra quem
  // já não pode escrever neste módulo (mesmas `writeRoles` do backend) — a rota já protege de
  // verdade, isto é só não mostrar uma ação que resultaria em 403.
  const canManage = !!currentUser && hasRequiredRole(currentUser.role, CADENCE_WRITE_ROLES);
  const [runsKey, setRunsKey] = useState(0);
  const [sequencesKey, setSequencesKey] = useState(0);
  const [newSequenceOpen, setNewSequenceOpen] = useState(false);
  const [startRunOpen, setStartRunOpen] = useState(false);
  const [journeyTemplatesOpen, setJourneyTemplatesOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto bg-bg text-ink p-6 md:p-8 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2 tracking-tight">
              <Repeat className="w-5 h-5 text-brand" aria-hidden="true" />
              Cadência & Ciclo de Receita
            </h1>
            <p className="text-sm text-ink-2 max-w-2xl">
              Opt-outs unificados por lead/canal, detecção inteligente de resposta (Reply Tracking)
              e o estado real de cada sequência multicanal em andamento.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setJourneyTemplatesOpen(true)}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Modelos de Jornada
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewSequenceOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Nova sequência
            </Button>
            <Button type="button" size="sm" onClick={() => setStartRunOpen(true)}>
              <Play className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Iniciar cadência
            </Button>
          </div>
        </header>

        {/*
          Chaves com prefixo de propósito: as duas seções são irmãs e os dois contadores começam
          em 0 (e voltam a coincidir sempre que só um deles é incrementado) — `key={runsKey}` e
          `key={sequencesKey}` puros colidiam ("Encountered two children with the same key"), e o
          React deixava cópias antigas de CadenceRunsSection no DOM a cada remontagem (achado real
          reproduzido pelo cadence.spec.ts: três filtros "Encerrada" na mesma página).
        */}
        <CadenceRunsSection key={`runs-${runsKey}`} />
        <SequencesSection key={`sequences-${sequencesKey}`} canManage={canManage} />
        <OptOutsSection />
      </div>

      <JourneyTemplatesDialog
        isOpen={journeyTemplatesOpen}
        onClose={() => setJourneyTemplatesOpen(false)}
        onCreated={() => {
          setRunsKey((k) => k + 1);
          setSequencesKey((k) => k + 1);
        }}
      />
      <NewSequenceDialog
        isOpen={newSequenceOpen}
        onClose={() => setNewSequenceOpen(false)}
        onCreated={() => {
          setRunsKey((k) => k + 1);
          setSequencesKey((k) => k + 1);
        }}
      />
      <StartRunDialog
        isOpen={startRunOpen}
        onClose={() => setStartRunOpen(false)}
        onStarted={() => setRunsKey((k) => k + 1)}
      />
    </div>
  );
}
