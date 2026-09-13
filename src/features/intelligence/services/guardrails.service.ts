import { prisma } from '../../../lib/prisma.js';
import { getTenantId } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger.js';

const CPF_REGEX = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
// AIAGENT-006 (docs/audits/repository-debt-audit/agents/AIAGENT.md): o guard original só
// reconhecia CPF formatado — CNPJ, CPF sem pontuação, e-mail e telefone passavam sem redação.
// Cada padrão abaixo tem seu próprio rótulo de máscara; a ordem de aplicação importa apenas para
// legibilidade do texto final, nunca para correção (os padrões não se sobrepõem: os grupos com
// pontuação nunca formam 11 dígitos consecutivos, então não colidem com CPF_UNFORMATTED_REGEX).
const CNPJ_REGEX = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;
// CPF sem pontuação (11 dígitos "soltos") é inerentemente ambíguo com um telefone BR sem
// formatação (DDD + 9 dígitos = 11 dígitos também) — na dúvida, redige como PII de qualquer
// forma; a precisão do rótulo importa menos do que nunca deixar o dado vazar.
const CPF_UNFORMATTED_REGEX = /\b\d{11}\b/g;
const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
// Exige um separador literal (parênteses, espaço, ponto ou traço) entre o DDD e o restante do
// número — nunca casa uma sequência de dígitos pura. Sem essa exigência, a flexibilidade interna
// do padrão (DDD opcionalmente com "9" + 4 ou 8 dígitos) permite "deslizar" dentro de uma
// sequência numérica mais longa sem relação com telefone (ex.: um CPF sem pontuação de 11
// dígitos), casando só um pedaço dela e deixando dígitos residuais fora da máscara — a sequência
// pura de 11 dígitos já é coberta, sem essa ambiguidade, por `CPF_UNFORMATTED_REGEX` acima.
const PHONE_REGEX = /(?:\(\d{2}\)\s?|(?:\+55\s?)?\d{2}[\s.-])9?\d{4}-\d{4}/g;

const PII_PATTERNS: Array<{ regex: RegExp; mask: string }> = [
  { regex: CPF_REGEX, mask: '[CPF OCULTADO]' },
  { regex: CNPJ_REGEX, mask: '[CNPJ OCULTADO]' },
  { regex: EMAIL_REGEX, mask: '[E-MAIL OCULTADO]' },
  { regex: PHONE_REGEX, mask: '[TELEFONE OCULTADO]' },
  { regex: CPF_UNFORMATTED_REGEX, mask: '[CPF OCULTADO]' },
];

/**
 * Passo de pós-processamento aplicado a toda saída de IA antes de devolvê-la ao usuário: mascara
 * PII (CPF, CNPJ, e-mail, telefone) que a IA eventualmente tenha alucinado ou copiado do contexto
 * (a Atlas lida com dados de contato reais no CRM, e conteúdo gerado nunca deveria expor esse
 * dado em texto livre).
 */
export function redactSensitiveData(text: string): { text: string; redacted: boolean } {
  let result = text;
  let redacted = false;
  for (const { regex, mask } of PII_PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(result)) {
      regex.lastIndex = 0;
      result = result.replace(regex, mask);
      redacted = true;
    }
  }
  return { text: result, redacted };
}

/**
 * AI-006 (onda 35): mesmo passo de `redactSensitiveData`, mas registra um `AIGuardrailEvent`
 * (`type: 'pii_redacted'`) quando de fato houve algo para mascarar — o sinal real que alimenta a
 * dimensão "PII leakage rate" do harness de avaliação (evaluationMetrics.service.ts). Os 4 pontos
 * de chamada de produção deste guardrail (ai.service.ts, studio/shared.ts, agent.routes.ts,
 * CommercialIntelligenceAiService.ts) devem usar esta função, não `redactSensitiveData` direto,
 * para que o metrics não fique cego a vazamentos reais que o guardrail já está prevenindo.
 *
 * Best-effort de propósito: se a própria gravação do evento falhar, a redação em si (o que importa
 * para o usuário) já aconteceu — perder só o sinal de telemetria não deveria derrubar a resposta.
 */
