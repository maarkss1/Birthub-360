import { randomUUID } from "node:crypto";
import { CallAttempt } from "../../domain/entities/CallAttempt.js";
import type { Campaign } from "../../domain/entities/Campaign.js";
import type { LeadRepository } from "../ports/LeadRepository.js";
import { AgentDnConflictError, type CallAttemptRepository } from "../ports/CallAttemptRepository.js";
import type { DialerProvider } from "../ports/DialerProvider.js";

export interface DialNextBatchConfig {
  callTimeoutSeconds: number;
  maxAttempts: number;
  retryBackoffMinutes: number;
}

export interface DialNextBatchResult {
  dialed: number;
  rejectedImmediately: number;
  /**
   * Reservas desfeitas porque outro processo do motor de discagem já havia
   * reservado o mesmo DN de agente entre a leitura de `freeAgentDns` e a
   * gravação da tentativa (ver `AgentDnConflictError`). Não conta como
   * tentativa falha do lead — ele volta para a fila imediatamente.
   */
  dnConflicts: number;
}

export class DialNextBatch {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly callAttemptRepository: CallAttemptRepository,
    private readonly dialerProvider: DialerProvider,
    private readonly config: DialNextBatchConfig,
  ) {}

  async execute(
    campaign: Campaign,
    freeAgentDns: readonly string[],
    now = new Date(),
  ): Promise<DialNextBatchResult> {
    const result: DialNextBatchResult = { dialed: 0, rejectedImmediately: 0, dnConflicts: 0 };

    if (freeAgentDns.length === 0) {
      return result;
    }

    // `claimNextEligible` já marca e persiste os leads como "in_progress"
    // atomicamente (ver LeadRepository) — não é preciso um markInProgress +
    // save() manual aqui.
    const leads = await this.leadRepository.claimNextEligible(campaign.id, now, freeAgentDns.length);

    for (let index = 0; index < leads.length; index += 1) {
      const lead = leads[index];
      const agentDn = freeAgentDns[index];
      if (lead === undefined || agentDn === undefined) {
        continue;
      }

      const attempt = CallAttempt.start({
        id: randomUUID(),
        leadId: lead.id,
        campaignId: campaign.id,
        agentDn,
        now,
      });

      try {
        await this.callAttemptRepository.save(attempt);
      } catch (error) {
        if (error instanceof AgentDnConflictError) {
          // `freeAgentDns` era uma pré-checagem otimista; outro processo
          // reservou este DN entre essa leitura e agora. Devolve o lead à
          // fila sem penalizar a contagem de tentativas e segue para o
          // próximo par lead/DN.
          lead.releaseClaim(now);
          await this.leadRepository.save(lead);
          result.dnConflicts += 1;
          continue;
        }
        throw error;
      }

      const originationResult = await this.dialerProvider.originateCall({
        agentDn,
        destination: lead.phone.toE164(),
        timeoutSeconds: this.config.callTimeoutSeconds,
        correlationId: attempt.id,
      });

      if (!originationResult.accepted) {
        attempt.updateStatus("failed", now);
        await this.callAttemptRepository.save(attempt);
        lead.registerFailedAttempt({
          maxAttempts: this.config.maxAttempts,
          retryBackoffMinutes: this.config.retryBackoffMinutes,
          now,
        });
        await this.leadRepository.save(lead);
        result.rejectedImmediately += 1;
        continue;
      }

      if (originationResult.providerCallId !== null) {
        attempt.attachProviderCallId(originationResult.providerCallId);
        await this.callAttemptRepository.save(attempt);
      }

      result.dialed += 1;
    }

    return result;
  }
}
