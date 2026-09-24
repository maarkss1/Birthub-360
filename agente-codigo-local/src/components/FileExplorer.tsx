import React, { useState, useMemo, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  Upload,
  FileArchive
} from 'lucide-react';
import { FileTreeNode } from '../types/agent';

interface FileExplorerProps {
  tree: FileTreeNode[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRefresh: () => void;
  isBusy: boolean;
  onImportZip?: (file: File) => void;
  onImportFiles?: (files: File[]) => void;
  onOpenSearch?: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  tree,
  selectedPath,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRefresh,
  isBusy,
  onImportZip,
  onImportFiles,
  onOpenSearch
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'lib']));
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    // Check if zip
    const zipFile = droppedFiles.find((f) => f.name.endsWith('.zip'));
    if (zipFile && onImportZip) {
      onImportZip(zipFile);
      return;
    }

    if (onImportFiles) {
      onImportFiles(droppedFiles);
    }
  };

  const handleZipInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportZip) {
      onImportZip(file);
    }
    if (e.target) e.target.value = '';
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'mjs':
      case 'cjs':
        return <span className="text-amber-400 font-mono text-[11px] font-bold">JS</span>;
      case 'ts':
        return <span className="text-sky-400 font-mono text-[11px] font-bold">TS</span>;
      case 'jsx':
      case 'tsx':
        return <span className="text-cyan-400 font-mono text-[11px] font-bold">⚛</span>;
      case 'json':
        return <FileJson className="w-3.5 h-3.5 text-amber-300" />;
      case 'html':
        return <span className="text-orange-400 font-mono text-[11px] font-bold">HTML</span>;
      case 'css':
        return <span className="text-blue-400 font-mono text-[11px] font-bold">CSS</span>;
      case 'md':
        return <FileText className="w-3.5 h-3.5 text-purple-400" />;
      case 'py':
        return <span className="text-emerald-400 font-mono text-[11px] font-bold">PY</span>;
      default:
        return <FileCode className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return '';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFileName.trim();
    if (!trimmed) return;
    onCreateFile(trimmed);
    setNewFileName('');
    setIsCreatingFile(false);
  };

  // Helper function to count total files recursively
  const countFiles = (nodes: FileTreeNode[]): number => {
    return nodes.reduce((acc, node) => {
      if (node.isDirectory && node.children) {
        return acc + countFiles(node.children);
      }
      return acc + (node.isDirectory ? 0 : 1);
    }, 0);
  };

  // Highlight search query matches in file/folder names
  const highlightMatch = (text: string, query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return <span>{text}</span>;

    const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span
              key={i}
              className="bg-teal-500/30 text-teal-200 font-medium px-0.5 rounded"
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  // Filter nodes in real-time
  const filterNodes = (nodes: FileTreeNode[], query: string): FileTreeNode[] => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return nodes;

    return nodes.reduce<FileTreeNode[]>((acc, node) => {
      if (node.isDirectory && node.children) {
        const filteredChildren = filterNodes(node.children, query);
        const folderMatches = node.name.toLowerCase().includes(trimmed);

        if (filteredChildren.length > 0 || folderMatches) {
          acc.push({
            ...node,
            children: filteredChildren
          });
        }
      } else if (
        node.name.toLowerCase().includes(trimmed) ||
        node.path.toLowerCase().includes(trimmed)
      ) {
        acc.push(node);
      }
      return acc;
    }, []);
  };

  const filteredTree = useMemo(() => {
    return filterNodes(tree, searchQuery);
  }, [tree, searchQuery]);

  const totalFilesCount = useMemo(() => countFiles(tree), [tree]);
  const filteredFilesCount = useMemo(() => countFiles(filteredTree), [filteredTree]);
  const isFiltering = searchQuery.trim().length > 0;

  const renderNode = (node: FileTreeNode, depth = 0) => {
    // If filtering, automatically expand all matching directory nodes
    const isExpanded = isFiltering ? true : expandedFolders.has(node.path);
    const isSelected = selectedPath === node.path;

    if (node.isDirectory) {
      return (
        <div key={node.path} className="flex flex-col">
          <div
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className="flex items-center gap-1.5 py-1 px-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 rounded cursor-pointer transition-colors group select-none"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-teal-400/90" />
            ) : (
              <Folder className="w-4 h-4 text-teal-400/70" />
            )}
            <span className="font-medium text-slate-200 truncate">
              {highlightMatch(node.name, searchQuery)}
            </span>
          </div>

          {isExpanded && node.children && (
            <div className="flex flex-col">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        onClick={() => onSelectFile(node.path)}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        className={`group flex items-center justify-between py-1 px-2 text-xs rounded cursor-pointer transition-colors select-none ${
          isSelected
            ? 'bg-teal-500/15 text-teal-200 border-l-2 border-teal-400'
            : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-4 flex items-center justify-center shrink-0">
            {getFileIcon(node.name)}
          </div>
          <span className="truncate font-mono text-[12px]">
            {highlightMatch(node.name, searchQuery)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {node.size !== undefined && (
            <span className="text-[10px] text-slate-500 font-mono">{formatSize(node.size)}</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Deseja realmente apagar o arquivo "${node.name}"?`)) {
                onDeleteFile(node.path);
              }
            }}
            disabled={isBusy}
            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
            title="Excluir arquivo"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-full bg-[#0d121d] border-r border-slate-800 select-none relative"
    >
      {/* Hidden ZIP input */}
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        onChange={handleZipInputChange}
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-teal-950/80 border-2 border-dashed border-teal-400 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center pointer-events-none animate-in fade-in duration-150">
          <Upload className="w-10 h-10 text-teal-300 animate-bounce mb-2" />
          <span className="text-xs font-semibold text-teal-200">
            Solte o arquivo .ZIP ou arquivos aqui
          </span>
          <span className="text-[10px] text-teal-400/80 mt-1">
            Os arquivos serão importados para o ambiente
          </span>
        </div>
      )}

      {/* Explorer Top Toolbar */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>Explorador</span>
        </span>
        <div className="flex items-center gap-1">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="p-1 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded transition-colors"
              title="Buscar em todos os arquivos (Ctrl+Shift+F)"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => zipInputRef.current?.click()}
            className="p-1 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded transition-colors"
            title="Importar projeto via arquivo ZIP"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsCreatingFile(!isCreatingFile)}
            className={`p-1 rounded transition-colors ${
              isCreatingFile
                ? 'bg-teal-500/20 text-teal-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Criar novo arquivo"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefresh}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Atualizar árvore de arquivos"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-Time Search Field */}
      <div className="px-3 pt-2.5 pb-2 border-b border-slate-800/60 bg-[#0a0e17]/50">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchQuery('');
              }
            }}
            placeholder="Buscar arquivos no projeto... (Esc)"
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-900 border border-slate-700/70 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
              title="Limpar busca (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search match stats badge */}
        {isFiltering && (
          <div className="flex items-center justify-between mt-1.5 px-0.5 text-[10px]">
            <span className="text-teal-400 font-medium">
              {filteredFilesCount} {filteredFilesCount === 1 ? 'arquivo encontrado' : 'arquivos encontrados'}
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-300 underline"
            >
              limpar
            </button>
          </div>
        )}
      </div>

      {/* New file input form */}
      {isCreatingFile && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-slate-800 bg-slate-900/60">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-teal-400 font-semibold uppercase">Novo Arquivo</span>
            <input
              type="text"
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="ex: src/utils.js"
              className="px-2 py-1 text-xs bg-slate-950 border border-teal-500/50 rounded text-slate-100 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => setIsCreatingFile(false)}
                className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-2 py-0.5 text-[11px] bg-teal-500 text-slate-950 font-semibold rounded hover:bg-teal-400"
              >
                Criar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tree Node List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {filteredTree.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Search className="w-5 h-5 text-slate-600 mt-2" />
            <p>
              {isFiltering ? (
                <>
                  Nenhum arquivo encontrado para &quot;<span className="text-teal-400 font-medium">{searchQuery}</span>&quot;
                </>
              ) : (
                'Nenhum arquivo no workspace.'
              )}
            </p>
            {isFiltering && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-teal-400 hover:text-teal-300 underline font-medium"
              >
                Limpar filtro
              </button>
            )}
          </div>
        ) : (
          filteredTree.map((node) => renderNode(node))
        )}
      </div>

      {/* Footer stats */}
      <div className="p-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between px-3 bg-[#0a0e17]/30">
        <span>{isFiltering ? 'Filtrado' : 'Total'}</span>
        <span className="font-mono text-slate-400">
          {isFiltering ? `${filteredFilesCount} de ${totalFilesCount} arquivos` : `${totalFilesCount} arquivos`}
        </span>
      </div>
    </div>
  );
};
