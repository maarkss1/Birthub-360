import { env } from '../../../../config/env';
import { GoogleGenAI } from '@google/genai';
import { AIConfig, Lead, DecisionMaker, OutreachCopies } from '../src/types';
import type { EvidenceRecord } from './evidence';
import {
  buildLeadEvidenceContext,
  computePersonalizationLevel,
  formatEvidenceContextForPrompt,
  PersonalizationLevel
} from './leadEvidenceContext';
import {
  safeParseJson,
  validateCopiesShape,
  validateEnrichmentShape,
  CopiesStringField
} from './aiSchemas';
import {
  recordAiGenerationLog,
  extractOllamaTokenUsage,
  extractGroqTokenUsage,
  extractGeminiTokenUsage
} from './aiGenerationLog';

// IA & Guardrails (CPI follow-up, pós Wave 0) — versão do prompt-base de
// outreach. Bump manual sempre que o TEXTO do prompt (system ou user) mudar
// de forma material - serve só para correlacionar, no log de geração
// (server/aiGenerationLog.ts), qual variante de prompt produziu qual saída.
// Não é validado automaticamente contra o texto real do prompt (isso exigiria
// hashear o prompt final, o que não foi considerado necessário para o volume
// atual de mudanças).
const AI_PROMPT_VERSION = 'guardrails-2026-08-26-v1';

// 18_AGENTE_IA_GUARDRAILS.txt, "PROMPT BASE DE OUTREACH" (texto da
// especificação, mantido em PT-BR e citado quase literalmente para não
// introduzir ambiguidade de tradução):
const ANTI_FABRICATION_GUARDRAIL = `REGRA CRÍTICA - USE APENAS O LeadEvidenceContext:
Use exclusivamente fatos presentes no CONTEXTO DE EVIDÊNCIAS CONFIRMADAS (LeadEvidenceContext) fornecido abaixo. Se uma informação não estiver presente nesse contexto, NÃO a mencione, mesmo que pareça uma suposição razoável.
Nunca crie estatísticas, notícias, nomes, cargos ou eventos que não estejam explicitamente listados no contexto.
Quando não houver personalização factual suficiente no contexto, produza uma abordagem GENÉRICA (sem inventar detalhes específicos da empresa ou do decisor) - o nível de personalização já foi calculado pelo backend a partir dos fatos reais disponíveis, não pela sua própria avaliação da resposta.`;

