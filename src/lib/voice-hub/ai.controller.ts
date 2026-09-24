import { Request, Response } from 'express';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { logger } from '../lib/logger.js';
import { llmProviderGateway } from '../../lib/voice-runtime/providers/LLMGateway.js';
import { getAiConsent, grantAiConsent, revokeAiConsent } from '../services/settingService.js';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Internal server error';
}

interface PlaygroundMessage {
  role: 'user' | 'agent';
  text: string;
}

export async function chatHandler(req: Request, res: Response) {
  try {
    const { prompt, currentMessages } = req.body as { prompt?: string; currentMessages?: PlaygroundMessage[] };
    const lastUserMessage = [...(currentMessages || [])].reverse().find(m => m.role === 'user');

    if (!lastUserMessage?.text) {
      return res.status(400).json({ error: 'currentMessages deve conter ao menos uma mensagem do usuário.' });
    }

    // Real LLM Gateway call — goes through the same provider failover chain (guaranteed to end
    // in GoogleGemini) and the same AI-consent gate (LGPD) as every other AI Gateway caller.
    // Previously this handler never called any provider at all; it matched keywords against a
    // hardcoded Portuguese script and always reported providerUsed: "MockProvider", so the
    // Playground — the primary surface operators use to test an agent's real behavior — never
    // actually exercised the AI Gateway.
    const gatewayResponse = await llmProviderGateway.processRequest(
      lastUserMessage.text,
      'GoogleGemini',
      prompt || undefined,
      req.tenantId!
    );

    res.json(gatewayResponse);
  } catch (error: unknown) {
    logger.error('Chat handler error:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function getAiConsentHandler(req: Request, res: Response) {
  const consent = await getAiConsent(req.tenantId!);
  res.json({ consent });
}

export async function setAiConsentHandler(req: Request, res: Response) {
  const { granted } = req.body as { granted?: boolean };
  if (typeof granted !== 'boolean') {
    return res.status(400).json({ error: '"granted" deve ser um booleano.' });
  }

  const consent = granted
    ? await grantAiConsent(req.tenantId!, req.user!.id)
    : await revokeAiConsent(req.tenantId!, req.user!.id);

  res.json({ success: true, consent });
}

export async function ttsHandler(req: Request, res: Response) {
  // Retorna um áudio vazio para evitar erros de decodificação no frontend do MVP
  res.json({ audioBase64: "" });
}

export async function generateMusicHandler(req: Request, res: Response) {
  try {
    const { prompt } = req.body;
    const ai = getGeminiClient();
    if (!ai) return res.status(500).json({ error: 'Chave da API Gemini não configurada.' });

    const response = await ai.models.generateContentStream({ model: 'lyria-3-clip-preview', contents: prompt });

    let audioBase64 = '';
    let mimeType = 'audio/wav';

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
      }
    }

    res.json({ audioBase64, mimeType });
  } catch (error: unknown) {
    logger.error('Lyria API error:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function generateVideoHandler(req: Request, res: Response) {
  try {
    const { prompt, imageBytes, mimeType } = req.body;
    const ai = getGeminiClient();
    if (!ai) return res.status(500).json({ error: 'Chave da API não configurada.' });

    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt,
      image: { imageBytes, mimeType },
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' },
    });

    res.json({ operationName: operation.name });
  } catch (error: unknown) {
    logger.error('Veo start error:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function videoStatusHandler(req: Request, res: Response) {
  try {
    const { operationName } = req.body;
    const ai = getGeminiClient();
    if (!ai) return res.status(500).json({ error: 'API Key missing' });

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    res.json({ done: updated.done, error: updated.error });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function videoDownloadHandler(req: Request, res: Response) {
  try {
    const { operationName } = req.query;
    if (!operationName) return res.status(400).send('No operation name');
    const apiKey = process.env.GEMINI_API_KEY;
    const ai = getGeminiClient();
    if (!ai || !apiKey) return res.status(500).send('API Key missing');

    const op = new GenerateVideosOperation();
    op.name = operationName as string;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) return res.status(404).send('Vídeo não encontrado ou não finalizado.');

    const videoRes = await fetch(uri, { headers: { 'x-goog-api-key': apiKey } });

    res.setHeader('Content-Type', 'video/mp4');
    videoRes.body!.pipeTo(
      new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        },
      })
    );
  } catch (error: unknown) {
    logger.error('Video download error:', error);
    res.status(500).send(getErrorMessage(error));
  }
}

