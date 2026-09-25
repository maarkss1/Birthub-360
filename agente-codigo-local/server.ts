import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateVideosOperation, Modality } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 4000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get GoogleGenAI client with standard telemetry header
function getAIClient(customKey?: string) {
  const apiKey = (customKey?.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não encontrada. Configure a chave no ambiente.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check if server environment has GEMINI_API_KEY
app.get('/api/has-gemini-key', (_req, res) => {
  res.json({
    available: !!process.env.GEMINI_API_KEY,
    defaultModel: 'gemini-3.5-flash',
  });
});

// 1. Existing code agent proxy for backward compatibility
app.post('/api/agent/gemini', async (req, res) => {
  try {
    const customKey = req.headers['x-gemini-key'] as string;
    const ai = getAIClient(customKey);
    const { messages, model = 'gemini-3.5-flash', systemPrompt } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Parâmetro messages inválido' });
    }

    let systemInstruction = systemPrompt || '';
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant' || msg.role === 'model') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    const result = await ai.models.generateContent({
      model: model || 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction: systemInstruction || undefined,
        temperature: 0.2,
      },
    });

    const replyText = result.text || '';
    const usageMetadata = result.usageMetadata || {};

    return res.json({
      content: replyText,
      usage: {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      },
    });
  } catch (error: any) {
    console.error('Erro na chamada Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Erro ao processar chamada com Gemini',
    });
  }
});

// Git AI Commit Message Generator
app.post('/api/git/generate-commit-message', async (req, res) => {
  try {
    const customKey = req.headers['x-gemini-key'] as string;
    const ai = getAIClient(customKey);
    const { diffSummary, userHint, language = 'pt' } = req.body;

    const systemPrompt = `Você é um engenheiro de software sênior e líder técnico especialista em Git, boas práticas e Conventional Commits (padrão Angular/Karma).
Sua missão é analisar as alterações feitas nos arquivos de um projeto e gerar 3 excelentes opções de mensagens de commit claras, precisas e expressivas.

Formato esperado de saída (ESTRITAMENTE JSON):
{
  "suggestions": [
    {
      "style": "conventional",
      "title": "<type>(<scope>): <subject curto em letras minúsculas>",
      "description": "Conventional Commits padrão",
      "fullMessage": "<type>(<scope>): <subject curto>",
      "type": "<feat|fix|refactor|docs|test|chore|perf>",
      "scope": "<escopo>"
    },
    {
      "style": "concise",
      "title": "<Mensagem direta e imperativa>",
      "description": "Resumo direto da alteração",
      "fullMessage": "<Mensagem direta e imperativa>"
    },
    {
      "style": "detailed",
      "title": "<type>(<scope>): <subject>",
      "description": "Mensagem descritiva com tópicos explicativos",
      "fullMessage": "<type>(<scope>): <subject>\\n\\n- <tópico 1>\\n- <tópico 2>"
    }
  ]
}

Tipos válidos:
- feat: nova funcionalidade
- fix: correção de bug ou erro
- refactor: refatoração de código sem alterar comportamento
- docs: alterações na documentação
- test: adição ou correção de testes
- chore: tarefas rotineiras, configs, dependências
- style: formatação ou estilos sem alteração lógica
- perf: melhorias de performance

Idioma das mensagens: ${language === 'en' ? 'Inglês' : 'Português (Brasil)'}.`;

    const userPrompt = `Arquivos e resumo das alterações:
${diffSummary || 'Nenhuma alteração específica detalhada.'}

${userHint ? `Contexto ou objetivo informado pelo autor: "${userHint}"` : ''}

Por favor, responda com o objeto JSON contendo as 3 sugestões.`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const replyText = result.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(replyText);
    } catch {
      const match = replyText.match(/\{[\s\S]*\}/);
      if (match) parsedData = JSON.parse(match[0]);
    }

    return res.json(parsedData);
  } catch (error: any) {
    console.error('Erro ao gerar mensagem de commit com IA:', error);
    return res.status(500).json({
      error: error?.message || 'Erro ao gerar mensagem de commit com Gemini',
    });
  }
});

