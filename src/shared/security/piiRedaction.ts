/**
 * Camada de detecção/redação rápida de PII (CPF/e-mail/telefone) via regex — determinística, sem
 * dependência de IA. Vive em `src/shared/security/` (mesmo lugar de `urlGuard.ts`/
 * `webhookReplayGuard.ts`) porque é consumida por mais de uma feature verticalmente distinta
 * (`features/lgpd/services/lgpd-sanitizer.service.ts`, camada rápida antes do passo de
 * anonimização via LLM para texto livre longo; `features/job-roles/services/memory.service.ts`,
 * PROMPT 9, único mecanismo de PII para fatos curtos e estruturados de memória — nunca depende do
 * LLM ali, porque memória não é transcrição livre). Composição entre features passa por
 * `src/shared/` (regra `no-cross-feature-imports` do dependency-cruiser) — nunca um import direto
 * de uma feature para dentro de outra.
 *
 * Instâncias de regex NOVAS a cada chamada (nunca compartilhadas com `lastIndex` residual entre
 * chamadas concorrentes).
 */
export interface ResidualPiiCheckResult {
  redactedText: string;
  detectedTypes: Array<'CPF' | 'Email' | 'Telefone'>;
}

export function redactResidualPii(text: string): ResidualPiiCheckResult {
  const detectedTypes: ResidualPiiCheckResult['detectedTypes'] = [];
  let redactedText = text;
  if (/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(redactedText)) {
    detectedTypes.push('CPF');
    redactedText = redactedText.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF REDIGIDO]');
  }
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(redactedText)) {
    detectedTypes.push('Email');
    redactedText = redactedText.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      '[EMAIL REDIGIDO]',
    );
  }
  if (/\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-.\s]?\d{4}\b/.test(redactedText)) {
    detectedTypes.push('Telefone');
    redactedText = redactedText.replace(
      /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-.\s]?\d{4}\b/g,
      '[TELEFONE REDIGIDO]',
    );
  }
  return { redactedText, detectedTypes };
}