// Lazy init for Gemini
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export async function checkOllamaConnection(url: string, model: string = 'llama3') {
  const startTime = Date.now();
  try {
    const cleanUrl = url.replace(/\/$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${cleanUrl}/api/tags`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as any;
      const models = (data.models || []).map((m: any) => m.name);
      const latency = Date.now() - startTime;
      const modelFound = models.some((m: string) => m.toLowerCase().includes(model.toLowerCase()));

      return {
        online: true,
        latencyMs: latency,
        availableModels: models,
        hasRequestedModel: modelFound,
        message: `Ollama conectado em ${cleanUrl}. Modelos disponíveis: ${models.join(', ') || 'Nenhum'}`
      };
    } else {
      return {
        online: false,
        latencyMs: Date.now() - startTime,
        availableModels: [],
        hasRequestedModel: false,
        message: `Ollama respondeu com código ${response.status}`
      };
    }
  } catch (err: any) {
    return {
      online: false,
      latencyMs: Date.now() - startTime,
      availableModels: [],
      hasRequestedModel: false,
      message: `Não foi possível conectar ao Ollama em ${url}. (${err.message || 'Servidor offline'})`
    };
  }
}

export interface EngineCopiesResult {
  copies: OutreachCopies;
  engineUsed: string;
  // IA & Guardrails (CPI follow-up): calculado por computePersonalizationLevel
  // a partir do LeadEvidenceContext ANTES de chamar o LLM - nunca é o que o
  // próprio modelo diz sobre a resposta que ele gerou.
  personalization_level: PersonalizationLevel;
}

export async function generateCopiesWithEngine(
  lead: Lead,
  pitch: string,
  config: AIConfig,
  decisionMaker: DecisionMaker,
  storedEvidence: EvidenceRecord[] = []
): Promise<EngineCopiesResult> {
  const evidenceContext = buildLeadEvidenceContext(lead, decisionMaker, storedEvidence);
  const personalizationLevel = computePersonalizationLevel(evidenceContext);
  const evidenceBlock = formatEvidenceContextForPrompt(evidenceContext);

  const systemPrompt = `Você é um redator sênior especialista em Prospecção B2B Outbound de alta conversão para a Atlas (Segurança e Inteligência Logística).
Sua missão é gerar mensagens persuasivas, naturais, sem jargões robóticos, em Português Brasileiro (PT-BR), sob medida para o decisor e empresa alvo, usando somente os fatos fornecidos.
${ANTI_FABRICATION_GUARDRAIL}
Você DEVE responder ESTRITAMENTE em formato JSON com as chaves:
"cold_call", "cold_email", "whatsapp", "linkedin", "followup_strategy", "objection_matrix", "qualification_matrix", "ice_breaker".`;

  const userPrompt = `
CONTEXTO DE EVIDÊNCIAS CONFIRMADAS (LeadEvidenceContext) - use SOMENTE o que está listado aqui como fato sobre a empresa/decisor:
${evidenceBlock}

NÍVEL DE PERSONALIZAÇÃO FACTUAL DISPONÍVEL: ${personalizationLevel.toUpperCase()}${personalizationLevel === 'low' ? ' - poucos ou nenhum fato confirmado; gere uma abordagem GENÉRICA, sem inventar detalhes específicos da empresa ou do decisor.' : ''}

PROPOSTA DE VALOR / PITCH (Atlas):
"${pitch}"

Gere as abordagens comerciais:
1. cold_call: Roteiro objetivo para ligação com quebra de padrão, gancho situacional da operação (só se houver fato confirmado para isso), pergunta aberta sobre dor logística/segurança e CTA para conversa rápida de 10 min.
2. cold_email: Assunto provocativo e curto (até 5 palavras) + Corpo conciso (menos de 90 palavras) focado no ROI e segurança.
3. whatsapp: Mensagem direta, humana e amigável para envio rápido sem parecer mensagem automática.
4. linkedin: Nota de convite personalizada de conexão (até 280 caracteres) com gancho profissional.
5. followup_strategy: Dica prática de timing e canal de 2º contato.
6. objection_matrix: Uma matriz curta (2-3 objeções prováveis do lead e como rebatê-las usando segurança/logística).
7. qualification_matrix: Perguntas estratégicas cruciais (BANT ou SPIN) adaptadas para este cliente específico.
8. ice_breaker: Informação relevante e personalizada sobre a empresa ou a pessoa para iniciar a conversa (Ator quebra-gelo) - só se o contexto acima tiver fato suficiente; senão, use um quebra-gelo genérico sobre o setor.
`;

  // 1. If provider is Ollama
  if (config.provider === 'ollama') {
    const model = config.ollamaModel || 'llama3';
    const temperature = config.temperature || 0.7;
    try {
      const cleanUrl = (config.ollamaUrl || 'http://localhost:11434').replace(/\/$/, '');
      const response = await fetch(`${cleanUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          format: 'json',
          stream: false,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          options: { temperature }
        })
      });
      if (response.ok) {
        const data = await response.json() as any;
        const content = data.message?.content || '{}';
        const parseResult = safeParseJson(content);
        const tokenUsage = extractOllamaTokenUsage(data);
        if (parseResult.ok) {
          const shape = validateCopiesShape(parseResult.value);
          recordAiGenerationLog({
            callType: 'copies', engine: 'ollama', model, temperature, ...tokenUsage,
            promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: true,
            error: shape.invalidFields.length > 0
              ? `campo(s) com forma inválida descartado(s): ${shape.invalidFields.join(', ')}`
              : undefined,
            leadId: lead.id
          });
          return {
            copies: formatParsedCopies(shape.validFields, lead, decisionMaker),
            engineUsed: `Ollama (${model})`,
            personalization_level: personalizationLevel
          };
        }
        recordAiGenerationLog({
          callType: 'copies', engine: 'ollama', model, temperature, ...tokenUsage,
          promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: false,
          error: `JSON inválido: ${parseResult.error}`, leadId: lead.id
        });
      }
    } catch (err) {
      console.info('Ollama offline, acionando próximo motor...');
    }
  }

  // 2. If provider is Groq
  const effectiveGroqKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
  if (config.provider === 'groq' || (!config.groqApiKey && config.provider !== 'ollama' && config.provider !== 'gemini')) {
    const model = config.groqModel || 'llama-3.3-70b-versatile';
    const temperature = config.temperature || 0.7;
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveGroqKey}`
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          temperature,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        const content = data.choices?.[0]?.message?.content || '{}';
        const parseResult = safeParseJson(content);
        const tokenUsage = extractGroqTokenUsage(data);
        if (parseResult.ok) {
          const shape = validateCopiesShape(parseResult.value);
          recordAiGenerationLog({
            callType: 'copies', engine: 'groq', model, temperature, ...tokenUsage,
            promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: true,
            error: shape.invalidFields.length > 0
              ? `campo(s) com forma inválida descartado(s): ${shape.invalidFields.join(', ')}`
              : undefined,
            leadId: lead.id
          });
          return {
            copies: formatParsedCopies(shape.validFields, lead, decisionMaker),
            engineUsed: `Groq (${model})`,
            personalization_level: personalizationLevel
          };
        }
        recordAiGenerationLog({
          callType: 'copies', engine: 'groq', model, temperature, ...tokenUsage,
          promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: false,
          error: `JSON inválido: ${parseResult.error}`, leadId: lead.id
        });
      }
    } catch (err) {
      console.info('Groq offline, acionando próximo motor...');
    }
  }

  // 3. Fallback or Gemini engine
  const geminiModel = 'gemini-2.5-flash';
  const geminiTemperature = config.temperature || 0.7;
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: `${systemPrompt}\n\n${userPrompt}`,
      config: {
        responseMimeType: 'application/json',
        temperature: geminiTemperature
      }
    });
    const text = response.text || '{}';
    const parseResult = safeParseJson(text);
    const tokenUsage = extractGeminiTokenUsage(response);
    if (!parseResult.ok) {
      recordAiGenerationLog({
        callType: 'copies', engine: 'gemini', model: geminiModel, temperature: geminiTemperature, ...tokenUsage,
        promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: false,
        error: `JSON inválido: ${parseResult.error}`, leadId: lead.id
      });
      throw new Error(`Gemini respondeu JSON inválido: ${parseResult.error}`);
    }
    const shape = validateCopiesShape(parseResult.value);
    recordAiGenerationLog({
      callType: 'copies', engine: 'gemini', model: geminiModel, temperature: geminiTemperature, ...tokenUsage,
      promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: true,
      error: shape.invalidFields.length > 0
        ? `campo(s) com forma inválida descartado(s): ${shape.invalidFields.join(', ')}`
        : undefined,
      leadId: lead.id
    });
    return {
      copies: formatParsedCopies(shape.validFields, lead, decisionMaker),
      engineUsed: 'Gemini 2.5 Flash',
      personalization_level: personalizationLevel
    };
  } catch (err: any) {
    console.info('APIs externas com alta demanda, utilizando motor local determinístico (fallback).');
    recordAiGenerationLog({
      callType: 'copies', engine: 'fallback_local', model: null, temperature: null,
      promptTokens: null, completionTokens: null, totalTokens: null,
      promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: false,
      error: err?.message || 'todos os motores de IA indisponíveis ou responderam com formato inválido',
      leadId: lead.id
    });
    return {
      copies: generateFallbackCopies(lead, pitch, decisionMaker),
      engineUsed: 'Motor local (fallback fixo)',
      personalization_level: personalizationLevel
    };
  }
}

// Recebe SOMENTE campos já validados (ver validateCopiesShape em
// server/aiSchemas.ts) - nunca uma resposta de LLM crua. Um campo ausente ou
// descartado por forma inválida cai no texto determinístico de fallback,
// nunca em um valor coagido (ex: um objeto/número transformado em string).
function formatParsedCopies(parsed: Partial<Record<CopiesStringField, string>>, lead: Lead, dm: DecisionMaker): OutreachCopies {
  const dmRef = dm.name ? ` ${dm.name}` : '';
  return {
    cold_call: parsed.cold_call || `Olá${dmRef}, tudo bem? Sou da Atlas. Estou ligando pois notamos a relevância da operação da ${lead.name} e temos apoiado líderes como você a otimizar a segurança e gestão de risco. Teria 5 minutos para conversarmos?`,
    cold_email: parsed.cold_email || `Assunto: Gestão e Segurança - ${lead.name}\n\nOlá${dmRef},\n\nAcompanhamos a atuação da ${lead.name}. Na Atlas, atuamos lado a lado com gestores para reduzir custos de sinistro e garantir pontualidade logística com tecnologia de ponta.\n\nPodemos falar brevemente nesta semana?\n\nAtenciosamente,\nEquipe Atlas`,
    whatsapp: parsed.whatsapp || `Olá${dmRef}, como vai? Aqui é da Atlas Inteligência e Segurança Logística. Identifiquei sua atuação na ${lead.name} e gostaria de compartilhar um insight rápido sobre redução de riscos operacionais. Podemos conversar por aqui?`,
    linkedin: parsed.linkedin || `Olá${dmRef}! Muito bom ver seu trabalho na liderança da ${lead.name}. Conecto-me para trocarmos experiências sobre segurança, logística e tecnologia corporativa.`,
    followup_strategy: parsed.followup_strategy || 'Follow-up via WhatsApp em 48h caso o e-mail não tenha retorno.',
    objection_matrix: parsed.objection_matrix || '1. Tá caro. R: Nosso foco é ROI; evitamos um sinistro que cobre meses de operação.\n2. Já temos rastreamento. R: Nós integramos inteligência e pronta resposta de ponta a ponta, não apenas rastreamos.',
    qualification_matrix: parsed.qualification_matrix || '1. Como vocês lidam com as perdas logísticas hoje?\n2. Qual é a sua atual tecnologia de gerenciamento de risco?\n3. Qual o volume atual da sua operação mensal?',
    ice_breaker: parsed.ice_breaker || `Notei o crescimento da ${lead.name} e como vocês têm expandido as operações recentemente.`,
    approach_prompt: parsed.approach_prompt || `Você é o SDR da Atlas falando com o decisor da ${lead.name}. Seu foco: conduzir uma conversa consultiva destacando segurança preditiva, redução de sinistralidade e otimização de apólices.`
  };
}

function generateFallbackCopies(lead: Lead, pitch: string, dm: DecisionMaker): OutreachCopies {
  const dmRef = dm.name ? ` ${dm.name}` : '';
  const dmRoleRef = dm.title ? ` como ${dm.title}` : '';
  return {
    cold_call: `[Roteiro Atlas Cold Call]\n"Olá${dmRef}, tudo bem? Aqui é da Atlas (Segurança e Inteligência Logística). O motivo do meu contato é direto: estamos apoiando frotas e operações como a da ${lead.name} a blindar seus processos contra sinistros e prejuízos operacionais. Você teria 10 minutos na quinta-feira para avaliarmos se nossos modelos preditivos fazem sentido para sua malha?"`,
    cold_email: `Assunto: Eficiência operacional na ${lead.name}\n\nOlá${dmRef},\n\nAcompanhando as movimentações do setor em ${lead.address.split('-')[0] || 'sua região'}, sei o quanto a previsibilidade e a gestão de risco são vitais para a ${lead.name}.\n\nNa Atlas, unimos tecnologia em tempo real e monitoramento ativo para gerar valor com máxima segurança.\n\nFaz sentido um bate-papo de 15 minutos nesta semana?\n\nUm abraço,\nEquipe de Expansão Atlas`,
    whatsapp: `Olá${dmRef}, tudo bem? Sou especialista da Atlas Logística. Vi seu perfil${dmRoleRef} da ${lead.name}. Estamos compartilhando com líderes do setor um estudo prático de mitigação de riscos e redução de sinistros em transporte. Posso te enviar o resumo em PDF?`,
    linkedin: `Olá${dmRef}, é um prazer conectar! Acompanho os desafios logísticos da ${lead.name} e gostaria de somar em sua rede profissional com discussões sobre inovação e segurança operacional da Atlas.`,
    followup_strategy: 'Realizar tentativa de contato telefônico após 2 dias do envio do WhatsApp.',
    objection_matrix: '1. Sem orçamento.\nR: O ROI da Atlas vem da prevenção direta de sinistros que custam muito mais.\n2. Estamos satisfeitos com o atual fornecedor.\nR: Entendemos. Muitas transportadoras também estavam, mas adotaram a Atlas pelo nosso diferencial de pronta-resposta híbrida.',
    qualification_matrix: '1. Qual a média mensal de viagens?\n2. Qual tecnologia de monitoramento atual?\n3. Quais as principais dores de segurança enfrentadas no último semestre?',
    ice_breaker: `Notei que a operação logística da ${lead.name} atende regiões chave que acompanhamos de perto na Atlas.`
  };
}

export interface EnrichmentResult {
  news_dossier: any;
  copies: OutreachCopies;
  engineUsed: string;
  personalization_level: PersonalizationLevel;
}

export async function enrichLeadWithPublicNewsAndScripts(
  lead: Lead,
  pitch: string,
  config: AIConfig,
  tone?: string,
  storedEvidence: EvidenceRecord[] = []
): Promise<EnrichmentResult> {
  const dm = lead.decision_makers?.[0] || {
    name: lead.decision_maker_name || '',
    title: lead.decision_maker_title || '',
    email: lead.decision_maker_email || '',
    linkedin: lead.decision_maker_linkedin || ''
  };

  const requestedTone = tone || 'consultivo';

  const evidenceContext = buildLeadEvidenceContext(lead, dm, storedEvidence);
  const personalizationLevel = computePersonalizationLevel(evidenceContext);
  const evidenceBlock = formatEvidenceContextForPrompt(evidenceContext);

  const systemPrompt = `Você é um Analista de Inteligência Comercial e Especialista em Account-Based Marketing (ABM) e Outbound B2B para a Atlas (Segurança e Inteligência Logística).
