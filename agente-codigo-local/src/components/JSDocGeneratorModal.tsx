import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  X,
  Sparkles,
  Check,
  Copy,
  RotateCcw,
  Loader2,
  FileCode,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Code2,
  Columns,
  ListFilter,
  Layers,
  ArrowRight,
  Zap,
  Globe
} from 'lucide-react';
import {
  generateJSDocWithAI,
  JSDocGenerationResult,
  detectExportedItems,
  ExportedItemInfo,
  JSDocOptions
} from '../services/jsdocAI';
import { sounds } from '../services/soundEffects';

interface JSDocGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string | null;
  fileContent: string;
  onApplyDocumentedCode: (newCode: string, summary: string) => void;
  customGeminiKey?: string;
}

export const JSDocGeneratorModal: React.FC<JSDocGeneratorModalProps> = ({
  isOpen,
  onClose,
  filePath,
  fileContent,
  onApplyDocumentedCode,
  customGeminiKey
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'diff' | 'entities'>('code');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration options
  const [language, setLanguage] = useState<'pt' | 'en'>('pt');
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeTypes, setIncludeTypes] = useState(true);

  // Result state
  const [result, setResult] = useState<JSDocGenerationResult | null>(null);

  // Generate on modal open
  useEffect(() => {
    if (isOpen && filePath && fileContent) {
      handleGenerate();
    }
  }, [isOpen, filePath]);

  const handleGenerate = async () => {
    if (!filePath || !fileContent) return;
    setLoading(true);
    setError(null);

    try {
      const genResult = await generateJSDocWithAI({
        code: fileContent,
        filePath,
        language,
        options: {
          includeExamples,
          includeTypes,
        },
        customKey: customGeminiKey,
      });

      setResult(genResult);
      sounds.playSuccessChime();
    } catch (err: any) {
      console.error('Erro ao gerar JSDoc:', err);
      setError(err?.message || 'Falha ao processar documentação JSDoc com IA.');
      sounds.playErrorBeep();
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.documentedCode) return;
    navigator.clipboard.writeText(result.documentedCode);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!result?.documentedCode) return;
    onApplyDocumentedCode(
      result.documentedCode,
      result.summary || `JSDoc gerado para ${result.items.length} entidades exportadas.`
    );
    sounds.playSuccessChime();
    onClose();
  };

  // Compute simple unified diff lines for preview
  const diffLines = useMemo(() => {
    if (!result?.documentedCode || !fileContent) return [];
    const origLines = fileContent.split('\n');
    const newLines = result.documentedCode.split('\n');

    const lines: Array<{ type: 'same' | 'added' | 'removed'; text: string; origNum?: number; newNum?: number }> = [];
    let origIdx = 0;
    let newIdx = 0;

    while (origIdx < origLines.length || newIdx < newLines.length) {
      const origLine = origLines[origIdx];
      const newLine = newLines[newIdx];

      if (origLine === newLine) {
        lines.push({
          type: 'same',
          text: origLine || '',
          origNum: origIdx + 1,
          newNum: newIdx + 1,
        });
        origIdx++;
        newIdx++;
      } else if (newLines.includes(origLine) && !origLines.includes(newLine)) {
        // Line added in new code
        lines.push({
          type: 'added',
          text: newLine || '',
          newNum: newIdx + 1,
        });
        newIdx++;
      } else if (!newLines.includes(origLine) && origLines.includes(newLine)) {
        // Line removed from original code
        lines.push({
          type: 'removed',
          text: origLine || '',
          origNum: origIdx + 1,
        });
        origIdx++;
      } else {
        // Replaced line
        if (origIdx < origLines.length) {
          lines.push({
            type: 'removed',
            text: origLine || '',
            origNum: origIdx + 1,
          });
          origIdx++;
        }
        if (newIdx < newLines.length) {
          lines.push({
            type: 'added',
            text: newLine || '',
            newNum: newIdx + 1,
          });
          newIdx++;
        }
      }

      if (lines.length > 800) break; // safety limit
    }

    return lines;
  }, [fileContent, result]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150">
      <div className="bg-[#0c101c] border border-pink-500/30 w-full max-w-5xl h-[88vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative ring-1 ring-pink-500/20">
        {/* Quad-color top ribbon: Dourado, Rosa, Vermelho, Azul */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-pink-500 via-red-500 to-blue-500 shrink-0" />

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#090d18] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-xs shadow-pink-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">
                  Documentação JSDoc com Inteligência Artificial
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-amber-400/20 via-pink-500/20 to-blue-500/20 text-pink-300 border border-pink-500/30">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-slate-300">{filePath || 'Nenhum arquivo selecionado'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/40 text-pink-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
              title="Regenerar comentários JSDoc com IA"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Analisando...' : 'Regenerar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Options & Configuration Bar */}
        <div className="px-5 py-2 bg-[#0d1322] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4">
            {/* Language toggle */}
            <div className="flex items-center gap-1.5 text-slate-400">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Idioma:</span>
              <div className="flex items-center rounded-md bg-slate-850 p-0.5 border border-slate-750">
                <button
                  onClick={() => setLanguage('pt')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    language === 'pt' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Português
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    language === 'en' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Include Examples */}
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeExamples}
                onChange={(e) => setIncludeExamples(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-pink-500 border-slate-700 bg-slate-900 focus:ring-0"
              />
              <span>Incluir @example</span>
            </label>

            {/* Include Types */}
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTypes}
                onChange={(e) => setIncludeTypes(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-500 border-slate-700 bg-slate-900 focus:ring-0"
              />
              <span>Tipos em @param/@returns</span>
            </label>
          </div>

          {/* Palette indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">Tema:</span>
            <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-750 text-[10px] font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400" title="Dourado" />
              <span className="w-2 h-2 rounded-full bg-pink-500" title="Rosa" />
              <span className="w-2 h-2 rounded-full bg-red-500" title="Vermelho" />
              <span className="w-2 h-2 rounded-full bg-blue-500" title="Azul" />
              <span className="text-slate-400 ml-1">Quad Theme</span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-5 py-3 bg-[#0a0e19] border-b border-slate-800 shrink-0">
            {/* Total Exported */}
            <div className="bg-[#111728] border border-blue-500/25 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Exportações Totais</div>
                <div className="text-lg font-bold font-mono text-blue-400">
                  {result.stats.totalExported}
                </div>
              </div>
              <div className="w-7 h-7 rounded-md bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Code2 className="w-4 h-4" />
              </div>
            </div>

            {/* Functions Documented */}
            <div className="bg-[#111728] border border-amber-500/25 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Funções Documentadas</div>
                <div className="text-lg font-bold font-mono text-amber-400">
                  {result.stats.functionsDocumented}
                </div>
              </div>
              <div className="w-7 h-7 rounded-md bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>

            {/* Classes Documented */}
            <div className="bg-[#111728] border border-pink-500/25 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Classes Documentadas</div>
                <div className="text-lg font-bold font-mono text-pink-400">
                  {result.stats.classesDocumented}
                </div>
              </div>
              <div className="w-7 h-7 rounded-md bg-pink-500/15 text-pink-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            {/* Created vs Updated */}
            <div className="bg-[#111728] border border-red-500/25 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Novos / Atualizados</div>
                <div className="text-lg font-bold font-mono text-red-400">
                  +{result.stats.createdCount} <span className="text-xs text-slate-500 font-normal">/ {result.stats.updatedCount} ↻</span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-md bg-red-500/15 text-red-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="px-5 border-b border-slate-800 bg-[#090d18] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'code'
                  ? 'border-pink-400 text-pink-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Código com JSDoc</span>
            </button>

            <button
              onClick={() => setActiveTab('diff')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'diff'
                  ? 'border-blue-400 text-blue-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Comparar Diff</span>
            </button>

            <button
              onClick={() => setActiveTab('entities')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'entities'
                  ? 'border-amber-400 text-amber-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Entidades Identificadas ({result?.items.length || 0})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!result?.documentedCode}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 transition-colors disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-[#080b14] p-4 font-mono text-xs">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-200">
                  Analisando e gerando documentação JSDoc...
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Detectando funções e classes exportadas, inferindo parâmetros, retornos, exceptions e anotações JSDoc 3.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-red-400 p-6 text-center">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm font-semibold text-slate-200">{error}</p>
              <button
                onClick={handleGenerate}
                className="mt-2 px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/40 hover:bg-pink-500/30 text-xs transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          ) : activeTab === 'code' ? (
            <div className="rounded-lg bg-[#0b0f1a] border border-slate-800 p-4 overflow-x-auto text-slate-200 leading-relaxed">
              <pre className="font-mono text-[12px] whitespace-pre">
                {result?.documentedCode || fileContent}
              </pre>
            </div>
          ) : activeTab === 'diff' ? (
            <div className="rounded-lg bg-[#0b0f1a] border border-slate-800 overflow-x-auto divide-y divide-slate-850">
              {diffLines.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma diferença encontrada. O arquivo já possui documentação compatível.
                </div>
              ) : (
                diffLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start px-3 py-0.5 text-[11px] leading-tight font-mono ${
                      line.type === 'added'
                        ? 'bg-emerald-950/30 text-emerald-300 border-l-2 border-emerald-400'
                        : line.type === 'removed'
                        ? 'bg-rose-950/30 text-rose-300 border-l-2 border-rose-400 line-through opacity-70'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="w-8 shrink-0 text-right pr-2 text-slate-600 select-none text-[10px]">
                      {line.newNum || line.origNum || ''}
                    </span>
                    <span className="w-4 shrink-0 text-center select-none font-bold">
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                    <span className="whitespace-pre-wrap break-all flex-1">{line.text}</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Entidades Identificadas */
            <div className="space-y-3">
              {(!result?.items || result.items.length === 0) ? (
                <div className="text-center py-12 text-slate-500">
                  Nenhuma função ou classe exportada encontrada neste arquivo.
                </div>
              ) : (
                result.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-[#0d1322] border border-slate-800 hover:border-pink-500/30 transition-colors flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                            item.kind === 'class'
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              : item.kind === 'async_function'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.kind.replace('_', ' ')}
                        </span>
                        <span className="text-slate-100 font-semibold text-sm">{item.name}</span>
                        <span className="text-slate-500 text-[11px] font-mono">
                          (Linha ~{item.lineNumber})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium font-mono ${
                            item.action === 'created'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {item.action === 'created' ? '+ JSDoc Criado' : '↻ JSDoc Atualizado'}
                        </span>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-slate-300 text-xs font-sans pl-1 border-l-2 border-slate-700">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#090d18] flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-sans">
            {result?.summary || 'Gere ou atualize a documentação de todas as funções e classes exportadas.'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={loading || !result?.documentedCode}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-slate-950 shadow-md transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>Aplicar ao Arquivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