// AI JSDoc Documentation Generator & Updater
app.post('/api/ai/generate-jsdoc', async (req, res) => {
  try {
    const customKey = req.headers['x-gemini-key'] as string;
    const ai = getAIClient(customKey);
    const { code, filePath = 'file.ts', language = 'pt', options = {} } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código fonte não fornecido para análise.' });
    }

    const isPt = language !== 'en';
    const systemPrompt = `Você é um engenheiro de software sênior e arquiteto de documentação técnica especializado em TypeScript, JavaScript, JSDoc 3 e boas práticas da indústria (Google / TSDoc).
Sua missão é analisar o arquivo de código fonte fornecido e GERAR OU ATUALIZAR os comentários de documentação JSDoc (/** ... */) para TODAS AS FUNÇÕES E CLASSES EXPORTADAS (incluindo "export function", "export async function", "export default function", "export const fn = (...) =>", "export class", "export default class").

REGRAS ESSENCIAIS:
1. PRESERVAÇÃO TOTAL DO CÓDIGO: Não altere nenhuma lógica de implementação interna, importação ou formatação do código existente. Você só deve inserir ou atualizar os blocos JSDoc imediatamente antes das declarações exportadas.
2. ATUALIZAÇÃO INTELIGENTE: Se uma função ou classe já tiver um comentário JSDoc, revise e enriqueça as tags existentes (@param, @returns, @throws, @description) para que fiquem 100% precisas com os tipos e a implementação atual. Não duplique blocos JSDoc.
3. CONTEÚDO DAS TAGS JSDOC:
   - Descrição clara e concisa do objetivo.
   - @param {Tipo} nome - descrição clara de cada argumento.
   - @returns {Tipo} descrição do retorno (ou Promise<Tipo> para assíncronas).
   - @throws {Error} se lançar erros conhecidos.
   ${options.includeExamples ? '- @example exemplo de chamada prático.' : ''}
4. IDIOMA DOS COMENTÁRIOS: ${isPt ? 'Português (Brasil)' : 'Inglês'}.
5. FORMATO DE SAÍDA: Responda ESTRITAMENTE em formato JSON com a seguinte estrutura:
{
  "documentedCode": "<código fonte completo com os blocos JSDoc inseridos/atualizados>",
  "items": [
    {
      "name": "<nome da função ou classe>",
      "kind": "<function|async_function|arrow_function|class|method>",
      "lineNumber": <número estimado da linha>,
      "hasExistingJsDoc": <true|false>,
      "action": "<created|updated>",
      "description": "<resumo da finalidade>"
    }
  ],
  "stats": {
    "totalExported": <número>,
    "functionsDocumented": <número>,
    "classesDocumented": <número>,
    "createdCount": <número>,
    "updatedCount": <número>
  },
  "summary": "<breve frase resumindo as documentações aplicadas>"
}`;

    const userPrompt = `Arquivo: ${filePath}
Código-fonte a ser analisado e documentado:
\`\`\`
${code}
\`\`\`

Gere ou atualize o JSDoc para todas as funções e classes exportadas conforme as instruções.`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const replyText = result.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(replyText);
    } catch {
      const match = replyText.match(/\{[\s\S]*\}/);
      if (match) parsedData = JSON.parse(match[0]);
    }

    if (!parsedData.documentedCode) {
      parsedData.documentedCode = code;
    }

    return res.json(parsedData);
  } catch (error: any) {
    console.error('Erro ao gerar JSDoc com Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao processar documentação JSDoc com IA.',
    });
  }
});

// 2. Multi-turn Gemini Chatbot
// Models: gemini-3.1-pro-preview, gemini-3.5-flash, gemini-3.1-flash-lite
app.post('/api/ai/chat', async (req, res) => {
  try {
    const customKey = req.headers['x-gemini-key'] as string;
    const ai = getAIClient(customKey);
    const {
      messages,
      model = 'gemini-3.5-flash',
      role = 'Full-Stack Software Architect',
      systemInstruction: customInstruction,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem fornecida.' });
    }

    const defaultRoleInstruction = `You are a world-class ${role}. You provide accurate, concise, elegant code solutions, architectural patterns, and debugging insights. Always write production-grade code.`;
    const finalSystemInstruction = customInstruction || defaultRoleInstruction;

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const msg of messages) {
      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'model' || msg.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    const result = await ai.models.generateContent({
      model: model || 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction: finalSystemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({
      reply: result.text || '',
      modelUsed: model,
      usage: result.usageMetadata || {},
    });
  } catch (error: any) {
    console.error('Erro no chatbot Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao processar mensagem do chatbot.',
    });
  }
});

// 3. Search Grounding & Maps Grounding
// Model: gemini-3.5-flash with googleSearch or googleMaps
app.post('/api/ai/grounding', async (req, res) => {
  try {
    const customKey = req.headers['x-gemini-key'] as string;
    const ai = getAIClient(customKey);
    const { prompt, type = 'search', location } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório.' });
    }

    if (type === 'maps') {
      const config: any = {
        tools: [{ googleMaps: {} }],
      };
      if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
          },
        };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config,
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: Array<{ title: string; uri: string; type: string }> = [];

      for (const chunk of chunks as any[]) {
        if (chunk.maps?.uri) {
          sources.push({
            title: chunk.maps.title || 'Google Maps Location',
            uri: chunk.maps.uri,
            type: 'maps',
          });
        }
      }

      return res.json({
        text: response.text || '',
        sources,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata,
      });
    } else {
      // Search grounding
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: Array<{ title: string; uri: string; type: string }> = [];

      for (const chunk of chunks as any[]) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            uri: chunk.web.uri,
            type: 'web',
          });
        }
      }

      return res.json({
        text: response.text || '',
        sources,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata,
      });
    }
  } catch (error: any) {
    console.error('Erro no Grounding:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao processar consulta com grounding.',
    });
  }
});

