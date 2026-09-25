import type React from 'react';
import { useState } from 'react';
import type { AIConfig } from '../types.js';
import { 
  Terminal, 
  Play, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Server, 
  Copy, 
  Check, 
} from 'lucide-react';

interface OllamaTerminalTabProps {
  aiConfig: AIConfig;
  setAiConfig: React.Dispatch<React.SetStateAction<AIConfig>>;
  ollamaStatus: {
    online: boolean;
    latencyMs?: number;
    message?: string;
    availableModels?: string[];
    hasRequestedModel?: boolean;
  } | null;
  onCheckOllama: () => void;
  isChecking: boolean;
}

export const OllamaTerminalTab: React.FC<OllamaTerminalTabProps> = ({
  aiConfig,
  setAiConfig,
  ollamaStatus,
  onCheckOllama,
  isChecking
}) => {
  const [testPrompt, setTestPrompt] = useState('Gere uma mensagem curta de abertura de cold call para a Atlas Inteligência Logística.');
  const [testResult, setTestResult] = useState<any>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRunOllamaTest = async () => {
    setIsRunningTest(true);
    setTestResult(null);
    const startTime = Date.now();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testPrompt,
          aiConfig: {
            ...aiConfig,
            provider: 'ollama'
          }
        })
      });

      const data = await res.json();
      setTestResult({
        success: res.ok,
        timeMs: Date.now() - startTime,
        data
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        timeMs: Date.now() - startTime,
        error: err.message
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[var(--brand-primary)]" />
              <span>Execução & Diagnóstico do Modelo LLaMA3 com Ollama</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Painel de verificação e comunicação direta com o binário do Ollama local em <code className="text-[var(--brand-primary)] font-mono">{aiConfig.ollamaUrl}</code> rodando o modelo <strong className="text-white font-mono">{aiConfig.ollamaModel || 'llama3'}</strong>.
            </p>
          </div>

          <button
            onClick={onCheckOllama}
            disabled={isChecking}
            className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[#FF6B10] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-[var(--brand-primary)]/20 self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Verificar Conexão</span>
          </button>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Status do Servidor Ollama</span>
              {ollamaStatus?.online ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="text-sm font-bold text-white">
              {ollamaStatus?.online ? 'Online & Pronto' : 'Offline / Emulado'}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {ollamaStatus?.latencyMs ? `${ollamaStatus.latencyMs}ms latência` : 'Fallback Server-Side Ativo'}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400">Modelo Selecionado</div>
            <div className="text-sm font-bold text-[var(--brand-primary)] font-mono">
              {aiConfig.ollamaModel || 'llama3'}
            </div>
            <div className="text-[11px] text-slate-500">
              {ollamaStatus?.hasRequestedModel ? '✅ Modelo instalado no Ollama' : 'ℹ️ Fallback inteligente disponível'}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400">Modelos Detectados</div>
            <div className="text-xs font-mono text-slate-300 truncate">
              {ollamaStatus?.availableModels?.length 
                ? ollamaStatus.availableModels.join(', ')
                : 'llama3, llama3.1, mistral'}
            </div>
            <div className="text-[11px] text-slate-500">
              Total: {ollamaStatus?.availableModels?.length || 0} modelos
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Test Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-400" /> Teste de Disparo Direto (Invocação LLaMA3)
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Prompt de Teste para o LLaMA3</label>
            <textarea
              rows={2}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-200 focus:border-[var(--brand-primary)] outline-none resize-none"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-500">
              Envia uma requisição direta para a API <code className="text-[var(--brand-primary)]">/api/chat</code> usando o motor configurado.
            </span>
            <button
              onClick={handleRunOllamaTest}
              disabled={isRunningTest}
              className="py-2 px-5 bg-[var(--brand-primary)] hover:bg-[#FF6B10] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-[var(--brand-primary)]/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunningTest ? 'Executando...' : 'Executar llama3'}</span>
            </button>
          </div>
        </div>

        {/* Execution Output Window */}
        {testResult && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-emerald-400">
                ✅ Resposta recebida em {testResult.timeMs}ms (Modelo: {testResult.data?.modelUsed || 'LLaMA3'})
              </span>
              <span className="text-[11px]">Tokens est.: {testResult.data?.tokensEstimated || 0}</span>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {testResult.data?.reply || JSON.stringify(testResult, null, 2)}
            </div>
          </div>
        )}
      </div>

      {/* Guide: How to run Ollama locally */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-[var(--brand-primary)]" />
          <span>Guia Rápido: Como Executar o Ollama e o Modelo LLaMA3 no seu Ambiente</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Para executar o modelo <strong>LLaMA3</strong> 100% privado e localmente na sua máquina com o Ollama, execute os seguintes passos no seu terminal:
          </p>

          <div className="space-y-2">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
              <span className="text-emerald-400">1. Instalar o Ollama:</span>
              <button
                onClick={() => handleCopy('curl -fsSL https://ollama.com/install.sh | sh', 'c1')}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
              >
                {copiedCode === 'c1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] font-mono text-slate-300">
              curl -fsSL https://ollama.com/install.sh | sh
            </pre>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
              <span className="text-emerald-400">2. Baixar e Executar o Modelo LLaMA 3:</span>
              <button
                onClick={() => handleCopy('ollama run llama3', 'c2')}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
              >
                {copiedCode === 'c2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] font-mono text-[var(--brand-primary)]">
              ollama run llama3
            </pre>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30 text-[var(--brand-primary)] text-[11px] leading-relaxed">
            💡 <strong>Dica de Integração:</strong> Quando o Ollama estiver rodando, a interface da Atlas detectará automaticamente o endpoint na porta padrão <code>11434</code> e utilizará o <code>llama3</code> com resposta imediata e privacidade total.
          </div>
        </div>
      </div>
    </div>
  );
};
