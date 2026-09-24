// IA & Guardrails (CPI follow-up) — "Registrar modelo, temperatura, tokens e
// versão do prompt" para toda chamada de geração de IA.
//
// Decisão de design: log em memória (ring buffer) + console.log estruturado,
// em vez de uma tabela nova no Postgres (`activity_log`/`query_audit_logs`
// existentes cobrem outro tipo de auditoria - ações de negócio e SQL bruto,
// respectivamente). Motivos:
// 1. server/ai.ts hoje não depende de server/db.ts (nem de Postgres) - é um
//    módulo testável isoladamente (ver tests/ai.test.ts, que roda sem banco).
//    Fazer toda chamada de IA depender de uma conexão Postgres só para logar
//    acoplaria um módulo de geração de texto a infraestrutura de persistência
//    e tornaria os testes deste arquivo dependentes de mock de banco.
// 2. Em produção (Render), stdout/console já é coletado e consultável via
//    logs da plataforma (ver mcp Render list_logs) - console.log estruturado
//    aqui já é "log server-side" de fato, sem exigir uma migração de schema
//    para uma feature de observabilidade.
// Custo aceito: o buffer em memória não sobrevive a um restart do processo e
// não é consultável via SQL Explorer. Documentado como risco residual em
// docs/CPI_BACKLOG.md - promover para uma tabela dedicada (reaproveitando o
// padrão de server/db.ts `logActivity`) é um próximo passo natural se
// observabilidade histórica de custo/uso de IA virar requisito.

export type AiCallType = 'copies' | 'enrichment' | 'chat';

export interface AiGenerationLogEntry {
  callType: AiCallType;
  engine: string; // 'ollama' | 'groq' | 'gemini' | 'fallback_local'
  model: string | null;
  temperature: number | null;
  // Tokens do próprio provedor quando a resposta os expõe. `null` (nunca um
  // valor estimado/chutado) quando o provedor não devolveu a métrica -
  // Ollama/Groq/Gemini expõem contagens de forma diferente e nem sempre
  // presente; ver extractors abaixo.
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  promptVersion: string;
  personalizationLevel: 'low' | 'medium' | 'high' | null;
  success: boolean;
  error?: string;
  leadId?: string;
  timestamp: string;
}

const MAX_LOG_ENTRIES = 500;
const logBuffer: AiGenerationLogEntry[] = [];

export function recordAiGenerationLog(entry: Omit<AiGenerationLogEntry, 'timestamp'>): AiGenerationLogEntry {
  const fullEntry: AiGenerationLogEntry = { ...entry, timestamp: new Date().toISOString() };
  logBuffer.push(fullEntry);
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.splice(0, logBuffer.length - MAX_LOG_ENTRIES);
  }
  // eslint-disable-next-line no-console
  console.log('[ai-generation]', JSON.stringify(fullEntry));
  return fullEntry;
}

/** Só para inspeção/testes - não é a fonte de verdade de negócio nenhuma. */
export function getRecentAiGenerationLogs(limit = 50): AiGenerationLogEntry[] {
  return logBuffer.slice(-limit);
}

/** Usado só pelos testes, para isolar cada caso. */
export function clearAiGenerationLogs(): void {
  logBuffer.length = 0;
}

// --- Extractors honestos de contagem de tokens por provedor -----------------
// Cada um devolve `null` em vez de estimar quando o provedor não expõe a
// métrica - "log null, never a guess" (ver 18_AGENTE_IA_GUARDRAILS.txt e a
// tarefa desta wave).

export function extractOllamaTokenUsage(data: any): { promptTokens: number | null; completionTokens: number | null; totalTokens: number | null } {
  const promptTokens = typeof data?.prompt_eval_count === 'number' ? data.prompt_eval_count : null;
  const completionTokens = typeof data?.eval_count === 'number' ? data.eval_count : null;
  const totalTokens = promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null;
  return { promptTokens, completionTokens, totalTokens };
}

export function extractGroqTokenUsage(data: any): { promptTokens: number | null; completionTokens: number | null; totalTokens: number | null } {
  const usage = data?.usage;
  return {
    promptTokens: typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : null,
    completionTokens: typeof usage?.completion_tokens === 'number' ? usage.completion_tokens : null,
    totalTokens: typeof usage?.total_tokens === 'number' ? usage.total_tokens : null
  };
}

export function extractGeminiTokenUsage(response: any): { promptTokens: number | null; completionTokens: number | null; totalTokens: number | null } {
  const usage = response?.usageMetadata;
  return {
    promptTokens: typeof usage?.promptTokenCount === 'number' ? usage.promptTokenCount : null,
    completionTokens: typeof usage?.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : null,
    totalTokens: typeof usage?.totalTokenCount === 'number' ? usage.totalTokenCount : null
  };
}
