import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  X,
  Sparkles,
  FileCode,
  Check,
  Copy,
  Save,
  Play,
  Settings2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';
import { ProviderConfig } from '../types/agent';
import {
  TestFramework,
  TestScope,
  UnitTestOptions,
  UnitTestResult,
  getDefaultTestFilePath,
  generateUnitTests
} from '../services/testGenerator';
import { sounds } from '../services/soundEffects';

interface UnitTestGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string | null;
  fileContent: string;
  config: ProviderConfig;
  onCreateTestFile: (path: string, content: string) => Promise<void>;
  onRunInTerminal?: (command: string) => void;
}

export const UnitTestGeneratorModal: React.FC<UnitTestGeneratorModalProps> = ({
  isOpen,
  onClose,
  filePath,
  fileContent,
  config,
  onCreateTestFile,
  onRunInTerminal
}) => {
  const [framework, setFramework] = useState<TestFramework>('vitest');
  const [scope, setScope] = useState<TestScope>('full');
  const [targetPath, setTargetPath] = useState('');
  const [includeMocks, setIncludeMocks] = useState(true);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [result, setResult] = useState<UnitTestResult | null>(null);
  const [editedCode, setEditedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize target path whenever active file changes or modal opens
  useEffect(() => {
    if (filePath) {
      const defaultPath = getDefaultTestFilePath(filePath, framework);
      setTargetPath(defaultPath);
    }
    setResult(null);
    setEditedCode('');
    setGenerationError(null);
    setSaveSuccess(false);
  }, [filePath, isOpen]);

  // Adjust default path if framework changes to python
  useEffect(() => {
    if (filePath) {
      setTargetPath(getDefaultTestFilePath(filePath, framework));
    }
  }, [framework]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!filePath || !fileContent) {
      setGenerationError('Nenhum arquivo ou conteúdo selecionado para gerar testes.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setSaveSuccess(false);
    sounds.playClick();

    try {
      const options: UnitTestOptions = {
        framework,
        scope,
        targetPath: targetPath.trim() || getDefaultTestFilePath(filePath, framework),
        includeMocks,
        customInstructions
      };

      const res = await generateUnitTests(config, fileContent, filePath, options);
      setResult(res);
      setEditedCode(res.testCode);
      sounds.playSuccessChime();
    } catch (err: any) {
      setGenerationError(err.message || 'Falha ao gerar testes unitários com o modelo selecionado.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    const codeToCopy = editedCode || result?.testCode || '';
    if (!codeToCopy) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      sounds.playClick();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSaveAndCreateFile = async () => {
    const finalCode = editedCode || result?.testCode;
    const finalPath = (targetPath.trim() || result?.testFilePath || getDefaultTestFilePath(filePath || '')).trim();

    if (!finalCode || !finalPath) return;

    setIsSaving(true);
    try {
      await onCreateTestFile(finalPath, finalCode);
      setSaveSuccess(true);
      sounds.playSuccessChime();
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setGenerationError(`Erro ao salvar arquivo de teste: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunTestInTerminal = () => {
    if (!onRunInTerminal) return;
    const testPath = targetPath.trim() || result?.testFilePath || 'test';
    let cmd = `run ${testPath}`;
    if (framework === 'vitest') cmd = `npx vitest run ${testPath}`;
    else if (framework === 'jest') cmd = `npx jest ${testPath}`;
    else if (framework === 'node:test') cmd = `node --test ${testPath}`;

    onRunInTerminal(cmd);
    onClose();
  };

  const modelDisplayName = config.model || (config.provider === 'gemini' ? 'gemini-2.5-flash' : config.provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[820px] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-800 bg-[#0a0f1d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-100">Gerador de Testes Unitários com IA</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {modelDisplayName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Alvo: <span className="font-mono text-slate-300 font-medium">{filePath || 'Nenhum arquivo ativo'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Two columns) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Configuration Options (5 cols) */}
          <div className="lg:col-span-5 border-r border-slate-800 bg-[#0b101e] p-5 overflow-y-auto flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Caminho do Arquivo de Teste
              </label>
              <div className="relative">
                <FileCode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="ex: src/server.test.js"
                  className="w-full bg-[#131c31] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                O arquivo será salvo neste caminho no projeto.
              </p>
            </div>

            {/* Framework selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Framework de Testes
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'vitest', name: 'Vitest', note: 'Vite & TS moderno' },
                  { id: 'jest', name: 'Jest', note: 'Padrão Node/React' },
                  { id: 'node:test', name: 'Node:test', note: 'Nativo (Zero deps)' },
                  { id: 'mocha', name: 'Mocha/Chai', note: 'BDD / TDD' }
                ].map((fw) => (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() => setFramework(fw.id as TestFramework)}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                      framework === fw.id
                        ? 'bg-teal-500/15 border-teal-500/50 text-teal-200 shadow-sm'
                        : 'bg-[#121a2c] border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-semibold">{fw.name}</span>
                    <span className="text-[10px] text-slate-500">{fw.note}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scope selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Escopo da Bateria de Testes
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'full',
                    name: 'Bateria Completa (Recomendado)',
                    desc: 'Caminho feliz, casos de borda, tratamento de erros e mocks'
                  },
                  {
                    id: 'edge_cases',
                    name: 'Foco em Casos de Borda e Falhas',
                    desc: 'Parâmetros nulos, exceções, limites e condições anômalas'
                  },
                  {
                    id: 'smoke',
                    name: 'Smoke Test / Caminho Feliz',
                    desc: 'Verificações rápidas de integridade e contratos fundamentais'
                  }
                ].map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => setScope(sc.id as TestScope)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      scope === sc.id
                        ? 'bg-teal-500/15 border-teal-500/50 text-slate-200'
                        : 'bg-[#121a2c] border-slate-800/80 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          scope === sc.id ? 'border-teal-400 bg-teal-400' : 'border-slate-600'
                        }`}
                      >
                        {scope === sc.id && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                      <span className="text-xs font-medium text-slate-200">{sc.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-5.5">{sc.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mocks Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#121a2c] border border-slate-800">
              <div>
                <span className="text-xs font-medium text-slate-300">Mocks Automáticos</span>
                <p className="text-[10px] text-slate-500">I/O, chamadas de rede e dependências externas</p>
              </div>
              <button
                type="button"
                onClick={() => setIncludeMocks(!includeMocks)}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  includeMocks ? 'bg-teal-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {/* Custom Instructions */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Instruções Específicas (Opcional)
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="ex: 'Teste se o token expira após 15 minutos e valide headers de resposta...'"
                rows={2}
                className="w-full bg-[#131c31] border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            {/* Generate Action Button */}
            <div className="mt-auto pt-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !filePath}
                className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/10 cursor-pointer disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Gerando Testes com {modelDisplayName}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Gerar Arquivo de Teste</span>
                  </>
                )}
              </button>
            </div>

            {generationError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="flex-1">{generationError}</span>
              </div>
            )}
          </div>

          {/* Right Column: Generated Code Preview & Action Bar (7 cols) */}
          <div className="lg:col-span-7 bg-[#0b0f17] flex flex-col overflow-hidden">
            {/* Top Preview Bar */}
            <div className="h-10 px-4 border-b border-slate-800 bg-[#0e1422] flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Prévia do Arquivo de Teste</span>
                {result && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 font-mono">
                    {result.testCases.length} casos gerados
                  </span>
                )}
              </div>

              {result && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors text-xs"
                    title="Copiar código gerado"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Preview Canvas */}
            <div className="flex-1 overflow-hidden relative">
              {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="relative mb-4">
                    <div className="w-14 h-14 rounded-full border-2 border-teal-500/20 border-t-teal-400 animate-spin flex items-center justify-center" />
                    <Sparkles className="w-6 h-6 text-teal-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">
                    Analisando código e sintetizando suíte de testes...
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    O modelo <span className="text-teal-300 font-mono">{modelDisplayName}</span> está gerando asserções, cenários de borda e mocks.
                  </p>
                </div>
              ) : result ? (
                <div className="h-full flex flex-col">
                  {/* Summary & Covered Cases header */}
                  <div className="p-3 border-b border-slate-800/80 bg-[#0e1628] text-xs">
                    <p className="text-slate-300 mb-2">{result.summary}</p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {result.testCases.map((tc, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800/90 text-teal-300 border border-slate-700 font-mono"
                        >
                          <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0" />
                          <span className="truncate max-w-[280px]">{tc}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Code editor */}
                  <div className="flex-1 flex overflow-hidden font-mono text-xs">
                    <textarea
                      value={editedCode}
                      onChange={(e) => setEditedCode(e.target.value)}
                      spellCheck={false}
                      className="w-full h-full p-4 bg-transparent text-slate-200 resize-none focus:outline-none font-mono text-[12px] leading-relaxed overflow-auto whitespace-pre tab-2 select-text"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <FlaskConical className="w-12 h-12 text-slate-700 mb-3 stroke-1" />
                  <h4 className="text-sm font-medium text-slate-300 mb-1">Pronto para gerar testes</h4>
                  <p className="text-xs text-slate-500 max-w-md">
                    Selecione o framework e o escopo desejado no painel à esquerda e clique em &quot;Gerar Arquivo de Teste&quot;. O modelo criará uma suíte completa com asserções descritivas.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            {result && (
              <div className="h-14 px-5 border-t border-slate-800 bg-[#0e1422] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FileCode className="w-4 h-4 text-teal-400" />
                  <span className="font-mono text-slate-300 truncate max-w-[260px]">
                    {targetPath.trim() || result.testFilePath}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onRunInTerminal && (
                    <button
                      onClick={handleRunTestInTerminal}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-300 hover:text-teal-200 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors"
                      title="Enviar comando para o Terminal integrado"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Executar no Terminal</span>
                    </button>
                  )}

                  <button
                    onClick={handleSaveAndCreateFile}
                    disabled={isSaving || saveSuccess}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg transition-all shadow-md shadow-teal-500/15 disabled:bg-emerald-600 disabled:text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Criando Arquivo...</span>
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Arquivo Criado!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Salvar e Criar Arquivo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
