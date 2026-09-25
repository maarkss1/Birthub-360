import type { CampaignRepository } from "../ports/CampaignRepository.js";
import type { CallAttemptRepository } from "../ports/CallAttemptRepository.js";
import type { DialerProvider } from "../ports/DialerProvider.js";
import type { CallingHoursPolicy } from "../../domain/policies/CallingHoursPolicy.js";
import type { SyncCallStatuses } from "./SyncCallStatuses.js";
import type { DialNextBatch } from "./DialNextBatch.js";

export interface RunDialerCycleConfig {
  agentDns: readonly string[];
  callTimeoutSeconds: number;
  maxAttempts: number;
  retryBackoffMinutes: number;
}

export interface RunDialerCycleReport {
  ranAt: Date;
  skippedReason: "outside_calling_hours" | "no_active_campaigns" | null;
  campaignsProcessed: number;
  totalDialed: number;
  totalRejectedImmediately: number;
  /** Ver `DialNextBatchResult.dnConflicts`. Só é diferente de zero com mais de um processo rodando o ciclo. */
  totalDnConflicts: number;
}

/**
 * Um "tick" do motor de discagem. Pensado para ser chamado periodicamente
 * por um agendador simples (ver `interface/scheduler/dialerLoop.ts`).
 *
 * Ordem das operações, a cada ciclo:
 *  1. Verifica a janela de horário permitido.
 *  2. Busca campanhas ativas.
 *  3. Consulta o provedor UMA vez para todo o pool de DNs (evita N chamadas
 *     redundantes quando há várias campanhas ativas).
 *  4. Para cada campanha ativa: reconcilia tentativas em andamento e, com a
 *     capacidade de DNs livres que sobrar, dispara novas ligações.
 *
 * `freeAgentDns` (passo 4) é calculado a partir de uma leitura de
 * `findBusyAgentDns()` — uma pré-checagem otimista, não um lock. Isso é
 * seguro mesmo com múltiplos processos rodando este ciclo ao mesmo tempo
 * (escalando horizontalmente) porque a reserva real acontece de forma
 * atômica mais abaixo, em duas camadas independentes:
 *  - `LeadRepository.claimNextEligible` usa `SELECT ... FOR UPDATE SKIP
 *    LOCKED` para nunca deixar dois processos reservarem o mesmo lead;
 *  - um índice único parcial em `call_attempts` garante, a nível de banco,
 *    que nunca existam duas tentativas não-terminais para o mesmo DN — se
 *    dois processos disputarem o mesmo DN, o segundo recebe
 *    `AgentDnConflictError` (ver `DialNextBatch`) e libera o lead de volta
 *    para a fila, sem duplicar a ligação nem consumir uma tentativa.
 */
export class RunDialerCycle {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly callAttemptRepository: CallAttemptRepository,
    private readonly dialerProvider: DialerProvider,
    private readonly callingHoursPolicy: CallingHoursPolicy,
    private readonly syncCallStatuses: SyncCallStatuses,
    private readonly dialNextBatch: DialNextBatch,
    private readonly config: RunDialerCycleConfig,
  ) {}

  async execute(now = new Date()): Promise<RunDialerCycleReport> {
    const baseReport = {
      ranAt: now,
      campaignsProcessed: 0,
      totalDialed: 0,
      totalRejectedImmediately: 0,
      totalDnConflicts: 0,
    };

    if (!this.callingHoursPolicy.isAllowedAt(now)) {
      return { ...baseReport, skippedReason: "outside_calling_hours" };
    }

    const activeCampaigns = await this.campaignRepository.findActive();
    if (activeCampaigns.length === 0) {
      return { ...baseReport, skippedReason: "no_active_campaigns" };
    }

    const snapshots = await this.dialerProvider.getActiveCallStatuses(this.config.agentDns);

    let totalDialed = 0;
    let totalRejectedImmediately = 0;
    let totalDnConflicts = 0;

    for (const campaign of activeCampaigns) {
      await this.syncCallStatuses.execute(campaign.id, snapshots, now);

      const busyAgentDns = await this.callAttemptRepository.findBusyAgentDns();
      const freeAgentDns = this.config.agentDns.filter((dn) => !busyAgentDns.has(dn));

      const batchResult = await this.dialNextBatch.execute(campaign, freeAgentDns, now);
      totalDialed += batchResult.dialed;
      totalRejectedImmediately += batchResult.rejectedImmediately;
      totalDnConflicts += batchResult.dnConflicts;
    }

    return {
      ...baseReport,
      skippedReason: null,
      campaignsProcessed: activeCampaigns.length,
      totalDialed,
      totalRejectedImmediately,
      totalDnConflicts,
    };
  }
}
