import React, { useState } from 'react';
import { X, Terminal, Copy, Check, Download, ExternalLink, Code } from 'lucide-react';

interface CliExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLI_SCRIPT_SOURCE = `#!/usr/bin/env node
/**
 * coding-agent.js - Agente autônomo de código para terminal local
 * Requer Node.js >= 18 (usa fetch nativo). Sem dependências npm!
 *
 * Motores suportados:
 *   - groq        (GROQ_API_KEY)
 *   - gemini      (GEMINI_API_KEY)
 *   - ollama      (OLLAMA_HOST, padrão: http://localhost:11434)
 *   - openrouter  (OPENROUTER_API_KEY)
 *
 * Exemplos de execução:
 *   node coding-agent.js --backend gemini --folder ./meu-app --model gemini-2.5-flash
 *   node coding-agent.js --backend groq --folder ./meu-app --model llama-3.3-70b-versatile
 *   node coding-agent.js --backend ollama --folder ./meu-app --model llama3.1
 *   node coding-agent.js --backend openrouter --folder ./meu-app --model openai/gpt-4o-mini
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const BACKEND = args.backend || 'gemini';
const ROOT = path.resolve(args.folder || '.');

const DEFAULT_MODELS = {
  gemini: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'llama3.1',
  openrouter: 'openai/gpt-4o-mini'
};

const MODEL = args.model || DEFAULT_MODELS[BACKEND] || 'gemini-2.5-flash';
const MAX_STEPS = Number(args.maxSteps || 25);

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error(\`\\x1b[31m[Erro]\\x1b[0m Pasta não encontrada: \${ROOT}\`);
  process.exit(1);
}

// Sandbox: trava operações dentro de ROOT
function safePath(relPath) {
  const full = path.resolve(ROOT, relPath || '.');
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    throw new Error(\`Caminho fora da pasta permitida: \${relPath}\`);
  }
  return full;
}

function listFiles(relPath = '.') {
  const dir = safePath(relPath);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.name !== 'node_modules' && e.name !== '.git' && e.name !== '.DS_Store')
    .map((e) => (e.isDirectory() ? \`\${e.name}/\` : e.name));
}

function readFileTool(relPath) {
  const full = safePath(relPath);
  if (!fs.existsSync(full)) return \`[erro] arquivo não existe: \${relPath}\`;
  return fs.readFileSync(full, 'utf8');
}

function writeFileTool(relPath, content) {
  const full = safePath(relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content ?? '', 'utf8');
  return \`[ok] escrito: \${relPath} (\${(content || '').length} chars)\`;
}

function deleteFileTool(relPath) {
  const full = safePath(relPath);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true });
    return \`[ok] apagado: \${relPath}\`;
  }
  return \`[aviso] arquivo já não existia: \${relPath}\`;
}

// Provedores de IA
async function callGemini(messages, systemPrompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Defina a variável GEMINI_API_KEY');

  const contents = [];
  for (const m of messages) {
    if (m.role === 'user') contents.push({ role: 'user', parts: [{ text: m.content }] });
    else if (m.role === 'assistant') contents.push({ role: 'model', parts: [{ text: m.content }] });
  }

  const url = \`https://generativelanguage.googleapis.com/v1beta/models/\${MODEL}:generateContent?key=\${key}\`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!res.ok) throw new Error(\`Gemini API (\${res.status}): \${await res.text()}\`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGroq(messages, systemPrompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('Defina a variável GROQ_API_KEY');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${key}\` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) throw new Error(\`Groq API (\${res.status}): \${await res.text()}\`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callOllama(messages, systemPrompt) {
  const base = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const res = await fetch(\`\${base}/api/chat\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: false,
      format: 'json'
    })
  });

  if (!res.ok) throw new Error(\`Ollama (\${res.status}): \${await res.text()}\`);
  const data = await res.json();
  return data.message.content;
}

async function callOpenRouter(messages, systemPrompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('Defina a variável OPENROUTER_API_KEY');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${key}\`,
      'X-Title': 'local-coding-agent'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.2
    })
  });

  if (!res.ok) throw new Error(\`OpenRouter (\${res.status}): \${await res.text()}\`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callModel(messages, systemPrompt) {
  if (BACKEND === 'gemini') return callGemini(messages, systemPrompt);
  if (BACKEND === 'groq') return callGroq(messages, systemPrompt);
  if (BACKEND === 'ollama') return callOllama(messages, systemPrompt);
  if (BACKEND === 'openrouter') return callOpenRouter(messages, systemPrompt);
  throw new Error(\`Backend desconhecido: \${BACKEND}\`);
}

const SYSTEM_PROMPT = \`Você é um agente de programação autônomo que opera dentro da pasta local "\${ROOT}".
Responda EXCLUSIVAMENTE em formato JSON com uma das ações:
{"action":"list_files","path":"."}
{"action":"read_file","path":"src/index.js"}
{"action":"write_file","path":"src/index.js","content":"...conteúdo completo..."}
{"action":"delete_file","path":"temp.js"}
{"action":"say","message":"mensagem para o usuário"}
{"action":"done","message":"resumo final"}\`;

function extractJson(rawText) {
  let text = (rawText || '').trim();
  if (text.startsWith('\`\`\`')) {
    text = text.replace(/^\`\`\`(?:json)?\\s*/i, '');
    const end = text.lastIndexOf('\`\`\`');
    if (end !== -1) text = text.slice(0, end).trim();
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Resposta sem JSON');
  return JSON.parse(text.slice(start, end + 1));
}

function executeAction(action) {
  switch (action.action) {
    case 'list_files': return JSON.stringify(listFiles(action.path));
    case 'read_file': return readFileTool(action.path);
    case 'write_file': return writeFileTool(action.path, action.content);
    case 'delete_file': return deleteFileTool(action.path);
    case 'say': console.log(\`\\x1b[36m💬 \${action.message}\\x1b[0m\`); return '[ok]';
    case 'done': return null;
    default: return \`[erro] ação desconhecida: \${action.action}\`;
  }
}

async function runTask(task, history) {
  const messages = [...history, { role: 'user', content: task }];

  for (let step = 1; step <= MAX_STEPS; step++) {
    process.stdout.write(\`\\x1b[33m⏳ Passo \${step}/\${MAX_STEPS}...\\x1b[0m\\r\`);
    let reply;
    try {
      reply = await callModel(messages, SYSTEM_PROMPT);
    } catch (e) {
      console.error(\`\\n\\x1b[31m[Erro de IA]\\x1b[0m \${e.message}\`);
      break;
    }

    messages.push({ role: 'assistant', content: reply });

    let action;
    try {
      action = extractJson(reply);
    } catch (e) {
      messages.push({ role: 'user', content: '[erro] Responda apenas com o JSON da ação.' });
      continue;
    }

    if (action.action === 'done') {
      console.log(\`\\n\\x1b[32m✅ \${action.message || 'Tarefa finalizada!'}\\x1b[0m\\n\`);
      break;
    }

    const res = executeAction(action);
    console.log(\`\\x1b[2K  ↳ \\x1b[35m\${action.action}\\x1b[0m \${action.path || ''}\`);
    messages.push({ role: 'user', content: \`[resultado] \${res}\` });
  }

  return messages;
}

async function main() {
  console.log('\\x1b[1m=== Agente Birth Hub 360 ===\\x1b[0m');
  console.log(\`Motor: \\x1b[32m\${BACKEND}\\x1b[0m | Modelo: \\x1b[36m\${MODEL}\\x1b[0m | Pasta: \\x1b[33m\${ROOT}\\x1b[0m\`);
  console.log('Digite sua solicitação ou "sair" para encerrar.\\n');

  let history = [];
  const rl = readline.createInterface({ input: stdin, output: stdout });

  while (true) {
    const task = await rl.question('\\x1b[1;32m> \\x1b[0m');
    if (!task || task.trim().toLowerCase() === 'sair') break;
    try {
      history = await runTask(task, history);
    } catch (err) {
      console.error(\`Erro: \${err.message}\`);
    }
  }
  rl.close();
}

main();
`;