async function trackPiiRedactionEvent(source: string): Promise<void> {
  const organizationId = getTenantId();
  if (!organizationId) {
    // Nenhum ponto de chamada real roda fora de uma requisição autenticada hoje — se isso
    // mudar no futuro, o evento fica sem tenant para atribuir e é melhor não registrar (RLS
    // exige organizationId não-nulo neste model) do que inventar um dono.
    logger.warn(
      { source },
      'PII redigida fora de um contexto de tenant conhecido — evento de guardrail não registrado.',
    );
    return;
  }

  try {
    await prisma.aIGuardrailEvent.create({
      data: { type: 'pii_redacted', source, organizationId },
    });
  } catch (err) {
    logger.warn(
      { err, source, organizationId },
      'Falha ao registrar evento de guardrail de PII (a redação em si já aconteceu).',
    );
  }
}

export async function redactAndTrackPiiLeak(text: string, source: string): Promise<string> {
  const { text: redactedText, redacted } = redactSensitiveData(text);
  if (!redacted) return redactedText;
  await trackPiiRedactionEvent(source);
  return redactedText;
}

/**
 * Tamanho máximo entre todos os padrões mascarados por `redactSensitiveData` — governa quantos
 * caracteres o buffer de streaming abaixo precisa reter (ver seu comentário). CPF/CNPJ/telefone
 * têm tamanho fixo (o maior é o telefone com DDI: "+55 (11) 91234-5678", 20 caracteres); e-mail
 * não tem tamanho fixo (RFC 5321 permite endereço até 254 caracteres), então usamos esse teto
 * como o pior caso — reter até 254 caracteres de cauda é irrelevante frente ao tamanho normal de
 * uma resposta de IA em streaming (centenas a milhares de caracteres).
 */
export const MAX_PII_PATTERN_LENGTH = 254;

/**
 * Versão streaming-safe do guardrail acima: `redactAndTrackPiiLeak` só é seguro sobre uma
 * resposta já completa — aplicado direto sobre chunks avulsos de um stream, uma PII cujos
 * caracteres caem em chunks diferentes do provedor passaria batida.
 *
 * `push()` NUNCA roda `redactSensitiveData` sobre os últimos `MAX_PII_PATTERN_LENGTH` caracteres
 * do buffer (a "borda" ainda em crescimento) — só sobre o prefixo antes dela. Isso não é só para
 * capturar um padrão cujos caracteres cheguem espalhados entre chunks (o motivo óbvio): é
 * necessário porque um padrão de tamanho VARIÁVEL (e-mail: domínio/TLD sem tamanho fixo) tem
 * prefixos que já parecem uma ocorrência completa e válida por si só — testar a borda antes de
 * mais contexto chegar já mascararia esse prefixo como se fosse o valor inteiro, e os caracteres
 * do restante do e-mail (que ainda não tinham chegado) sairiam DEPOIS da máscara em texto puro
 * (bug real encontrado durante a implementação: "maria.silva@exemplo.co" já é um match válido de
 * e-mail sozinho, antes de ".br" terminar de chegar). Um match só é considerado definitivo quando
 * está inteiramente fora dessa borda — ou seja, quando já existem pelo menos
 * `MAX_PII_PATTERN_LENGTH` caracteres de contexto confirmado depois dele, mais do que o maior
 * padrão suportado poderia ocupar, então nenhum chunk futuro poderia tê-lo estendido. Um match que
 * comece dentro do prefixo seguro mas termine dentro da borda (ex.: um CPF de tamanho fixo cujos
 * últimos dígitos ainda não confirmaram-se fora da borda) simplesmente não casa ainda nesta
 * chamada — ele permanece intacto no buffer (dentro da borda retida) e é reavaliado, já com mais
 * contexto, na próxima chamada a `push()` ou em `flush()`, quando a borda tiver avançado o
 * suficiente para incluí-lo por inteiro no prefixo seguro. `flush()` roda a mesma
 * `redactSensitiveData` sobre o que sobrou ao final do stream, sem essa restrição — não há mais
 * chunk futuro que poderia estender nada.
 */
