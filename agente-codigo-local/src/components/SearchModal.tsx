import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  FileCode,
  ChevronRight,
  CaseSensitive,
  Regex,
  WholeWord,
  FileText
} from 'lucide-react';

interface SearchResultMatch {
  lineNumber: number;
  lineText: string;
  matchIndex: number;
}

interface FileSearchResult {
  filePath: string;
  matches: SearchResultMatch[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: Record<string, string>;
  onOpenFile: (path: string, line?: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  files,
  onOpenFile
}) => {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Compute search results across all files
  const searchResults: FileSearchResult[] = useMemo(() => {
    if (!query || query.trim().length === 0) return [];

    const results: FileSearchResult[] = [];

    let pattern: RegExp;
    try {
      let flags = caseSensitive ? 'g' : 'gi';
      let regexStr = isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (wholeWord) {
        regexStr = `\\b${regexStr}\\b`;
      }
      pattern = new RegExp(regexStr, flags);
    } catch {
      return [];
    }

    for (const [filePath, content] of Object.entries(files)) {
      if (typeof content !== 'string') continue;

      const lines = content.split('\n');
      const matches: SearchResultMatch[] = [];

      lines.forEach((line, index) => {
        pattern.lastIndex = 0;
        const match = pattern.exec(line);
        if (match) {
          matches.push({
            lineNumber: index + 1,
            lineText: line,
            matchIndex: match.index
          });
        }
      });

      if (matches.length > 0) {
        results.push({
          filePath,
          matches
        });
      }
    }

    return results;
  }, [query, files, caseSensitive, wholeWord, isRegex]);

  const totalMatches = useMemo(() => {
    return searchResults.reduce((acc, curr) => acc + curr.matches.length, 0);
  }, [searchResults]);

  if (!isOpen) return null;

  const handleSelectResult = (path: string, line?: number) => {
    onOpenFile(path, line);
    onClose();
  };

  const highlightMatch = (text: string) => {
    if (!query) return text;
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const regexStr = isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const finalRegex = wholeWord ? new RegExp(`\\b${regexStr}\\b`, flags) : new RegExp(regexStr, flags);

      const parts = text.split(finalRegex);
      const matches = text.match(finalRegex) || [];

      return parts.reduce<React.ReactNode[]>((acc, part, i) => {
        acc.push(part);
        if (i < matches.length) {
          acc.push(
            <mark key={i} className="bg-amber-400/30 text-amber-200 px-0.5 rounded">
              {matches[i]}
            </mark>
          );
        }
        return acc;
      }, []);
    } catch {
      return text;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center p-4 pt-16"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1523] border border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden text-slate-200 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3 border-b border-slate-800 bg-[#121929] flex items-center gap-2">
          <Search className="w-4 h-4 text-teal-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && searchResults.length > 0) {
                const first = searchResults[0];
                handleSelectResult(first.filePath, first.matches[0]?.lineNumber);
              }
            }}
            placeholder="Buscar em todos os arquivos do projeto..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-sm font-mono"
          />

          {/* Search Options Badges */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCaseSensitive(!caseSensitive)}
              className={`p-1.5 rounded transition-colors ${
                caseSensitive
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Diferenciar maiúsculas/minúsculas (Alt+C)"
            >
              <CaseSensitive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setWholeWord(!wholeWord)}
              className={`p-1.5 rounded transition-colors ${
                wholeWord
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Palavra inteira (Alt+W)"
            >
              <WholeWord className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsRegex(!isRegex)}
              className={`p-1.5 rounded transition-colors ${
                isRegex
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Usar expressão regular (Alt+R)"
            >
              <Regex className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="px-4 py-1.5 bg-[#090d14] border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>
            {query.trim().length === 0
              ? 'Digite um termo para pesquisar nos arquivos'
              : `${totalMatches} ocorrência(s) em ${searchResults.length} arquivo(s)`}
          </span>
          <span className="text-[10px] text-slate-500">Pressione Enter para abrir o primeiro resultado</span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[60vh]">
          {query.trim().length > 0 && searchResults.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              Nenhuma ocorrência encontrada para "{query}"
            </div>
          )}

          {searchResults.map((fileRes) => (
            <div
              key={fileRes.filePath}
              className="bg-slate-900/60 border border-slate-800/80 rounded-lg overflow-hidden"
            >
              {/* File header */}
              <div
                onClick={() => handleSelectResult(fileRes.filePath)}
                className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2 text-slate-200 font-mono text-[11px]">
                  <FileCode className="w-3.5 h-3.5 text-teal-400" />
                  <span className="font-semibold">{fileRes.filePath}</span>
                </div>
                <span className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                  {fileRes.matches.length}
                </span>
              </div>

              {/* Match lines */}
              <div className="divide-y divide-slate-800/40">
                {fileRes.matches.map((m, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectResult(fileRes.filePath, m.lineNumber)}
                    className="px-3 py-1 hover:bg-slate-800/60 cursor-pointer font-mono text-[11px] flex items-baseline gap-3 transition-colors group"
                  >
                    <span className="text-slate-500 group-hover:text-teal-400 shrink-0 w-8 text-right">
                      {m.lineNumber}:
                    </span>
                    <span className="text-slate-300 truncate">
                      {highlightMatch(m.lineText.trim())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
