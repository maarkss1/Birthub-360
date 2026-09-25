import type { CallAttemptStatus } from "../../domain/entities/CallAttempt.js";

export interface OriginateCallInput {
  /** Ramal (DN) do agente que a 3CX vai chamar primeiro. */
  agentDn: string;
  /** Número do lead em E.164, ex: "+5511987654321". */
  destination: string;
  /** Timeout em segundos que a 3CX aguarda o agente atender. */
  timeoutSeconds: number;
  /** Usado para correlacionar o participante criado com nossa tentativa interna. */
  correlationId: string;
}

export interface OriginateCallResult {
  /** true quando a 3CX aceitou o pedido (200/202); false em rejeição imediata. */
  accepted: boolean;
  /** id de correlação da 3CX (callid/legid ou participant id), quando disponível de imediato. */
  providerCallId: string | null;
  reason?: string;
}

export interface CallStatusSnapshot {
  agentDn: string;
  providerCallId: string;
  status: CallAttemptStatus;
}

/**
 * Porta que a camada de aplicação usa para originar e monitorar ligações.
 * A implementação concreta (3CX) fica em `infrastructure/threecx`, o que
 * permite trocar de provedor de PABX sem tocar nas regras de negócio, e
 * permite testar o motor de discagem com um fake em memória.
 */
export interface DialerProvider {
  originateCall(input: OriginateCallInput): Promise<OriginateCallResult>;

  /**
   * Retorna o estado atual de todas as chamadas em andamento nos DNs informados.
   * Usado pelo motor de discagem para descobrir quando um agente atendeu,
   * quando a ligação com o lead conectou, ou quando terminou.
   */
  getActiveCallStatuses(agentDns: readonly string[]): Promise<readonly CallStatusSnapshot[]>;
}
