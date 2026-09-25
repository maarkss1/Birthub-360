import type {
  DialerProvider,
  OriginateCallInput,
  OriginateCallResult,
  CallStatusSnapshot,
} from "../../application/ports/DialerProvider.js";
import type { CallAttemptStatus } from "../../domain/entities/CallAttempt.js";
import type { ThreeCxCallControlClient } from "./ThreeCxCallControlClient.js";

export interface MinimalLogger {
  warn(obj: Record<string, unknown>, msg: string): void;
}

const noopLogger: MinimalLogger = { warn: () => undefined };

/**
 * Tabela de tradução do `status` bruto da 3CX (string livre, não documentada
 * oficialmente) para o nosso enum interno `CallAttemptStatus`. Ajuste esta
 * tabela depois de inspecionar respostas reais do seu PBX — o comparador é
 * "contém" (case-insensitive), não igualdade exata, para tolerar pequenas
 * variações entre versões da 3CX.
 */
const STATUS_KEYWORD_MAP: ReadonlyArray<readonly [string, CallAttemptStatus]> = [
  ["dial", "dialing"],
  ["ring", "ringing_agent"],
  ["talk", "connected"],
  ["connect", "connected"],
  ["busy", "busy"],
  ["fail", "failed"],
  ["error", "failed"],
];

export class ThreeCxDialerProvider implements DialerProvider {
  constructor(
    private readonly client: ThreeCxCallControlClient,
    private readonly logger: MinimalLogger = noopLogger,
  ) {}

  async originateCall(input: OriginateCallInput): Promise<OriginateCallResult> {
    const { httpStatus, body } = await this.client.makeCall({
      dn: input.agentDn,
      destination: input.destination,
      timeoutSeconds: input.timeoutSeconds,
      attachedData: { discadorAttemptId: input.correlationId },
    });

    if (body === null) {
      return { accepted: false, providerCallId: null, reason: `http_${httpStatus}` };
    }

    const callId = body.result?.callid;
    const providerCallId = typeof callId === "number" && Number.isFinite(callId)
      ? String(callId)
      : null;

    return { accepted: true, providerCallId };
  }

  async getActiveCallStatuses(agentDns: readonly string[]): Promise<CallStatusSnapshot[]> {
    const snapshots: CallStatusSnapshot[] = [];

    for (const dn of agentDns) {
      const participants = await this.client.getParticipants(dn);
      const current = participants[0];
      if (current === undefined) {
        continue;
      }

      snapshots.push({
        agentDn: dn,
        providerCallId: String(current.callid),
        status: this.mapParticipantStatus(current.status),
      });
    }

    return snapshots;
  }

  private mapParticipantStatus(rawStatus: string): CallAttemptStatus {
    const normalized = rawStatus.toLowerCase();
    for (const [keyword, mapped] of STATUS_KEYWORD_MAP) {
      if (normalized.includes(keyword)) {
        return mapped;
      }
    }

    this.logger.warn(
      { rawStatus },
      "Status de participante da 3CX não mapeado — tratando como 'ringing_agent'. " +
        "Ajuste STATUS_KEYWORD_MAP em ThreeCxDialerProvider.",
    );
    return "ringing_agent";
  }
}
