// Extraído de CallAnalysisReport.tsx pra ser reusado também por RoleplayHistoryPanel.tsx — mesmos
// limiares, duas variantes de contraste conforme o fundo onde a nota é exibida.

/** Cor sólida (não gradiente) — a cor aqui É o sinal da nota (boa/média/ruim), não decoração. Sem
 * sufixo `-active`/`dark:`: só use sobre uma superfície SEMPRE escura (ex.: bg-gray-900,
 * independente do tema do resto do app) — mesmo raciocínio documentado em Badge.tsx: "no escuro a
 * cor crua já passa". */
export function scoreTextClass(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 45) return 'text-warning';
  return 'text-danger';
}

/** Mesmos limiares de scoreTextClass, mas para uso sobre `bg-surface`/`bg-surface-2` (superfícies
 * que REAGEM ao tema — claras por padrão). A cor crua ali repete o problema real já documentado em
 * DQA-19 (texto de baixo contraste sobre fundo claro) — mesma variante `-active`/`dark:` já usada
 * nos blocos "O que funcionou"/"Dicas" de CallAnalysisReport.tsx. */
export function scoreTextClassOnSurface(score: number): string {
  if (score >= 75) return 'text-success-active dark:text-success';
  if (score >= 45) return 'text-warning-active dark:text-warning';
  return 'text-danger-active dark:text-danger';
}
