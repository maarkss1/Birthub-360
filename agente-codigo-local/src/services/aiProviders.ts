import { AgentAction, ProviderConfig } from '../types/agent';

export function buildSystemPrompt(
  workspaceName: string,
  mode: 'local' | 'virtual',
  customInstructions?: string
): string {
  let prompt = `Você é um agente autônomo sênior de desenvolvimento de software que edita arquivos no workspace "${workspaceName}" (${mode === 'local' ? 'pasta local conectada' : 'ambiente de desenvolvimento virtual no navegador'}).
Você tem controle completo dos arquivos dentro deste diretório de trabalho.

Em CADA resposta, você DEVE retornar ESTRITAMENTE um único objeto JSON válido (sem texto antes ou depois, sem markdown, sem crases de bloco de código).

FORMATOS PERMITIDOS DE RESPOSTA:

1. Listar arquivos e pastas:
{"action":"list_files","path":"."}

2. Ler o conteúdo de um arquivo:
{"action":"read_file","path":"src/server.js"}

3. Criar ou substituir um arquivo com o conteúdo completo:
{"action":"write_file","path":"src/server.js","content":"// código fonte completo"}

4. Substituir um trecho específico de um arquivo existente (MUITO RECOMENDADO para pequenas correções ou adições pontuais):
{"action":"patch_file","path":"src/server.js","search":"// trecho original a ser substituído","replace":"// novo trecho modificado"}

5. Excluir um arquivo ou pasta desnecessária:
{"action":"delete_file","path":"temp.log"}

6. Realizar commit no repositório Git com mensagem descritiva baseada nas alterações (Padrão Conventional Commits):
{"action":"git_commit","message":"feat(auth): implementa autenticação com Google e persistência no Firestore"}
(ou opcionalmente especificando arquivos selecionados: {"action":"git_commit","message":"fix(server): corrige validação de rotas","files":["server.ts"]})

7. Enviar uma mensagem de progresso/esclarecimento ao usuário enquanto continua trabalhando:
{"action":"say","message":"Analisei a estrutura e agora vou implementar o middleware de autenticação."}

8. Finalizar a tarefa quando tudo estiver concluído e testado:
{"action":"done","message":"Implementei a rota GET /health e os testes com sucesso."}

DIRETRIZES CRÍTICAS:
- Se não souber a estrutura do projeto ou o conteúdo de um arquivo existente, chame "list_files" ou "read_file" antes de escrever.
- Prefira "patch_file" quando apenas uma parte de um arquivo existente precisar ser alterada, adicionada ou corrigida. O campo "search" deve conter o trecho exato a ser localizado no arquivo.
- "write_file" sobrescreve o arquivo inteiro. Sempre envie o código ou texto completo e funcional, sem placeholders do tipo "// resto do código aqui".
- Quando o usuário solicitar commits ou quando você concluir uma etapa relevante de desenvolvimento, use "git_commit" com uma mensagem expressiva e bem formatada baseada nas alterações realizadas.
- Só emita "done" quando todos os arquivos necessários para a solicitação do usuário estiverem criados ou atualizados.
- Não invente respostas ou resultados de ferramentas antes de recebê-los do ambiente.`;

  if (customInstructions && customInstructions.trim()) {
    prompt += `\n\nREGRAS E DIRETRIZES PERSONALIZADAS DO PROJETO:\n${customInstructions.trim()}`;
  }

  return prompt;
}

export function extractJsonAction(rawText: string): AgentAction {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Resposta vazia do modelo de IA.');
  }

  let text = rawText.trim();

  // Strip markdown code fences if present: ```json ... ``` or ``` ... ```
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '');
    const endFence = text.lastIndexOf('```');
    if (endFence !== -1) {
      text = text.slice(0, endFence).trim();
    }
  }

  // Find first { and last }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`A resposta do modelo não contém um objeto JSON válido. Conteúdo retornado: ${rawText.slice(0, 150)}...`);
  }

  const jsonSubstring = text.slice(start, end + 1);

  try {
    const parsed = JSON.parse(jsonSubstring);
    if (!parsed || typeof parsed !== 'object' || !parsed.action) {
      throw new Error('O JSON retornado não contém a propriedade obrigatória "action".');
    }
    return parsed as AgentAction;
  } catch (err: any) {
    throw new Error(`Falha ao decodificar JSON da ação: ${err.message}. Trecho: ${jsonSubstring.slice(0, 100)}`);
  }
}

