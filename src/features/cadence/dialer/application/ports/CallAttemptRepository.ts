import type { CallAttempt } from "../../domain/entities/CallAttempt.js";

/**
 * Lançado por `save()` quando a implementação detecta que outro processo já
 * reservou o mesmo DN de agente com uma tentativa não-terminal concorrente
 * (ver índice único parcial `uq_call_attempts_active_agent_dn`, migration
 * 002). `findBusyAgentDns()` é apenas uma pré-checagem otimista — em mais de
 * um processo rodando `RunDialerCycle` ao mesmo tempo, dois processos podem
 * ler o mesmo DN como livre antes que qualquer um dos dois grave sua
 * tentativa. Este erro é a garantia autoritativa (a nível de banco) que
 * fecha essa corrida; `DialNextBatch` o captura e devolve o lead à fila.
 */
export class AgentDnConflictError extends Error {
  constructor(public readonly agentDn: string) {
    super(`DN ${agentDn} já possui uma tentativa de ligação ativa (corrida entre processos)`);
    this.name = "AgentDnConflictError";
  }
}

export interface CallAttemptRepository {
  /** @throws {AgentDnConflictError} quando outro processo já reservou o mesmo `agentDn`. */
  save(attempt: CallAttempt): Promise<void>;
  findById(id: string): Promise<CallAttempt | null>;
  /** Tentativas ainda não terminais (em andamento), usadas para consultar status na 3CX. */
  findInProgress(campaignId: string): Promise<CallAttempt[]>;
  /** DNs de agente atualmente ocupados com alguma tentativa não terminal, entre qualquer campanha. */
  findBusyAgentDns(): Promise<Set<string>>;
}