Sua tarefa é produzir um Dossiê Estratégico com hipóteses comerciais e abordagens personalizadas para a empresa prospectada e seu decisor, usando apenas o que está no CONTEXTO DE EVIDÊNCIAS CONFIRMADAS abaixo.
IMPORTANTE: O tom de voz para a criação dos roteiros e mensagens deve ser ESTRITAMENTE: ${requestedTone.toUpperCase()}. Adeque o vocabulário, o ritmo e o nível de formalidade das mensagens (cold call, email, whatsapp, linkedin) a este tom.
${ANTI_FABRICATION_GUARDRAIL}
REGRA ANTI-FABRICAÇÃO ADICIONAL (CRÍTICA):
- Você NÃO tem acesso a busca na internet em tempo real. NUNCA invente notícias, manchetes, fontes, datas ou URLs específicas como se fossem reais.
- O campo "recent_news" só pode conter itens de notícias públicas que JÁ ESTEJAM listadas no contexto de evidências abaixo. Se nenhuma notícia real estiver listada lá, retorne "recent_news": [] (array vazio). Um array vazio é o resultado correto e esperado na maioria dos casos.
- Não afirme situação cadastral, status na Receita Federal ou qualquer dado de registro público que não esteja no contexto de evidências.
- "company_overview", "decision_maker_insights" e "commercial_hooks" devem ser tratados como hipóteses/sugestões geradas por IA para apoiar o vendedor, nunca como fatos verificados.
Você DEVE responder ESTRITAMENTE em formato JSON com as seguintes chaves:
{
  "news_dossier": {
    "company_overview": "Hipótese/contexto comercial gerado por IA sobre o segmento e porte da empresa - não uma pesquisa real",
    "recent_news": [],
    "decision_maker_insights": "Hipótese sobre prioridades típicas de quem ocupa este cargo - não uma pesquisa real sobre esta pessoa",
    "commercial_hooks": [
      "Gancho comercial 1",
      "Gancho comercial 2",
      "Gancho comercial 3"
    ]
  },
  "copies": {
    "cold_call": "Roteiro de ligação personalizado com os dados fornecidos",
    "cold_email": "Cold e-mail objetivo e persuasivo",
    "whatsapp": "Mensagem curta e humana para WhatsApp",
    "linkedin": "Mensagem de conexão estratégica para o LinkedIn",
    "approach_prompt": "Prompt completo de instrução para o SDR usar com IA para guiar a negociação",
    "followup_strategy": "Cadência de follow-up sugerida com prazos e canais"
  }
}`;

  const userPrompt = `