export interface AIModelResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function callAIModel(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<AIModelResult> {
  const { provider } = config;

  switch (provider) {
    case 'gemini': {
      // Calls server proxy endpoint with @google/genai
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.geminiKey) {
        headers['x-gemini-key'] = config.geminiKey;
      }

      const res = await fetch('/api/agent/gemini', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model || 'gemini-2.5-flash',
          messages,
          systemPrompt,
          temperature: config.temperature ?? 0.2
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP no servidor Gemini (${res.status})`);
      }

      const data = await res.json();
      return {
        content: data.content || '',
        usage: data.usage
      };
    }

    case 'groq': {
      const apiKey = config.groqKey.trim();
      if (!apiKey) {
        throw new Error('Chave da API Groq não informada. Insira sua chave no painel de configurações.');
      }

      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'llama-3.3-70b-versatile',
          messages: formattedMessages,
          temperature: config.temperature ?? 0.2,
          response_format: { type: 'json_object' }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq API (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0
          }
        : undefined;

      return {
        content: data.choices?.[0]?.message?.content || '',
        usage
      };
    }

    case 'ollama': {
      // Send via server proxy to prevent CORS issues
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      ];

      const res = await fetch('/api/proxy/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: config.ollamaHost || 'http://localhost:11434',
          model: config.model || 'llama3.1',
          messages: formattedMessages
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro de conexão com Ollama (${res.status})`);
      }

      const data = await res.json();
      return {
        content: data.content || '',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }

    case 'openrouter': {
      const apiKey = config.openRouterKey.trim();
      if (!apiKey) {
        throw new Error('Chave da API OpenRouter não informada. Insira sua chave no painel de configurações.');
      }

      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      ];

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000',
          'X-Title': 'Agente de Codigo Local'
        },
        body: JSON.stringify({
          model: config.model || 'openai/gpt-4o-mini',
          messages: formattedMessages,
          temperature: config.temperature ?? 0.2
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0
          }
        : undefined;

      return {
        content: data.choices?.[0]?.message?.content || '',
        usage
      };
    }

    case 'jules': {
      const apiKey = config.julesKey?.trim();
      if (!apiKey) {
        throw new Error('Chave da API Jules não informada. Insira sua chave no painel de configurações.');
      }

      if (!config.julesSource) {
        throw new Error('O campo Source (GitHub Repo) não foi configurado nas configurações do Jules.');
      }

      const combinedPrompt = systemPrompt + "\n\n" + messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

      const res = await fetch('https://jules.googleapis.com/v1alpha/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey
        },
        body: JSON.stringify({
          prompt: combinedPrompt,
          sourceContext: {
            source: config.julesSource
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Jules API (${res.status}): ${errText}`);
      }

      const data = await res.json();
      
      return {
        content: JSON.stringify({
          action: 'done',
          message: `Sessão do Jules iniciada com sucesso (ID: ${data.session_id || data.id || 'N/A'}). Acompanhe o progresso autônomo em https://jules.google.com.`
        })
      };
    }

    case 'custom': {
      const baseUrl = (config.customBaseUrl || 'http://localhost:1234/v1').replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.customApiKey) {
        headers['Authorization'] = `Bearer ${config.customApiKey.trim()}`;
      }

      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      ];

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model || 'default',
          messages: formattedMessages,
          temperature: config.temperature ?? 0.2
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Custom API (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0
          }
        : undefined;

      return {
        content: data.choices?.[0]?.message?.content || '',
        usage
      };
    }

    default:
      throw new Error(`Provedor desconhecido: ${provider}`);
  }
}
