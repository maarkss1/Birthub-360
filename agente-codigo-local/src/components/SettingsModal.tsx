import React, { useState } from 'react';
import {
  X,
  Cpu,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Shield,
  FileCode,
  Copy,
  Check,
  Code2,
  FileText,
  Sparkles,
  Settings2,
  Save
} from 'lucide-react';
import { BackendProvider, ProviderConfig, ESLintConfig } from '../types/agent';
import { DEFAULT_ESLINT_CONFIG, generateEslintRcObject } from '../services/eslintHelper';
import { sounds } from '../services/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProviderConfig;
  onSaveConfig: (newConfig: ProviderConfig) => void;
  hasEnvGemini: boolean;
  onSaveEslintToWorkspace?: (eslintrcContent: string) => Promise<void> | void;
}

type SettingsTab = 'provider' | 'eslint' | 'instructions';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  hasEnvGemini,
  onSaveEslintToWorkspace
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('provider');
  const [localConfig, setLocalConfig] = useState<ProviderConfig>(() => ({
    ...config,
    eslintConfig: config.eslintConfig || { ...DEFAULT_ESLINT_CONFIG }
  }));
  const [testingOllama, setTestingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{ ok?: boolean; message?: string } | null>(null);
  
  // ESLint UI state
  const [showEslintJson, setShowEslintJson] = useState(false);
  const [copiedEslintJson, setCopiedEslintJson] = useState(false);
  const [savingToWorkspace, setSavingToWorkspace] = useState(false);
  const [workspaceSavedSuccess, setWorkspaceSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const currentEslint: ESLintConfig = localConfig.eslintConfig || { ...DEFAULT_ESLINT_CONFIG };

  const updateEslintConfig = (partial: Partial<ESLintConfig>) => {
    setLocalConfig((prev) => ({
      ...prev,
      eslintConfig: {
        ...(prev.eslintConfig || DEFAULT_ESLINT_CONFIG),
        ...partial
      }
    }));
  };

  const applyPreset = (preset: 'standard' | 'ts-strict' | 'airbnb' | 'minimal') => {
    sounds.playClick();
    if (preset === 'standard') {
      updateEslintConfig({
        enabled: true,
        semi: 'never',
        quotes: 'single',
        indent: 2,
        trailingComma: 'none',
        noExplicitAny: 'warn',
        noUnusedVars: 'error',
        preferConst: true,
        noConsole: 'warn',
        reactHooks: true,
        arrowParens: 'avoid',
        maxLen: 100
      });
    } else if (preset === 'ts-strict') {
      updateEslintConfig({
        enabled: true,
        semi: 'always',
        quotes: 'single',
        indent: 2,
        trailingComma: 'always-multiline',
        noExplicitAny: 'error',
        noUnusedVars: 'error',
        preferConst: true,
        noConsole: 'error',
        reactHooks: true,
        arrowParens: 'always',
        maxLen: 100
      });
    } else if (preset === 'airbnb') {
      updateEslintConfig({
        enabled: true,
        semi: 'always',
        quotes: 'single',
        indent: 2,
        trailingComma: 'all',
        noExplicitAny: 'warn',
        noUnusedVars: 'error',
        preferConst: true,
        noConsole: 'warn',
        reactHooks: true,
        arrowParens: 'always',
        maxLen: 120
      });
    } else if (preset === 'minimal') {
      updateEslintConfig({
        enabled: true,
        semi: 'always',
        quotes: 'single',
        indent: 2,
        trailingComma: 'always-multiline',
        noExplicitAny: 'off',
        noUnusedVars: 'warn',
        preferConst: true,
        noConsole: 'off',
        reactHooks: false,
        arrowParens: 'always',
        maxLen: 0
      });
    }
  };

  const handleCopyEslintJson = () => {
    sounds.playClick();
    const jsonObj = generateEslintRcObject(currentEslint);
    navigator.clipboard.writeText(JSON.stringify(jsonObj, null, 2));
    setCopiedEslintJson(true);
    setTimeout(() => setCopiedEslintJson(false), 2000);
  };

  const handleSaveToWorkspace = async () => {
    if (!onSaveEslintToWorkspace) return;
    sounds.playClick();
    setSavingToWorkspace(true);
    setWorkspaceSavedSuccess(false);
    try {
      const jsonObj = generateEslintRcObject(currentEslint);
      await onSaveEslintToWorkspace(JSON.stringify(jsonObj, null, 2));
      sounds.playSuccessChime();
      setWorkspaceSavedSuccess(true);
      setTimeout(() => setWorkspaceSavedSuccess(false), 3000);
    } catch {
      sounds.playAlertTone();
    } finally {
      setSavingToWorkspace(false);
    }
  };

  const handleProviderChange = (provider: BackendProvider) => {
    sounds.playClick();
    let defaultModel = localConfig.model;
    if (provider === 'gemini') defaultModel = 'gemini-2.5-flash';
    if (provider === 'jules') defaultModel = 'jules-agent';
    if (provider === 'groq') defaultModel = 'llama-3.3-70b-versatile';
    if (provider === 'ollama') defaultModel = 'llama3.1';
    if (provider === 'openrouter') defaultModel = 'openai/gpt-4o-mini';
    if (provider === 'custom') defaultModel = 'gpt-3.5-turbo';

    setLocalConfig((prev) => ({
      ...prev,
      provider,
      model: defaultModel
    }));
  };

  const handleTestOllama = async () => {
    setTestingOllama(true);
    setOllamaStatus(null);
    try {
      const res = await fetch('/api/proxy/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: localConfig.ollamaHost || 'http://localhost:11434',
          model: localConfig.model || 'llama3.1',
          messages: [{ role: 'user', content: 'responda {"action":"say","message":"pong"}' }]
        })
      });
      if (res.ok) {
        sounds.playSuccessChime();
        setOllamaStatus({ ok: true, message: 'Conexão bem-sucedida com o Ollama!' });
      } else {
        sounds.playAlertTone();
        const err = await res.json().catch(() => ({}));
        setOllamaStatus({ ok: false, message: err.error || `Erro de resposta: HTTP ${res.status}` });
      }
    } catch (err: any) {
      sounds.playAlertTone();
      setOllamaStatus({ ok: false, message: `Falha na requisição: ${err.message}` });
    } finally {
      setTestingOllama(false);
    }
  };

  const handleSave = () => {
    sounds.playClick();
    onSaveConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f1523] border border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-200 text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#121929] select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                <span>Configurações do Ambiente</span>
                {currentEslint.enabled && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    ESLint Ativo
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                Gerencie motores de IA, regras estritas de linting e diretrizes do projeto.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center px-4 bg-[#0a0e17] border-b border-slate-800/80 gap-1 select-none">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('provider');
            }}
            className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'provider'
                ? 'border-teal-400 text-teal-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Motor de IA & Provedor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('eslint');
            }}
            className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors relative ${
              activeTab === 'eslint'
                ? 'border-purple-400 text-purple-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>Painel ESLint & Linting</span>
            {currentEslint.enabled && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('instructions');
            }}
            className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'instructions'
                ? 'border-amber-400 text-amber-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Diretrizes do Projeto</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: PROVIDER & AI ENGINE */}
          {activeTab === 'provider' && (
            <div className="space-y-5">
              {/* Provider Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Provedor de Inteligência Artificial
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
                  {(
                    [
                      { id: 'gemini', label: 'Gemini' },
                      { id: 'jules', label: 'Jules AI' },
                      { id: 'groq', label: 'Groq' },
                      { id: 'ollama', label: 'Ollama' },
                      { id: 'openrouter', label: 'OpenRouter' },
                      { id: 'custom', label: 'Custom' }
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProviderChange(p.id)}
                      className={`py-1.5 px-2 rounded-md font-medium text-xs transition-colors ${
                        localConfig.provider === p.id
                          ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Specific Details */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 space-y-3">
                {localConfig.provider === 'gemini' && (
                  <div className="space-y-3">
                    {hasEnvGemini ? (
                      <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg flex items-start gap-2.5 text-teal-300">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-xs block">
                            Chave de API do Gemini ativa no ambiente!
                          </span>
                          <span className="text-[11px] text-teal-300/80">
                            O backend utiliza a chave pré-injetada com o SDK @google/genai oficial. Você não precisa digitar nada, está pronto para uso.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                          Chave de API Google Gemini (Opcional se configurado no ambiente)
                        </label>
                        <input
                          type="password"
                          value={localConfig.geminiKey}
                          onChange={(e) =>
                            setLocalConfig({ ...localConfig, geminiKey: e.target.value })
                          }
                          placeholder="AIzaSy..."
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Modelo Gemini
                      </label>
                      <select
                        value={localConfig.model}
                        onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                      >
                        <option value="gemini-2.5-flash">gemini-2.5-flash (Mais rápido e recomendado)</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro (Raciocínio complexo)</option>
                        <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                      </select>
                    </div>
                  </div>
                )}

                {localConfig.provider === 'jules' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Chave de API Jules (X-Goog-Api-Key)
                      </label>
                      <input
                        type="password"
                        value={localConfig.julesKey || ''}
                        onChange={(e) => setLocalConfig({ ...localConfig, julesKey: e.target.value })}
                        placeholder="Insira sua API Key do Jules"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Obtenha sua chave em jules.google.com/settings#api.
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Source (GitHub Repo)
                      </label>
                      <input
                        type="text"
                        value={localConfig.julesSource || ''}
                        onChange={(e) => setLocalConfig({ ...localConfig, julesSource: e.target.value })}
                        placeholder="Ex: sources/github/owner/repo"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Obrigatório. O Jules opera em repositórios conectados via web app.
                      </span>
                    </div>
                  </div>
                )}

                {localConfig.provider === 'groq' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Chave de API Groq (gsk_...)
                      </label>
                      <input
                        type="password"
                        value={localConfig.groqKey}
                        onChange={(e) => setLocalConfig({ ...localConfig, groqKey: e.target.value })}
                        placeholder="gsk_..."
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Obtenha sua chave gratuita em console.groq.com. Fica salva apenas no navegador.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Modelo Groq
                      </label>
                      <select
                        value={localConfig.model}
                        onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                      >
                        <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Recomendado)</option>
                        <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Ultra rápido)</option>
                        <option value="deepseek-r1-distill-llama-70b">deepseek-r1-distill-llama-70b</option>
                      </select>
                    </div>
                  </div>
                )}

                {localConfig.provider === 'ollama' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Endereço Host do Ollama
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={localConfig.ollamaHost}
                          onChange={(e) =>
                            setLocalConfig({ ...localConfig, ollamaHost: e.target.value })
                          }
                          placeholder="http://localhost:11434"
                          className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleTestOllama}
                          disabled={testingOllama}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded font-medium text-xs disabled:opacity-50"
                        >
                          {testingOllama ? 'Testando...' : 'Testar Conexão'}
                        </button>
                      </div>
                      {ollamaStatus && (
                        <div
                          className={`mt-2 p-2 rounded text-[11px] flex items-center gap-1.5 ${
                            ollamaStatus.ok
                              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                              : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                          }`}
                        >
                          {ollamaStatus.ok ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{ollamaStatus.message}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Nome do Modelo no Ollama
                      </label>
                      <input
                        type="text"
                        value={localConfig.model}
                        onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                        placeholder="llama3.1 ou qwen2.5-coder"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                {localConfig.provider === 'openrouter' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Chave de API OpenRouter (sk-or-...)
                      </label>
                      <input
                        type="password"
                        value={localConfig.openRouterKey}
                        onChange={(e) =>
                          setLocalConfig({ ...localConfig, openRouterKey: e.target.value })
                        }
                        placeholder="sk-or-v1-..."
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Modelo OpenRouter
                      </label>
                      <input
                        type="text"
                        value={localConfig.model}
                        onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                        placeholder="openai/gpt-4o-mini"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                {localConfig.provider === 'custom' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Base URL (OpenAI-Compatible)
                      </label>
                      <input
                        type="text"
                        value={localConfig.customBaseUrl}
                        onChange={(e) =>
                          setLocalConfig({ ...localConfig, customBaseUrl: e.target.value })
                        }
                        placeholder="http://localhost:1234/v1"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Chave de API
                      </label>
                      <input
                        type="password"
                        value={localConfig.customApiKey}
                        onChange={(e) =>
                          setLocalConfig({ ...localConfig, customApiKey: e.target.value })
                        }
                        placeholder="Bearer token ou vazio"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                        Nome do Modelo
                      </label>
                      <input
                        type="text"
                        value={localConfig.model}
                        onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                        placeholder="local-model"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Hyperparameters: Steps & Temperature */}
              <div className="space-y-3 bg-slate-900/40 border border-slate-800/80 p-3.5 rounded-lg">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                      Limite Máximo de Passos por Tarefa: {localConfig.maxSteps}
                    </label>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={localConfig.maxSteps}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, maxSteps: Number(e.target.value) })
                    }
                    className="w-full accent-teal-400"
                  />
                  <span className="text-[10px] text-slate-500">
                    Interrompe tarefas após esta quantidade de etapas para evitar loops desnecessários.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                      Temperatura: {localConfig.temperature}
                    </label>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={localConfig.temperature}
                    onChange={(e) =>
                      setLocalConfig({ ...localConfig, temperature: Number(e.target.value) })
                    }
                    className="w-full accent-teal-400"
                  />
                  <span className="text-[10px] text-slate-500">
                    Valores baixos (0.1 a 0.3) são recomendados para geração determinística de código e JSON.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ESLINT CONFIGURATION PANEL */}
          {activeTab === 'eslint' && (
            <div className="space-y-5">
              {/* Master ESLint Switch Banner */}
              <div className="p-4 rounded-xl border bg-gradient-to-r from-purple-950/40 to-slate-900/80 border-purple-500/30 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-xs">
                      <span>Exigir Conformidade ESLint no Agente</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          currentEslint.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {currentEslint.enabled ? 'Ativo no Agente' : 'Desativado'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Quando ativado, o agente de IA recebe as regras de linting em seu prompt do sistema e produz código 100% aderente ao padrão selecionado.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                  <input
                    type="checkbox"
                    checked={currentEslint.enabled}
                    onChange={(e) => {
                      sounds.playClick();
                      updateEslintConfig({ enabled: e.target.checked });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Predefinições Rápidas (Presets)</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Configure com 1 clique</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('ts-strict')}
                    className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-purple-500/30 hover:border-purple-400/50 text-left transition-all group"
                  >
                    <div className="font-semibold text-purple-300 group-hover:text-purple-200 text-xs">
                      TS Strict ⚡
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      TypeScript estrito, ponto e vírgula, sem any
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('standard')}
                    className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 text-left transition-all group"
                  >
                    <div className="font-semibold text-slate-200 group-hover:text-teal-300 text-xs">
                      StandardJS ✨
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Sem ponto e vírgula, aspas simples, limpo
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('airbnb')}
                    className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/40 text-left transition-all group"
                  >
                    <div className="font-semibold text-slate-200 group-hover:text-sky-300 text-xs">
                      Enterprise 🏢
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Ponto e vírgula, vírgulas finais, max-len 120
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('minimal')}
                    className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 text-left transition-all group"
                  >
                    <div className="font-semibold text-slate-200 group-hover:text-amber-300 text-xs">
                      Permissivo 🚀
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Prototipagem rápida e tolerante
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 1: Formatting & Syntax */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <Code2 className="w-4 h-4 text-purple-400" />
                  <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
                    Estilo de Código & Sintaxe
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Semicolons */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                      Ponto e Vírgula (<code>semi</code>)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ semi: 'always' });
                        }}
                        className={`py-1 px-2 rounded text-xs font-mono transition-colors ${
                          currentEslint.semi === 'always'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Sempre ( ; )
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ semi: 'never' });
                        }}
                        className={`py-1 px-2 rounded text-xs font-mono transition-colors ${
                          currentEslint.semi === 'never'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Nunca (sem ;)
                      </button>
                    </div>
                  </div>

                  {/* Quotes */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                      Aspas em Strings (<code>quotes</code>)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ quotes: 'single' });
                        }}
                        className={`py-1 px-2 rounded text-xs font-mono transition-colors ${
                          currentEslint.quotes === 'single'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Simples ( '...' )
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ quotes: 'double' });
                        }}
                        className={`py-1 px-2 rounded text-xs font-mono transition-colors ${
                          currentEslint.quotes === 'double'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Duplas ( "..." )
                      </button>
                    </div>
                  </div>

                  {/* Indentation */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                      Indentação (<code>indent</code>)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ indent: 2 });
                        }}
                        className={`py-1 px-2 rounded text-xs font-mono transition-colors ${
                          currentEslint.indent === 2
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        2 Espaços
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ indent: 4 });
                        }}
                        className={`py-1 px-2 rounded text-xs font-mono transition-colors ${
                          currentEslint.indent === 4
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        4 Espaços
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ indent: 'tab' });
                        }}
                        className={`py-1 px-2 rounded text-xs font-mono transition-colors ${
                          currentEslint.indent === 'tab'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Tabs
                      </button>
                    </div>
                  </div>

                  {/* Trailing commas */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                      Vírgula Final (<code>comma-dangle</code>)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ trailingComma: 'always-multiline' });
                        }}
                        className={`py-1 px-1.5 rounded text-[11px] font-mono transition-colors truncate ${
                          currentEslint.trailingComma === 'always-multiline'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Em múltiplas linhas"
                      >
                        Multilinha
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ trailingComma: 'all' });
                        }}
                        className={`py-1 px-1.5 rounded text-[11px] font-mono transition-colors ${
                          currentEslint.trailingComma === 'all'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Sempre
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ trailingComma: 'none' });
                        }}
                        className={`py-1 px-1.5 rounded text-[11px] font-mono transition-colors ${
                          currentEslint.trailingComma === 'none'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Nunca
                      </button>
                    </div>
                  </div>

                  {/* Arrow Parens */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                      Parênteses em Arrow Functions (<code>arrow-parens</code>)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ arrowParens: 'always' });
                        }}
                        className={`py-1 px-2 rounded text-xs font-mono transition-colors ${
                          currentEslint.arrowParens === 'always'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        (x) =&gt; ...
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ arrowParens: 'avoid' });
                        }}
                        className={`py-1 px-2 rounded text-xs font-mono transition-colors ${
                          currentEslint.arrowParens === 'avoid'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        x =&gt; ...
                      </button>
                    </div>
                  </div>

                  {/* Max Length */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                      Limite de Colunas por Linha (<code>max-len</code>)
                    </label>
                    <select
                      value={currentEslint.maxLen}
                      onChange={(e) => {
                        sounds.playClick();
                        updateEslintConfig({ maxLen: Number(e.target.value) });
                      }}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-purple-500 font-mono text-xs"
                    >
                      <option value={80}>80 caracteres (Padrão rigoroso)</option>
                      <option value={100}>100 caracteres (Recomendado)</option>
                      <option value={120}>120 caracteres (Monitores largos)</option>
                      <option value={0}>Sem limite (Desativado)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Code Quality & TypeScript Rules */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
                    Tipagem, Qualidade & Segurança
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* TypeScript Any */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                      Proibir <code>any</code> no TypeScript (<code>@typescript-eslint/no-explicit-any</code>)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ noExplicitAny: 'error' });
                        }}
                        className={`py-1 px-1.5 rounded text-xs font-mono transition-colors ${
                          currentEslint.noExplicitAny === 'error'
                            ? 'bg-rose-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Proibir any completamente"
                      >
                        Error (Estrito)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ noExplicitAny: 'warn' });
                        }}
                        className={`py-1 px-1.5 rounded text-xs font-mono transition-colors ${
                          currentEslint.noExplicitAny === 'warn'
                            ? 'bg-amber-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Warn (Avisar)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ noExplicitAny: 'off' });
                        }}
                        className={`py-1 px-1.5 rounded text-xs font-mono transition-colors ${
                          currentEslint.noExplicitAny === 'off'
                            ? 'bg-slate-700 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Off
                      </button>
                    </div>
                  </div>

                  {/* Unused variables */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                      Variáveis/Imports Inúteis (<code>no-unused-vars</code>)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ noUnusedVars: 'error' });
                        }}
                        className={`py-1 px-1.5 rounded text-xs font-mono transition-colors ${
                          currentEslint.noUnusedVars === 'error'
                            ? 'bg-rose-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Error (Limpar)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ noUnusedVars: 'warn' });
                        }}
                        className={`py-1 px-1.5 rounded text-xs font-mono transition-colors ${
                          currentEslint.noUnusedVars === 'warn'
                            ? 'bg-amber-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Warn
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ noUnusedVars: 'off' });
                        }}
                        className={`py-1 px-1.5 rounded text-xs font-mono transition-colors ${
                          currentEslint.noUnusedVars === 'off'
                            ? 'bg-slate-700 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Off
                      </button>
                    </div>
                  </div>

                  {/* Console logs */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                      Chamadas de <code>console.log</code> (<code>no-console</code>)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ noConsole: 'warn' });
                        }}
                        className={`py-1 px-1.5 rounded text-xs font-mono transition-colors ${
                          currentEslint.noConsole === 'warn'
                            ? 'bg-amber-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Warn (Evitar)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ noConsole: 'error' });
                        }}
                        className={`py-1 px-1.5 rounded text-xs font-mono transition-colors ${
                          currentEslint.noConsole === 'error'
                            ? 'bg-rose-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Error (Proibir)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          updateEslintConfig({ noConsole: 'off' });
                        }}
                        className={`py-1 px-1.5 rounded text-xs font-mono transition-colors ${
                          currentEslint.noConsole === 'off'
                            ? 'bg-slate-700 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Off (Permitir)
                      </button>
                    </div>
                  </div>

                  {/* Prefer const switch */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-xs font-medium text-slate-200 block">
                        Preferir <code>const</code> (<code>prefer-const</code>)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Obriga 'const' para variáveis não reatribuídas
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentEslint.preferConst}
                        onChange={(e) => {
                          sounds.playClick();
                          updateEslintConfig({ preferConst: e.target.checked });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* React Hooks switch */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800 sm:col-span-2">
                    <div>
                      <span className="text-xs font-medium text-slate-200 block">
                        Regras de React Hooks (<code>rules-of-hooks</code> &amp; <code>exhaustive-deps</code>)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Garante dependências exatas em useEffect, useMemo, useCallback e sem chamadas condicionais
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentEslint.reactHooks}
                        onChange={(e) => {
                          sounds.playClick();
                          updateEslintConfig({ reactHooks: e.target.checked });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Custom Rules JSON editor */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-400 font-medium">
                  Regras Adicionais em JSON (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={currentEslint.customRulesJson || ''}
                  onChange={(e) => updateEslintConfig({ customRulesJson: e.target.value })}
                  placeholder='{"eqeqeq": "error", "no-var": "error"}'
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono text-xs resize-none"
                />
              </div>

              {/* Real-time .eslintrc.json Preview and Workspace Sync */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold text-xs text-slate-200">
                      Arquivo .eslintrc.json Gerado
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEslintJson(!showEslintJson)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 underline transition-colors"
                    >
                      {showEslintJson ? 'Recolher JSON' : 'Visualizar JSON'}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyEslintJson}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 transition-colors"
                      title="Copiar JSON gerado"
                    >
                      {copiedEslintJson ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    {onSaveEslintToWorkspace && (
                      <button
                        type="button"
                        onClick={handleSaveToWorkspace}
                        disabled={savingToWorkspace}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                        title="Salvar ou atualizar .eslintrc.json no diretório do projeto"
                      >
                        <Save className="w-3 h-3" />
                        <span>{savingToWorkspace ? 'Salvando...' : 'Salvar no Projeto'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {workspaceSavedSuccess && (
                  <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Arquivo <code>.eslintrc.json</code> salvo e sincronizado com o workspace do projeto!</span>
                  </div>
                )}

                {showEslintJson && (
                  <pre className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-[10px] font-mono text-purple-200 max-h-48 overflow-y-auto leading-relaxed">
                    {JSON.stringify(generateEslintRcObject(currentEslint), null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PROJECT CUSTOM INSTRUCTIONS */}
          {activeTab === 'instructions' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Diretrizes e Regras Globais do Projeto</span>
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono">
                    (Injetadas no prompt do agente)
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={localConfig.customInstructions || ''}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, customInstructions: e.target.value })
                  }
                  placeholder="Ex: Use sempre TypeScript estrito. Comente funções complexas em português. Sempre escreva testes unitários em src/tests. Prefira Tailwind para estilização..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-xs leading-relaxed resize-none"
                />
                <p className="text-[10px] text-slate-500">
                  Dica: O agente também lê automaticamente arquivos <code>.agentrules</code> ou <code>AGENT.md</code> se existirem na raiz do projeto.
                </p>
              </div>

              {/* Privacy notice */}
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg flex items-start gap-2.5 text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-semibold text-slate-200">Segurança & Privacidade:</span> Suas chaves e código permanecem no seu ambiente. Todas as operações de arquivo ocorrem estritamente na pasta do projeto escolhida.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#121929] flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            {activeTab === 'eslint' && currentEslint.enabled ? (
              <span className="text-purple-300 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-purple-400" />
                Regras de ESLint configuradas e ativas
              </span>
            ) : (
              <span>Alterações salvas localmente no navegador</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs bg-teal-500 text-slate-950 font-semibold rounded-lg hover:bg-teal-400 transition-colors shadow-sm"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