// 4. Create & Edit Images
// Model: gemini-3.1-flash-image-preview
app.post('/api/ai/image', async (req, res) => {
  try {
    const customKey = req.headers['x-gemini-key'] as string;
    const ai = getAIClient(customKey);
    const {
      prompt,
      base64Image,
      mimeType = 'image/png',
      aspectRatio = '1:1',
      imageSize = '1K',
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório para gerar ou editar imagem.' });
    }

    const parts: any[] = [];
    if (base64Image) {
      const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType,
        },
      });
    }
    parts.push({ text: prompt });

    const modelToUse = 'gemini-3.1-flash-image-preview';
    let response;
    try {
      response = await ai.models.generateContent({
        model: modelToUse,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || '1:1',
            imageSize: imageSize || '1K',
          },
        },
      });
    } catch (modelErr: any) {
      // Fallback to gemini-3.1-flash-image or flash-lite-image if preview name has specific region constraint
      console.warn('Fallback to gemini-3.1-flash-image:', modelErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || '1:1',
            imageSize: imageSize || '1K',
          },
        },
      });
    }

    let imageUrl = '';
    let textDescription = '';

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          const outMime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${outMime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textDescription += part.text;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: 'Nenhuma imagem retornada pelo modelo.',
        details: textDescription,
      });
    }

    return res.json({
      imageUrl,
      description: textDescription,
    });
  } catch (error: any) {
    console.error('Erro na geração de imagem:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao gerar/editar imagem.',
    });
  }
});

// 5. Generate Music (Lyria)
// Models: lyria-3-clip-preview (up to 30s) or lyria-3-pro-preview (full-length)
app.post('/api/ai/music', async (req, res) => {
  try {
    const customKey = req.headers['x-gemini-key'] as string;
    const ai = getAIClient(customKey);
    const {
      prompt,
      model = 'lyria-3-clip-preview',
      base64Image,
      imageMimeType = 'image/jpeg',
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt musical é obrigatório.' });
    }

    let contentsPayload: any = prompt;
    if (base64Image) {
      const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '');
      contentsPayload = {
        parts: [
          { text: prompt },
          { inlineData: { data: cleanBase64, mimeType: imageMimeType } },
        ],
      };
    }

    const response = await ai.models.generateContentStream({
      model: model || 'lyria-3-clip-preview',
      contents: contentsPayload,
      config: {
        responseModalities: [Modality.AUDIO],
      },
    });

    let audioBase64 = '';
    let lyrics = '';
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
        if (part.text && !lyrics) {
          lyrics = part.text;
        }
      }
    }

    if (!audioBase64) {
      return res.status(500).json({
        error: 'Nenhum áudio gerado pelo modelo Lyria.',
        lyrics,
      });
    }

    return res.json({
      audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
      lyrics,
      modelUsed: model,
    });
  } catch (error: any) {
    console.error('Erro na geração de música:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao gerar música com Lyria.',
    });
  }
});

// 6. Generate Video (Text-to-Video & Image-to-Video)
// Model: veo-3.1-fast-generate-preview (aspect ratio 16:9 or 9:16)
app.post('/api/ai/video', async (req, res) => {
  try {
    const customKey = req.headers['x-gemini-key'] as string;
    const ai = getAIClient(customKey);
    const {
      prompt,
      base64Image,
      imageMimeType = 'image/png',
      aspectRatio = '16:9',
    } = req.body;

    if (!prompt && !base64Image) {
      return res.status(400).json({ error: 'Prompt ou imagem obrigatórios para gerar vídeo.' });
    }

    const config: any = {
      numberOfVideos: 1,
      aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
      resolution: '720p',
    };

    let operation;
    const modelName = 'veo-3.1-fast-generate-preview';

    if (base64Image) {
      const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '');
      operation = await ai.models.generateVideos({
        model: modelName,
        prompt: prompt || 'Animate this photo with cinematic, fluid motion.',
        image: {
          imageBytes: cleanBase64,
          mimeType: imageMimeType,
        },
        config,
      });
    } else {
      operation = await ai.models.generateVideos({
        model: modelName,
        prompt,
        config,
      });
    }

    return res.json({
      operationName: operation.name,
      status: 'pending',
    });
  } catch (error: any) {
    console.error('Erro ao iniciar geração de vídeo:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao iniciar geração de vídeo com Veo.',
    });
  }
});