export const CliExportModal: React.FC<CliExportModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CLI_SCRIPT_SOURCE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    const blob = new Blob([CLI_SCRIPT_SOURCE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coding-agent.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f1523] border border-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-200 text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#121929]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm text-slate-100">
              Script CLI para Terminal Local (coding-agent.js)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-slate-300 leading-relaxed text-xs">
            Se você preferir executar o agente diretamente no seu terminal (sem precisar do navegador), você pode baixar ou copiar este script em Node.js puro. Ele não possui dependências adicionais e funciona com Node 18+.
          </p>

          {/* Terminal Command Examples */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono space-y-2 text-[11px]">
            <div className="text-slate-400 font-semibold uppercase text-[10px]">
              Exemplos de Inicialização:
            </div>
            <div className="text-slate-300">
              <span className="text-slate-500"># Com Google Gemini:</span>
              <br />
              <span className="text-teal-400">export GEMINI_API_KEY=&quot;sua-chave&quot;</span>
              <br />
              node coding-agent.js --backend gemini --folder ./meu-projeto
            </div>
            <div className="text-slate-300 pt-1 border-t border-slate-900">
              <span className="text-slate-500"># Com Groq (Llama 3.3 70B):</span>
              <br />
              <span className="text-teal-400">export GROQ_API_KEY=&quot;sua-chave-groq&quot;</span>
              <br />
              node coding-agent.js --backend groq --folder ./meu-projeto
            </div>
            <div className="text-slate-300 pt-1 border-t border-slate-900">
              <span className="text-slate-500"># Com Ollama 100% offline:</span>
              <br />
              node coding-agent.js --backend ollama --folder ./meu-projeto --model llama3.1
            </div>
          </div>

          {/* Script Code Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase text-slate-400">
                Código-Fonte do Script (coding-agent.js):
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium text-xs transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Script</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded font-semibold text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo</span>
                </button>
              </div>
            </div>

            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 max-h-60 overflow-y-auto leading-relaxed">
              {CLI_SCRIPT_SOURCE}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#121929] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
