import type { StudioGenerationRequest } from '../schema.js';
import { roleplayEvaluationResultSchema, roleplayResultSchema } from '../schema.js';
import { invokeStructured, jsonOnlyInstruction, SYSTEM_RULES } from '../shared.js';

// Cada persona tem um "jeito de falar" além da motivação — é isso que faz o comprador soar como
// uma pessoa real ao telefone, não uma categoria de CRM lendo um resumo de cargo. O papel/descrição
// específicos (ex.: "Diretor de Logística & Supply") continuam vindo de playbookContext; isto aqui
// é só a camada de tom de voz do arquétipo amplo.
const PERSONA_LABELS = {
  skeptical_cfo:
    'CFO cético, orientado a ROI, risco e custo total — fala pausado e direto, sem rodeios, pé no chão, vai reto ao número que importa',
  strict_buyer:
    'comprador rigoroso, orientado a condições comerciais e comparação — questiona bastante, compara com concorrentes de cabeça, um pouco impaciente com enrolação',
  tech_director:
    'diretor técnico, orientado a segurança, arquitetura e implantação — curioso e entra em detalhes técnicos, mas cauteloso antes de se empolgar',
} as const;

const DIFFICULTY_LABELS = {
  facil: 'fácil',
  medio: 'médio',
  dificil: 'difícil',
} as const;

export async function generateRoleplay(
  request: Extract<StudioGenerationRequest, { kind: 'roleplay' }>,
) {
  const prompt = `${SYSTEM_RULES}

Simule um comprador B2B para treinar um SDR da ${request.brand.name}.
Contexto da marca: ${request.brand.description}
Persona: ${PERSONA_LABELS[request.inputs.persona]}
Contexto de playbook (use como referência, não como fato comprovado):
${request.inputs.playbookContext || 'Nenhum contexto específico disponível.'}

Histórico da conversa:
${JSON.stringify(request.inputs.transcript, null, 2)}

Última resposta do SDR:
${request.inputs.message}

Gere uma réplica realista do comprador, sem encerrar a conversa cedo e sem inventar números.
Fale como uma pessoa real numa ligação de telefone, não como um e-mail formal ou um resumo
corporativo: frases curtas, contrações naturais do português falado ("tá", "pra", "né" quando
fizer sentido), e reação de verdade ao que o SDR acabou de dizer antes de seguir em frente — nunca
recite de volta o que ele já falou. Varie o tamanho da resposta como uma conversa de verdade varia:
às vezes uma frase só ("Hmm, faz sentido."), às vezes mais longa quando o assunto pede. Deixe a
emoção da persona e da dificuldade configurada aparecer sem exagero (ceticismo, impaciência,
curiosidade genuína, cansaço — o que couber). Termine a maior parte das respostas com uma pergunta
real ou uma objeção concreta, do jeito que um comprador ocupado faria, não com uma lista de tópicos.
Avalie somente a última resposta do SDR: clareza considera objetividade e compreensão; tratamento
de objeção considera escuta, validação da preocupação e próxima pergunta. Use notas inteiras de 0 a
100 (por exemplo, 6 de 10 deve ser retornado como 60). As notas são estimativas pedagógicas, não
métricas objetivas.
${jsonOnlyInstruction('{"reply":"string","feedback":"feedback curto e acionável","clarity":70,"objectionHandling":60}')}`;
  const result = await invokeStructured(
    prompt,
    'studio:roleplay',
    roleplayResultSchema,
    '{"reply":"string","feedback":"string","clarity":70,"objectionHandling":60}',
    0.6,
  );
  const clarity = result.clarity <= 10 ? result.clarity * 10 : result.clarity;
  const objectionHandling =
    result.objectionHandling <= 10 ? result.objectionHandling * 10 : result.objectionHandling;
  return {
    ...result,
    clarity,
    objectionHandling,
    total: Math.round((clarity + objectionHandling) / 2),
  };
}

/**
 * Parecer técnico da LIGAÇÃO COMPLETA (não de um turno isolado) — chamada de IA dedicada, disparada
 * ao final da chamada em RoleplayHub.finishCall. Antes, "ao final da conversa" só calculava a média
 * local dos turnos (clarity/objectionHandling já avaliados turno a turno pelo generateRoleplay
 * acima); isso nunca lia rapport, progressão da qualificação nem tentativa de fechamento ao longo
 * da conversa inteira — só uma média aritmética.
 */
export async function generateRoleplayEvaluation(
  request: Extract<StudioGenerationRequest, { kind: 'roleplay_evaluation' }>,
) {
  const prompt = `${SYSTEM_RULES}

Você é um Diretor Comercial e Coach de Vendas B2B sênior. Avalie o desempenho completo de um SDR
numa ligação de vendas simulada (roleplay) para a ${request.brand.name}.
Contexto da marca: ${request.brand.description}
Persona do comprador simulado: ${PERSONA_LABELS[request.inputs.persona]}
Dificuldade configurada da persona: ${DIFFICULTY_LABELS[request.inputs.difficulty]}

Critérios de avaliação (nesta ordem de peso):
1. Rapport e escuta ativa (o SDR ouviu a dor antes de apresentar produto?).
2. Investigação de dores e perguntas abertas (metodologia SPIN/consultiva).
3. Contorno de objeções levantadas pelo comprador durante a ligação.
4. Firmeza no fechamento / definição de um próximo passo concreto.

Transcrição completa da ligação (sdr = vendedor treinando, buyer = comprador simulado pela IA):
${JSON.stringify(request.inputs.transcript, null, 2)}

Avalie a ligação inteira, não apenas a última resposta. Use notas inteiras de 0 a 100 (estimativas
pedagógicas, não métricas objetivas). "strengths" e "improvements" devem citar momentos concretos da
transcrição, nunca elogio/crítica genérica. "summary" é o parecer técnico em si: um parágrafo direto
com o diagnóstico geral e o plano de ação prático para a próxima ligação.
${jsonOnlyInstruction(
  '{"overallScore":70,"clarityScore":70,"objectionHandlingScore":65,"closingScore":55,"strengths":["string"],"improvements":["string"],"summary":"string"}',
)}`;

  const result = await invokeStructured(
    prompt,
    'studio:roleplay_evaluation',
    roleplayEvaluationResultSchema,
    '{"overallScore":70,"clarityScore":70,"objectionHandlingScore":65,"closingScore":55,"strengths":["string"],"improvements":["string"],"summary":"string"}',
    0.3,
  );
  return result;
}
