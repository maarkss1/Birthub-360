import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  FileCode,
  FileText,
  FileJson,
  X,
  Clock,
  ArrowRight,
  CornerDownLeft,
  FilePlus,
  Code2,
  FolderOpen
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

interface QuickOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: Record<string, string>;
  openTabs?: string[];
  activeFilePath?: string | null;
  onOpenFile: (path: string, line?: number) => void;
}

interface FilteredFile {
  path: string;
  fileName: string;
  dirPath: string;
  ext: string;
  lineCount: number;
  isOpenTab: boolean;
  score: number;
  matchIndices?: number[];
}

export const QuickOpenModal: React.FC<QuickOpenModalProps> = ({
  isOpen,
  onClose,
  files,
  openTabs = [],
  activeFilePath,
  onOpenFile
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus on open and clear query
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Parse query for line number jump syntax (e.g. "App.tsx:42" or "server:120")
  const { cleanQuery, targetLine } = useMemo(() => {
    const trimmed = query.trim();
    const lineMatch = trimmed.match(/^(.*?):(\d+)$/);
    if (lineMatch) {
      return {
        cleanQuery: lineMatch[1].trim(),
        targetLine: parseInt(lineMatch[2], 10),
      };
    }
    return {
      cleanQuery: trimmed,
      targetLine: undefined,
    };
  }, [query]);

  // All files list with metadata
  const fileEntries: FilteredFile[] = useMemo(() => {
    return Object.entries(files).map(([path, content]) => {
      const parts = path.split('/');
      const fileName = parts.pop() || path;
      const dirPath = parts.join('/');
      const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || '' : '';
      const lineCount = (content || '').split('\n').length;
      const isOpenTab = openTabs.includes(path);

      return {
        path,
        fileName,
        dirPath,
        ext,
        lineCount,
        isOpenTab,
        score: 0,
      };
    });
  }, [files, openTabs]);

  // Filter and score results
  const filteredFiles = useMemo(() => {
    if (!cleanQuery) {
      // If query is empty, sort open tabs first, then alphabetically
      return [...fileEntries].sort((a, b) => {
        if (a.path === activeFilePath) return -1;
        if (b.path === activeFilePath) return 1;
        if (a.isOpenTab && !b.isOpenTab) return -1;
        if (!a.isOpenTab && b.isOpenTab) return 1;
        return a.fileName.localeCompare(b.fileName);
      });
    }

    const q = cleanQuery.toLowerCase();
    const results: FilteredFile[] = [];

    for (const item of fileEntries) {
      const nameLower = item.fileName.toLowerCase();
      const pathLower = item.path.toLowerCase();

      let score = -1;

      if (nameLower === q) {
        score = 1000;
      } else if (nameLower.startsWith(q)) {
        score = 800 - (nameLower.length - q.length);
      } else if (nameLower.includes(q)) {
        score = 500 - (nameLower.length - q.length);
      } else if (pathLower.includes(q)) {
        score = 200;
      } else {
        // Fuzzy character match
        let qIdx = 0;
        let matchScore = 0;
        for (let i = 0; i < pathLower.length && qIdx < q.length; i++) {
          if (pathLower[i] === q[qIdx]) {
            qIdx++;
            matchScore += (i === 0 || pathLower[i - 1] === '/' ? 20 : 5);
          }
        }
        if (qIdx === q.length) {
          score = matchScore;
        }
      }

      if (score > 0) {
        // Boost open tabs slightly
        if (item.isOpenTab) score += 25;
        results.push({ ...item, score });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }, [fileEntries, cleanQuery, activeFilePath]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredFiles.length) {
      setSelectedIndex(Math.max(0, filteredFiles.length - 1));
    }
  }, [filteredFiles.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredFiles.length) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredFiles[selectedIndex];
      if (target) {
        handleSelectFile(target.path, targetLine);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelectFile = (path: string, line?: number) => {
    onOpenFile(path, line);
    sounds.playClick();
    onClose();
  };

  const getFileIcon = (ext: string) => {
    switch (ext) {
      case 'ts':
      case 'tsx':
        return <span className="text-blue-400 font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">TS</span>;
      case 'js':
      case 'jsx':
      case 'mjs':
        return <span className="text-amber-400 font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">JS</span>;
      case 'json':
        return <FileJson className="w-3.5 h-3.5 text-amber-300" />;
      case 'css':
        return <span className="text-pink-400 font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">CSS</span>;
      case 'html':
        return <span className="text-red-400 font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-red-500/10 border border-red-500/20">HTML</span>;
      case 'md':
        return <FileText className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Highlight matched substring
  const renderHighlightedName = (name: string, q: string) => {
    if (!q) return <span>{name}</span>;
    const lowerName = name.toLowerCase();
    const lowerQ = q.toLowerCase();
    const idx = lowerName.indexOf(lowerQ);

    if (idx === -1) return <span>{name}</span>;

    const before = name.substring(0, idx);
    const match = name.substring(idx, idx + q.length);
    const after = name.substring(idx + q.length);

    return (
      <span>
        {before}
        <span className="text-amber-400 font-bold underline decoration-amber-400/60 bg-amber-400/10 px-0.5 rounded">
          {match}
        </span>
        {after}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-start justify-center pt-[10vh] px-4 select-none animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-[#0b0f19] border border-blue-500/30 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-blue-500/20 animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Quad-color top ribbon: Dourado, Rosa, Vermelho, Azul */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-pink-500 via-red-500 to-blue-500 shrink-0" />

        {/* Search Input Bar */}
        <div className="p-3 bg-[#0d1322] border-b border-slate-800 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Procurar arquivo por nome ou caminho (ex: App, .tsx, server:80)..."
            className="flex-1 bg-transparent border-0 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden font-mono"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-500 hover:text-slate-300 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            <kbd>ESC</kbd> fechar
          </div>
        </div>

        {/* Quick Open Info Strip */}
        <div className="px-4 py-1.5 bg-[#090d16] border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              {cleanQuery ? 'Resultados da busca:' : 'Arquivos recentes e abertos:'}
            </span>
            <span className="font-mono text-blue-400 font-semibold">
              {filteredFiles.length} {filteredFiles.length === 1 ? 'arquivo' : 'arquivos'}
            </span>
            {targetLine && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px]">
                Saltar para linha :{targetLine}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
            <span>↑↓ navegar</span>
            <span>↵ abrir</span>
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto divide-y divide-slate-850/50 p-1"
        >
          {filteredFiles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
              <FileCode className="w-8 h-8 text-slate-700" />
              <p>Nenhum arquivo encontrado para &quot;{query}&quot;.</p>
              <p className="text-[11px] text-slate-600">
                Tente buscar por parte do nome, extensão (.ts, .json) ou caminho.
              </p>
            </div>
          ) : (
            filteredFiles.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={file.path}
                  onClick={() => handleSelectFile(file.path, targetLine)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs font-mono group ${
                    isSelected
                      ? 'bg-blue-600/20 border border-blue-500/40 text-slate-100 shadow-xs'
                      : 'hover:bg-slate-850/60 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                    <div className="shrink-0">{getFileIcon(file.ext)}</div>
                    <div className="truncate flex items-baseline gap-2">
                      <span className={`font-semibold ${isSelected ? 'text-blue-300' : 'text-slate-100'}`}>
                        {renderHighlightedName(file.fileName, cleanQuery)}
                      </span>
                      {file.dirPath && (
                        <span className="text-[11px] text-slate-500 truncate font-sans">
                          {file.dirPath}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[10px]">
                    {file.isOpenTab && (
                      <span className="px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400 border border-pink-500/30 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Aberto</span>
                      </span>
                    )}
                    <span className="text-slate-500 font-mono">
                      {file.lineCount} lin
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts & palette info */}
        <div className="px-4 py-2 bg-[#090d16] border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span>Dica: Digite <kbd className="text-amber-400">nome:linha</kbd> para ir direto à linha</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-slate-400 ml-1">Quick Open (Ctrl+P)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
