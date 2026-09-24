import { PhoneNumber } from "../value-objects/PhoneNumber.js";

export type LeadStatus =
  | "pending" // aguardando a primeira tentativa ou uma nova tentativa
  | "in_progress" // existe uma ligação em andamento para este lead agora
  | "contacted" // conectado com sucesso (agente falou com o lead)
  | "exhausted" // esgotou o número máximo de tentativas sem sucesso
  | "do_not_call" // está na lista de não perturbe / opt-out
  | "invalid_number"; // telefone inválido, nunca discado

export interface LeadProps {
  id: string;
  campaignId: string;
  name: string;
  phone: PhoneNumber;
  status: LeadStatus;
  attempts: number;
  /** Só relevante quando status === "pending" após uma tentativa falha (retentativa agendada). */
  nextAttemptAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Lead {
  private constructor(private props: LeadProps) {}

  static create(input: {
    id: string;
    campaignId: string;
    name: string;
    phone: PhoneNumber;
    now?: Date;
  }): Lead {
    const now = input.now ?? new Date();
    return new Lead({
      id: input.id,
      campaignId: input.campaignId,
      name: input.name,
      phone: input.phone,
      status: "pending",
      attempts: 0,
      nextAttemptAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: LeadProps): Lead {
    return new Lead(props);
  }

  get id(): string {
    return this.props.id;
  }

  get campaignId(): string {
    return this.props.campaignId;
  }

  get name(): string {
    return this.props.name;
  }

  get phone(): PhoneNumber {
    return this.props.phone;
  }

  get status(): LeadStatus {
    return this.props.status;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  get nextAttemptAt(): Date | null {
    return this.props.nextAttemptAt;
  }

  /** É elegível para uma nova tentativa agora, dado o limite máximo e o agendamento de retentativa. */
  isEligibleForDialing(maxAttempts: number, now: Date): boolean {
    if (this.props.status !== "pending") {
      return false;
    }
    if (this.props.attempts >= maxAttempts) {
      return false;
    }
    if (this.props.nextAttemptAt !== null && this.props.nextAttemptAt > now) {
      return false;
    }
    return true;
  }

  markInProgress(now = new Date()): void {
    this.props.status = "in_progress";
    this.props.updatedAt = now;
  }

  markContacted(now = new Date()): void {
    this.props.status = "contacted";
    this.props.updatedAt = now;
  }

  /**
   * Devolve o lead para a fila de pendentes sem contar como uma tentativa
   * real e sem aplicar backoff — usado quando uma reserva é desfeita por um
   * motivo de infraestrutura (ex: corrida entre dois processos do motor de
   * discagem disputando o mesmo DN de agente), não por uma ligação que de
   * fato ocorreu e falhou. Ver `AgentDnConflictError`.
   */
  releaseClaim(now = new Date()): void {
    this.props.status = "pending";
    this.props.updatedAt = now;
  }

  /**
   * Registra uma tentativa sem sucesso (não atendeu, ocupado, agente indisponível etc.).
   * Decide, com base em `maxAttempts`, se o lead volta para a fila (com backoff)
   * ou se é marcado como esgotado.
   */
  registerFailedAttempt(options: {
    maxAttempts: number;
    retryBackoffMinutes: number;
    now?: Date;
  }): void {
    const now = options.now ?? new Date();
    this.props.attempts += 1;
    this.props.updatedAt = now;

    if (this.props.attempts >= options.maxAttempts) {
      this.props.status = "exhausted";
      this.props.nextAttemptAt = null;
      return;
    }

    this.props.status = "pending";
    this.props.nextAttemptAt = new Date(now.getTime() + options.retryBackoffMinutes * 60_000);
  }

  markDoNotCall(now = new Date()): void {
    this.props.status = "do_not_call";
    this.props.nextAttemptAt = null;
    this.props.updatedAt = now;
  }

  toProps(): LeadProps {
    return { ...this.props };
  }
}