export function createStreamingRedactor(source: string) {
  let buffer = '';
  let redactedAny = false;

  function push(chunk: string): string {
    buffer += chunk;
    if (buffer.length <= MAX_PII_PATTERN_LENGTH) return '';
    const safeLength = buffer.length - MAX_PII_PATTERN_LENGTH;
    const { text: release, redacted } = redactSensitiveData(buffer.slice(0, safeLength));
    if (redacted) redactedAny = true;
    buffer = buffer.slice(safeLength);
    return release;
  }

  async function flush(): Promise<string> {
    const { text, redacted } = redactSensitiveData(buffer);
    if (redacted) redactedAny = true;
    buffer = '';
    if (redactedAny) await trackPiiRedactionEvent(source);
    return text;
  }

  return { push, flush };
}

export interface PiiToken {
  token: string;
  value: string;
}

/**
 * Substitui, no texto que sairá para um provedor de IA externo (Groq/OpenAI),
 * valores de PII conhecidos (hoje: nome do contato) por um token estável. Diferente de
 * `redactSensitiveData`, isso não descarta o dado — ele é devolvido para reidratação,
 * porque ferramentas como rascunho de e-mail/WhatsApp legitimamente precisam do nome
 * real do contato no texto final entregue ao usuário humano. O que muda é que o
 * provedor de IA nunca vê o valor real durante a geração do conteúdo.
 */
export function minimizePii(
  text: string,
  values: Array<{ token: string; value: string | null | undefined }>,
): { text: string; applied: PiiToken[] } {
  let minimized = text;
  const applied: PiiToken[] = [];
  for (const { token, value } of values) {
    if (!value) continue;
    const trimmed = value.trim();
    // Evita substituir strings curtas demais (ex.: nome de 1-2 letras), que
    // aumentam o risco de substituição indevida de texto não relacionado à PII.
    if (trimmed.length < 3) continue;
    if (minimized.includes(trimmed)) {
      minimized = minimized.split(trimmed).join(token);
      applied.push({ token, value: trimmed });
    }
  }
  return { text: minimized, applied };
}

/**
 * Restaura, na resposta da IA, os valores reais nos tokens de PII aplicados por `minimizePii`.
 */
export function rehydratePii(text: string, applied: PiiToken[]): string {
  let result = text;
  for (const { token, value } of applied) {
    result = result.split(token).join(value);
  }
  return result;
}

export class GuardrailsService {
  validateOutput(text: string): boolean {
    return !redactSensitiveData(text).redacted;
  }
}

/**
 * A verificação de base legal LGPD (`hasPiiExternalConsent`/`assertPiiExternalConsent`/
 * `PiiConsentRequiredError`) foi promovida pra `src/shared/services/aiPiiConsent.service.ts`
 * (Onda 43) — mais de um módulo vertical precisa do mesmo gate antes de enviar PII a um provedor
 * de IA externo (hoje `intelligence` e `integrations/whatsapp`), e importar deste arquivo (dentro
 * de `features/intelligence/`) violaria `no-cross-feature-imports`. Reexportado aqui para não
 * quebrar os imports já existentes dentro de `intelligence/`.
 *
 * Deliberadamente diferente de `minimizePii`: minimizar troca o valor real por um token ANTES de
 * ele sair, mas o token continua sendo dado pseudonimizado do MESMO titular (reversível via
 * `rehydratePii`, então não é "anonimização" para efeito da LGPD) — ainda é tratamento de dado
 * pessoal, e precisa de base legal registrada mesmo quando a string que cruza a rede nunca contém
 * o nome/e-mail/telefone reais. Minimização decide O QUE sai; o gate decide SE pode sair.
 */
export {
  hasPiiExternalConsent,
  assertPiiExternalConsent,
  PiiConsentRequiredError,
} from '../../../shared/services/aiPiiConsent.service.js';