CONTEXTO DE EVIDÊNCIAS CONFIRMADAS (LeadEvidenceContext) - use apenas o que está aqui; não presuma nada além disso:
${evidenceBlock}

NÍVEL DE PERSONALIZAÇÃO FACTUAL DISPONÍVEL: ${personalizationLevel.toUpperCase()}${personalizationLevel === 'low' ? ' - poucos ou nenhum fato confirmado; gere hipóteses e roteiros GENÉRICOS, sem inventar detalhes específicos.' : ''}

PITCH DE VALOR ATLAS:
"${pitch || 'A Atlas conecta pessoas e tecnologia gerando valores com segurança e inteligência logística, blindando frotas contra sinistros e reduzindo custos operacionais.'}"

Gere o dossiê e os roteiros com base apenas nos dados acima. Retorne o JSON completo.`;

  // 1. Try Gemini
  const geminiModel = 'gemini-3.7-flash';
  const geminiTemperature = config.temperature || 0.7;
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: `${systemPrompt}\n\n${userPrompt}`,
      config: {
        responseMimeType: 'application/json',
        temperature: geminiTemperature
      }
    });

    const text = response.text || '{}';
    const parseResult = safeParseJson(text);
    const tokenUsage = extractGeminiTokenUsage(response);
    if (parseResult.ok) {
      const shape = validateEnrichmentShape(parseResult.value);
      recordAiGenerationLog({
        callType: 'enrichment', engine: 'gemini', model: geminiModel, temperature: geminiTemperature, ...tokenUsage,
        promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: shape.valid,
        error: shape.errors.length > 0 ? shape.errors.join('; ') : undefined,
        leadId: lead.id
      });
      if (shape.valid && shape.newsDossier && shape.copies) {
        return {
          news_dossier: shape.newsDossier,
          copies: formatParsedCopies(shape.copies.validFields, lead, dm),
          engineUsed: 'Gemini 3.7 Flash',
          personalization_level: personalizationLevel
        };
      }
    } else {
      recordAiGenerationLog({
        callType: 'enrichment', engine: 'gemini', model: geminiModel, temperature: geminiTemperature, ...tokenUsage,
        promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: false,
        error: `JSON inválido: ${parseResult.error}`, leadId: lead.id
      });
    }
  } catch (err) {
    console.info("Gemini enrichment com alta demanda, usando fallback.");
  }

  // 2. Try Groq
  const effectiveGroqKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
  const groqModel = config.groqModel || 'llama-3.3-70b-versatile';
  const groqTemperature = config.temperature || 0.7;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveGroqKey}`
      },
      body: JSON.stringify({
        model: groqModel,
        response_format: { type: 'json_object' },
        temperature: groqTemperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (response.ok) {
      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '{}';
      const parseResult = safeParseJson(content);
      const tokenUsage = extractGroqTokenUsage(data);
      if (parseResult.ok) {
        const shape = validateEnrichmentShape(parseResult.value);
        recordAiGenerationLog({
          callType: 'enrichment', engine: 'groq', model: groqModel, temperature: groqTemperature, ...tokenUsage,
          promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: shape.valid,
          error: shape.errors.length > 0 ? shape.errors.join('; ') : undefined,
          leadId: lead.id
        });
        if (shape.valid && shape.newsDossier && shape.copies) {
          return {
            news_dossier: shape.newsDossier,
            copies: formatParsedCopies(shape.copies.validFields, lead, dm),
            engineUsed: `Groq (${groqModel})`,
            personalization_level: personalizationLevel
          };
        }
      } else {
        recordAiGenerationLog({
          callType: 'enrichment', engine: 'groq', model: groqModel, temperature: groqTemperature, ...tokenUsage,
          promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: false,
          error: `JSON inválido: ${parseResult.error}`, leadId: lead.id
        });
      }
    }
  } catch (err) {
    console.info("Groq enrichment offline, usando fallback.");
  }

  recordAiGenerationLog({
    callType: 'enrichment', engine: 'fallback_local', model: null, temperature: null,
    promptTokens: null, completionTokens: null, totalTokens: null,
    promptVersion: AI_PROMPT_VERSION, personalizationLevel, success: false,
    error: 'todos os motores de IA indisponíveis ou responderam com formato inválido',
    leadId: lead.id
  });

  // Fallback sem IA disponível: nunca inventa notícias, fontes, datas, URLs ou
  // status cadastral. recent_news fica vazio e o restante é hipótese comercial
  // genérica claramente não factual (sem citar eventos específicos inexistentes).
  const dmGreeting = dm.name || 'tudo bem';
  const dmRef = dm.name ? `, ${dm.name}` : '';

  return {
    news_dossier: {
      company_overview: `Hipótese gerada por IA (sem pesquisa em tempo real): a ${lead.name} atua no segmento de ${lead.segment || 'transporte e logística'} e é uma candidata a se beneficiar de gestão de risco e segurança operacional.`,
      recent_news: [],
      decision_maker_insights: dm.title
        ? `Hipótese gerada por IA: quem ocupa o cargo de ${dm.title} costuma priorizar produtividade, controle de custos com seguros e redução de sinistralidade.`
        : 'Sem decisor mapeado - nenhuma hipótese específica foi gerada.',
      commercial_hooks: [
        'A Atlas apoia operações do seu porte a reduzir custos de sinistro através de inteligência preditiva.',
        'Proposta de uma auditoria rápida de 15 minutos para mapear os principais riscos operacionais.'
      ]
    },
    copies: {
      cold_call: `[Roteiro de Cold Call]\n"Olá${dmRef}, ${dmGreeting}? Aqui é da Atlas (Segurança e Inteligência Logística). Ajudamos operações como a da ${lead.name} a reduzir riscos e custos de sinistro. Você teria 10 minutos para uma troca rápida de experiências?"`,
      cold_email: `Assunto: Gestão de risco na ${lead.name}\n\nOlá${dmRef},\n\nSabemos o quanto a segurança operacional impacta a rentabilidade e o custo do seguro.\n\nNa Atlas, combinamos inteligência preditiva e monitoramento 24/7 para dar visibilidade total contra sinistros.\n\nPodemos falar brevemente nesta semana?\n\nUm abraço,\nEquipe de Expansão Atlas`,
      whatsapp: `Olá${dmRef}, ${dmGreeting}? Sou da Atlas Logística. Preparei um resumo prático de como empresas do seu porte estão reduzindo custos operacionais com segurança preditiva. Posso te enviar por aqui?`,
      linkedin: `Olá${dmRef}! Gostaria de conectar para trocar insights sobre inteligência de risco e inovação em segurança logística.`,
      approach_prompt: `Você é o SDR da Atlas falando com o decisor da ${lead.name}. Seu foco: conduzir uma conversa consultiva destacando segurança preditiva, redução de sinistralidade e otimização de apólices.`,
      followup_strategy: `1º Contato: Cold Call + WhatsApp. 2º Contato (+48h): E-mail. 3º Contato (+4 dias): Interação no LinkedIn.`
    },
    engineUsed: 'Motor local (fallback fixo)',
    personalization_level: personalizationLevel
  };
}