export async function refactorWorkflowHandler(req: Request, res: Response) {
  try {
    const { mode, nodes } = req.body;
    const ai = getGeminiClient();
    if (!ai) return res.status(500).json({ error: 'Chave da API Gemini não configurada.' });

    const prompt = `Você é um engenheiro staff especialista em otimização de fluxos de atendimento de voz por IA.
Você deve refatorar as configurações dos nós do fluxo atual de acordo com o modo desejado: "${mode}".

Modos possíveis:
- 'simplify': Simplificar os textos e prompts para respostas diretas.
- 'reduceCost': Reduzir custos substituindo modelos caros por gemini-2.5-flash e otimizando parâmetros.
- 'reduceLatency': Otimizar latência diminuindo o tamanho das perguntas e prompts, solicitando respostas extremamente curtas.
- 'moreHuman': Adicionar técnicas de empatia, respiração, pausas e tom natural nos prompts e configurações de voz.

Nós atuais para refatorar:
${JSON.stringify(nodes, null, 2)}

Sua tarefa:
Retorne os mesmos nós, mantendo seus IDs e posições intactos, mas modificando apropriadamente seus campos "data.label" e "data.config" (por exemplo, promptText, questionText, model, temperature, voiceId, stability, speechRate, etc.) para refletir a otimização solicitada de forma inteligente.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            nodes: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  id: { type: 'STRING' },
                  type: { type: 'STRING' },
                  position: {
                    type: 'OBJECT',
                    properties: { x: { type: 'NUMBER' }, y: { type: 'NUMBER' } },
                    required: ['x', 'y'],
                  },
                  data: {
                    type: 'OBJECT',
                    properties: { label: { type: 'STRING' }, category: { type: 'STRING' }, config: { type: 'OBJECT' } },
                    required: ['label', 'category', 'config'],
                  },
                },
                required: ['id', 'type', 'position', 'data'],
              },
            },
          },
          required: ['nodes'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: unknown) {
    logger.error('Refactor API error:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function generateWorkflowHandler(req: Request, res: Response) {
  try {
    const { prompt } = req.body;
    const ai = getGeminiClient();
    if (!ai) return res.status(500).json({ error: 'Chave da API Gemini não configurada.' });

    const systemPrompt = `Você é um Arquiteto de Software Staff especializado em projetar fluxos de atendimento de voz profissionais por telefone/web.
Com base no prompt do usuário: "${prompt}", gere um grafo completo de XYFlow estruturado contendo nós (nodes) e conexões (edges) que façam sentido lógico e técnico para o fluxo desejado.

Tipos de nós suportados:
1. "start": O gatilho de início da chamada. (Ex: Inbound Call Trigger). Config padrão: { channel: "Telefone", language: "pt-BR", timezone: "America/Sao_Paulo", provider: "Twilio", persona: "Recepção Comercial", model: "Gemini 3.1 Pro" }
2. "voice": Configurações de voz (TTS). (Ex: Voz ElevenLabs). Config padrão: { provider: "ElevenLabs", voiceId: "Rachel_pt_BR", stability: 0.75, clarity: 0.85, speechRate: 1.0 }
3. "llm": O provedor de modelo de IA. (Ex: Gemini). Config padrão: { provider: "Gemini", model: "gemini-2.5-pro", temperature: 0.2, topP: 0.9, maxTokens: 1024, safetySettings: "Strict" }
4. "prompt": Prompt de instrução do bot. (Ex: Atendimento Inicial). Config padrão: { promptText: "Instruções do robô de forma simpática.", streaming: "Enabled", thinking: "DeepThinking" }
5. "question": Coleta de informação do usuário com regex de validação. (Ex: Coletar CPF, CEP, Nome). Config padrão: { questionText: "Fale seu nome.", maxRetryCount: 3, speechTimeoutMs: 5000, validationRegex: "^[a-zA-Z\\\\s]{3,30}$", variableToSave: "customer_name", fallbackPrompt: "Não entendi, pode repetir?" }
6. "condition": Desvio de fluxo por lógica ou intent. (Ex: Filtro de Suporte). Config padrão: { variable: "intent", operator: "equals", value: "Suporte", naturalLanguageCheck: "false", matchConfidenceThreshold: 0.8 }
7. "switch": Switch menu para várias rotas. Config padrão: { variableToCheck: "userIntent", path0: "Agendamento", path1: "Suporte", path2: "Financeiro" }
8. "knowledge": Busca vetorial / RAG no Notion/PDFs. (Ex: FAQ). Config padrão: { database: "Notion FAQs", ragTopK: 3, minScoreThreshold: 0.72, searchStrategy: "Embeddings + Semantic Match", autoChunkSize: 512 }
9. "tool": Integração HTTP REST API. (Ex: API Cadastrar). Config padrão: { method: "POST", endpoint: "https://api.empresa.com/v1/agenda", headers: "{}", bodyPayload: "{\\"name\\": \\"{{customer_name}}\\"}", timeoutMs: 4000, retryLimit: 2 }
10. "memory": Gerenciador de estado em memória. Config padrão: { variable: "session_id", value: "{{call_id}}" }
11. "human_handoff": Direciona para um operador humano. Config padrão: { queueName: "Suporte Geral", routingPriority: "High" }
12. "end": Desliga / finaliza a chamada.

Regras de posicionamento do layout:
- Inicie o "start" node na posição x: 50, y: 300.
- Distribua os outros nós sequencialmente para a direita (avançando no eixo X de 300 em 300 ou 400 em 400) e faça desvios verticais no eixo Y (por exemplo, y: 150 para ramo de sucesso e y: 480 para ramo de falha ou FAQ) para criar um grafo visualmente elegante, espaçado e fácil de ler sem sobreposições.
- Certifique-se de que cada nó tenha conexões lógicas que façam sentido. Conecte outputs (como sourceHandle "out-0" para Sucesso / Rota 0, "out-1" para Falha / Rota 1 na tomada de decisão ou perguntas) aos nós subsequentes.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            nodes: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  id: { type: 'STRING' },
                  type: { type: 'STRING' },
                  position: {
                    type: 'OBJECT',
                    properties: { x: { type: 'NUMBER' }, y: { type: 'NUMBER' } },
                    required: ['x', 'y'],
                  },
                  data: {
                    type: 'OBJECT',
                    properties: { label: { type: 'STRING' }, category: { type: 'STRING' }, config: { type: 'OBJECT' } },
                    required: ['label', 'category', 'config'],
                  },
                },
                required: ['id', 'type', 'position', 'data'],
              },
            },
            edges: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  id: { type: 'STRING' },
                  source: { type: 'STRING' },
                  target: { type: 'STRING' },
                  sourceHandle: { type: 'STRING' },
                  type: { type: 'STRING' },
                  data: {
                    type: 'OBJECT',
                    properties: { condition: { type: 'STRING' }, isFallback: { type: 'BOOLEAN' } },
                  },
                },
                required: ['id', 'source', 'target'],
              },
            },
          },
          required: ['nodes', 'edges'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: unknown) {
    logger.error('Generate Workflow API error:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}
