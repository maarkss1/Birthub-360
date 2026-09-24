-- Migration 002: segurança de concorrência para permitir múltiplos processos
-- do motor de discagem rodando ao mesmo tempo (ver README, seção
-- "Limitações conhecidas" -> "Processo único").
--
-- Garante, em nível de banco, que nunca existam duas tentativas de ligação
-- não-terminais para o mesmo DN de agente ao mesmo tempo — fechando a corrida
-- entre o momento em que um processo lê "quais DNs estão livres"
-- (findBusyAgentDns) e o momento em que ele efetivamente insere uma nova
-- tentativa. Se dois processos tentarem reservar o mesmo DN nesse intervalo,
-- o segundo INSERT falha com unique_violation (23505) — tratado em
-- PgCallAttemptRepository.save como AgentDnConflictError e absorvido pela
-- aplicação (o lead correspondente volta para a fila sem consumir uma
-- tentativa, já que a falha é de infraestrutura, não da ligação em si).
CREATE UNIQUE INDEX IF NOT EXISTS uq_call_attempts_active_agent_dn
    ON call_attempts (agent_dn)
    WHERE status NOT IN ('completed', 'no_answer', 'busy', 'agent_unavailable', 'failed');