export async function chatWithLLaMA3(
  history: { role: string; content: string }[],
  userMessage: string,
  config: AIConfig
): Promise<{ text: string; modelUsed: string; tokensEstimated: number }> {
  const systemInstruction = `Você é o Assistente Especialista de Inteligência Comercial e Copywriting da Atlas (Segurança e Inteligência Logística).
Você atende sempre em Português Brasileiro (PT-BR), com tom profissional, dinâmico, estratégico e aderente à identidade da marca Atlas ("Nós conectamos pessoas e tecnologia gerando valores com segurança e inovação").
Você auxilia na criação e ajuste de pitches de vendas, roteiros de cold call, e-mails frios, mensagens de WhatsApp, estratégias de negociação e análise de mercado.
Este chat é um assistente de apoio de uso geral (não gera copy final vinculado a um lead específico) - ainda assim, nunca apresente uma suposição como se fosse um fato verificado sobre uma empresa ou pessoa real.`;

  // 1. Try Ollama
  if (config.provider === 'ollama') {
    const model = config.ollamaModel || 'llama3';
    const temperature = config.temperature || 0.7;
    try {
      const cleanUrl = (config.ollamaUrl || 'http://localhost:11434').replace(/\/$/, '');
      const messages = [
        { role: 'system', content: systemInstruction },
        ...history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
        { role: 'user', content: userMessage }
      ];

      const res = await fetch(`${cleanUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          messages,
          options: { temperature }
        })
      });

      if (res.ok) {
        const data = await res.json() as any;
        const reply = data.message?.content || '';
        const tokenUsage = extractOllamaTokenUsage(data);
        recordAiGenerationLog({
          callType: 'chat', engine: 'ollama', model, temperature, ...tokenUsage,
          promptVersion: AI_PROMPT_VERSION, personalizationLevel: null, success: true
        });
        return {
          text: reply,
          modelUsed: `Ollama (${model})`,
          tokensEstimated: Math.round(reply.length / 4)
        };
      }
    } catch (err) {
      console.info("Ollama chat indisponível, usando fallback.");
    }
  }

  // 2. Try Groq
  const effectiveGroqKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
  if (config.provider === 'groq' || (!config.groqApiKey && config.provider !== 'ollama' && config.provider !== 'gemini')) {
    const model = config.groqModel || 'llama-3.3-70b-versatile';
    const temperature = config.temperature || 0.7;
    try {
      const messages = [
        { role: 'system', content: systemInstruction },
        ...history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
        { role: 'user', content: userMessage }
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveGroqKey}`
        },
        body: JSON.stringify({ model, messages, temperature })
      });

      if (res.ok) {
        const data = await res.json() as any;
        const reply = data.choices?.[0]?.message?.content || '';
        const tokenUsage = extractGroqTokenUsage(data);
        recordAiGenerationLog({
          callType: 'chat', engine: 'groq', model, temperature, ...tokenUsage,
          promptVersion: AI_PROMPT_VERSION, personalizationLevel: null, success: true
        });
        return {
          text: reply,
          modelUsed: `Groq (${model})`,
          tokensEstimated: tokenUsage.totalTokens ?? Math.round(reply.length / 4)
        };
      }
    } catch (err) {
      console.info("Groq chat indisponível, usando fallback.");
    }
  }

  // 3. Default server-side Gemini
  const geminiModel = 'gemini-3.7-flash';
  const geminiTemperature = config.temperature || 0.7;
  try {
    const ai = getGeminiClient();
    const contents: any[] = [];

    for (const msg of history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const response = await ai.models.generateContent({
      model: geminiModel,
      contents,
      config: {
        systemInstruction,
        temperature: geminiTemperature
      }
    });

    const reply = response.text || 'Desculpe, não consegui processar a resposta no momento.';
    const tokenUsage = extractGeminiTokenUsage(response);
    recordAiGenerationLog({
      callType: 'chat', engine: 'gemini', model: geminiModel, temperature: geminiTemperature, ...tokenUsage,
      promptVersion: AI_PROMPT_VERSION, personalizationLevel: null, success: true
    });
    return {
      text: reply,
      modelUsed: 'Gemini 3.7 Flash (Motor Inteligente)',
      tokensEstimated: Math.round(reply.length / 4)
    };
  } catch (err: any) {
    recordAiGenerationLog({
      callType: 'chat', engine: 'fallback_local', model: null, temperature: null,
      promptTokens: null, completionTokens: null, totalTokens: null,
      promptVersion: AI_PROMPT_VERSION, personalizationLevel: null, success: false,
      error: err?.message || 'todos os motores de IA indisponíveis'
    });
    return {
      text: `Olá! Sou o assistente Atlas. Estou pronto para ajudar a aprimorar suas mensagens comerciais de outbound, qualificar frotistas e estruturar o pitch de segurança e gestão de risco. (Nota: ${err.message || 'Motor local ativo'})`,
      modelUsed: 'Atlas Native Engine',
      tokensEstimated: 50
    };
  }
}
