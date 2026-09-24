/**
 * Ciclo de vida interno de uma tentativa de ligação.
 *
 * Este enum é próprio da aplicação — NÃO é o valor bruto de `status` que a
 * 3CX devolve nos endpoints de `participants`. A tradução do status bruto
 * da 3CX para este enum é feita por um mapeador explícito na camada de
 * infraestrutura (ver `ThreeCxDialerProvider`), porque a documentação
 * pública da 3CX não fixa os valores possíveis desse campo — eles devem
 * ser conferidos contra a própria instância antes de ir para produção.
 */
export type CallAttemptStatus =
  | "dialing" // makecall foi enviado para o ramal do agente
  | "ringing_agent" // ramal do agente está tocando
  | "connected" // agente atendeu e foi conectado ao lead
  | "completed" // ligação terminou após conexão bem-sucedida
  | "no_answer" // agente (ou lead) não atendeu dentro do timeout
  | "busy" // ramal do agente ou número do lead estava ocupado
  | "agent_unavailable" // nenhum ramal de agente livre no momento do ciclo
  | "failed"; // erro de API / rejeição da 3CX

export const TERMINAL_CALL_ATTEMPT_STATUSES: readonly CallAttemptStatus[] = [
  "completed",
  "no_answer",
  "busy",
  "agent_unavailable",
  "failed",
];

export interface CallAttemptProps {
  id: string;
  leadId: string;
  campaignId: string;
  agentDn: string;
  status: CallAttemptStatus;
  /** id de correlação retornado pela 3CX (participant id / callid), quando disponível. */
  providerCallId: string | null;
  startedAt: Date;
  endedAt: Date | null;
}

export class CallAttempt {
  private constructor(private props: CallAttemptProps) {}

  static start(input: {
    id: string;
    leadId: string;
    campaignId: string;
    agentDn: string;
    now?: Date;
  }): CallAttempt {
    return new CallAttempt({
      id: input.id,
      leadId: input.leadId,
      campaignId: input.campaignId,
      agentDn: input.agentDn,
      status: "dialing",
      providerCallId: null,
      startedAt: input.now ?? new Date(),
      endedAt: null,
    });
  }

  static restore(props: CallAttemptProps): CallAttempt {
    return new CallAttempt(props);
  }

  get id(): string {
    return this.props.id;
  }

  get leadId(): string {
    return this.props.leadId;
  }

  get agentDn(): string {
    return this.props.agentDn;
  }

  get status(): CallAttemptStatus {
    return this.props.status;
  }

  get providerCallId(): string | null {
    return this.props.providerCallId;
  }

  get isTerminal(): boolean {
    return TERMINAL_CALL_ATTEMPT_STATUSES.includes(this.props.status);
  }

  attachProviderCallId(providerCallId: string): void {
    this.props.providerCallId = providerCallId;
  }

  updateStatus(status: CallAttemptStatus, now = new Date()): void {
    this.props.status = status;
    if (TERMINAL_CALL_ATTEMPT_STATUSES.includes(status)) {
      this.props.endedAt = now;
    }
  }

  toProps(): CallAttemptProps {
    return { ...this.props };
  }
}