// Video Status Poll
app.post('/api/ai/video-status', async (req, res) => {
  try {
    const customKey = req.headers['x-gemini-key'] as string;
    const ai = getAIClient(customKey);
    const { operationName } = req.body;

    if (!operationName) {
      return res.status(400).json({ error: 'operationName é obrigatório.' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    const isDone = !!updated.done;
    const videoUri = updated.response?.generatedVideos?.[0]?.video?.uri;

    return res.json({
      done: isDone,
      hasVideo: !!videoUri,
    });
  } catch (error: any) {
    console.error('Erro ao checar status do vídeo:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao consultar status do vídeo.',
    });
  }
});

// Video Download Stream / Data
app.post('/api/ai/video-download', async (req, res) => {
  try {
    const customKey = req.headers['x-gemini-key'] as string;
    const apiKey = (customKey?.trim()) || process.env.GEMINI_API_KEY;
    const ai = getAIClient(customKey);
    const { operationName } = req.body;

    if (!operationName) {
      return res.status(400).json({ error: 'operationName é obrigatório.' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).json({ error: 'Vídeo ainda não disponível ou falhou.' });
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey! },
    });

    if (!videoRes.ok) {
      return res.status(502).json({ error: 'Falha ao baixar vídeo dos servidores Google.' });
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Video = buffer.toString('base64');

    return res.json({
      videoDataUrl: `data:video/mp4;base64,${base64Video}`,
    });
  } catch (error: any) {
    console.error('Erro ao baixar vídeo:', error);
    return res.status(500).json({
      error: error?.message || 'Falha no download do vídeo.',
    });
  }
});

// 7. Audio Transcription
// Model: gemini-3.5-transcribe
app.post('/api/ai/transcribe', async (req, res) => {
  try {
    const customKey = req.headers['x-gemini-key'] as string;
    const ai = getAIClient(customKey);
    const { base64Audio, mimeType = 'audio/webm', prompt } = req.body;

    if (!base64Audio) {
      return res.status(400).json({ error: 'Áudio não fornecido para transcrição.' });
    }

    const cleanAudio = base64Audio.replace(/^data:[^;]+;base64,/, '');

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: cleanAudio,
      },
    };

    const textPart = {
      text: prompt || 'Transcribe the spoken audio verbatim in the language spoken. Retain punctuation and technical terms.',
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: { parts: [audioPart, textPart] },
    });

    const transcription = response.text || '';
    return res.json({
      transcription,
    });
  } catch (error: any) {
    console.error('Erro na transcrição de áudio:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao transcrever áudio com gemini-3.5-transcribe.',
    });
  }
});

// Proxy for Ollama
app.post('/api/proxy/ollama', async (req, res) => {
  try {
    const { host = 'http://localhost:11434', messages, model = 'llama3.1' } = req.body;
    const sanitizedHost = host.replace(/\/+$/, '');

    const response = await fetch(`${sanitizedHost}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `Ollama error (${response.status}): ${errText}`,
      });
    }

    const data = await response.json();
    return res.json({ content: data.message?.content || '' });
  } catch (err: any) {
    console.error('Erro proxy Ollama:', err);
    return res.status(502).json({
      error: `Não foi possível conectar ao Ollama em ${req.body.host || 'http://localhost:11434'}. Verifique se o serviço está rodando: ${err?.message}`,
    });
  }
});

// 8. Real-time Live Voice Conversation WebSocket
// Model: gemini-3.8-live
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (clientWs: WebSocket, request) => {
  console.log('[Live API] Cliente WebSocket conectado');
  let session: any = null;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY não configurada no servidor.' }));
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
        systemInstruction: 'You are an intelligent, articulate real-time voice assistant in an integrated developer environment. Speak naturally, concisely, and helpfully.',
      },
      callbacks: {
        onmessage: (message: any) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ status: 'closed' }));
          }
        },
      },
    });

    clientWs.send(JSON.stringify({ status: 'connected', model: 'gemini-3.8-live' }));

    clientWs.on('message', (data: any) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio && session) {
          session.sendRealtimeInput({
            audio: {
              data: parsed.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
      } catch (err) {
        console.error('[Live API] Erro ao enviar pacote de áudio:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('[Live API] Cliente desconectado');
      try {
        if (session && typeof session.close === 'function') {
          session.close();
        }
      } catch (e) {
        // ignore
      }
    });
  } catch (err: any) {
    console.error('[Live API] Falha na conexão Live:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: err?.message || 'Falha ao inicializar Live API' }));
      clientWs.close();
    }
  }
});

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/live-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Agente Birth Hub 360 & AI Studio] Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
