# Fase 5 - Scheduler HOT/WARM/COLD Completo

## Objetivo
Atender ao item final da auditoria (`ldr-fase-0-auditoria.md`) de implementar priorização nas filas do motor LDR, fazendo com que o worker não fique reprocessando as mesmas contas inativamente.

## Alterações Realizadas
1. **accountIntelligenceInsights.worker.ts**: 
   - Modificada a rotina de descoberta de contas (`scanAndGenerateAccountInsights`).
   - Removida a seleção "cega" (`take: 50`) de empresas que fazia com que o worker sempre re-processasse os primeiros IDs.
   - Implementada a divisão por faixas de Lookalike Score (prioridades) com backoff adaptativo baseado na última geração de snapshots:
     - **HOT**: Score >= 80, atualizado se `snapshot` for mais antigo que 1 hora.
     - **WARM**: Score 50 a 79, atualizado se `snapshot` for mais antigo que 12 horas.
     - **COLD**: Score < 50 ou null, atualizado se `snapshot` for mais antigo que 7 dias.
   - Contas são varridas sequencialmente preenchendo as vagas por prioridade (até o limite original de 50 por organização) em lote.
2. **Nenhum bypass não autorizado**: Foi preservada a regra de segurança do arquivo original, sem ignorar as regras da RLS para `Company` durante a obtenção da fila prioritária.

## Status
**Concluído**. O LDR Account Intelligence Scheduler agora é 100% autônomo e priorizado, atendendo ao último item pendente do "Go-Live".
