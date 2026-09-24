import type { CallAttempt } from "../../domain/entities/CallAttempt.js";
import type { Lead } from "../../domain/entities/Lead.js";
import type { CallAttemptRepository } from "../ports/CallAttemptRepository.js";
import type { LeadRepository } from "../ports/LeadRepository.js";
import type { CallStatusSnapshot } from "../ports/DialerProvider.js";

export interface SyncCallStatusesConfig {
  maxAttempts: number;
  retryBackoffMinutes: number;
}

/**
 * A cada ciclo, recebe o estado atual das ligações ativas no provedor (3CX)
 * — já consultado uma única vez por `RunDialerCycle` para todo o pool de
 * DNs, evitando N chamadas redundantes à API quando há várias campanhas
 * ativas — e reconcilia com o nosso registro interno:
 *  - atualiza o status da tentativa quando o provedor reporta algo novo;
 *  - quando uma tentativa some da lista de ligações ativas do provedor,
 *    considera que ela terminou — e decide sucesso/fracasso pelo último
 *    status conhecido (ex: chegou a "connected" -> sucesso).
 *
 * Cada DN de agente só pode ter uma tentativa não-terminal por vez neste
 * design, então a correlação entre tentativa <-> chamada do provedor é
 * feita pelo DN, o que evita depender de o provedor devolver sempre um
 * `providerCallId` estável (a 3CX nem sempre devolve um id imediatamente
 * — ver notas em `ThreeCxDialerProvider`).
 */
export class SyncCallStatuses {
  constructor(
    private readonly callAttemptRepository: CallAttemptRepository,
    private readonly leadRepository: LeadRepository,
    private readonly config: SyncCallStatusesConfig,
  ) {}

  async execute(
    campaignId: string,
    snapshots: readonly CallStatusSnapshot[],
    now = new Date(),
  ): Promise<void> {
    const inProgress = await this.callAttemptRepository.findInProgress(campaignId);
    if (inProgress.length === 0) {
      return;
    }

    const snapshotByDn = new Map(snapshots.map((snapshot) => [snapshot.agentDn, snapshot]));

    for (const attempt of inProgress) {
      const snapshot = snapshotByDn.get(attempt.agentDn);

      if (snapshot !== undefined) {
        if (snapshot.providerCallId !== attempt.providerCallId) {
          attempt.attachProviderCallId(snapshot.providerCallId);
        }
        if (snapshot.status !== attempt.status) {
          attempt.updateStatus(snapshot.status, now);
        }
        await this.callAttemptRepository.save(attempt);
        continue;
      }

      // A tentativa não aparece mais como ativa no provedor: encerrou.
      const finalStatus = attempt.status === "connected" ? "completed" : "no_answer";
      attempt.updateStatus(finalStatus, now);
      await this.callAttemptRepository.save(attempt);
      await this.finalizeLead(attempt, now);
    }
  }

  private async finalizeLead(attempt: CallAttempt, now: Date): Promise<void> {
    const lead = await this.leadRepository.findById(attempt.leadId);
    if (lead === null) {
      return;
    }

    this.applyOutcomeToLead(lead, attempt, now);
    await this.leadRepository.save(lead);
  }

  private applyOutcomeToLead(lead: Lead, attempt: CallAttempt, now: Date): void {
    if (attempt.status === "completed") {
      lead.markContacted(now);
      return;
    }

    lead.registerFailedAttempt({
      maxAttempts: this.config.maxAttempts,
      retryBackoffMinutes: this.config.retryBackoffMinutes,
      now,
    });
  }
}
