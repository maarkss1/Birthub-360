import React from 'react';
import { X, RotateCcw, Plus, Minus, FileCode } from 'lucide-react';
import { FileDiffInfo } from '../types/agent';

interface DiffViewerProps {
  diff: FileDiffInfo | null;
  onClose: () => void;
  onRevert: (path: string, oldContent: string) => void;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, onClose, onRevert }) => {
  if (!diff) return null;

  // Simple and robust LCS-inspired line diff algorithm for visual inspection
  const computeDiffLines = (oldText: string, newText: string): DiffLine[] => {
    const oldLines = oldText ? oldText.split('\n') : [];
    const newLines = newText ? newText.split('\n') : [];

    const lines: DiffLine[] = [];
    let o = 0;
    let n = 0;

    // Simple diff generator
    while (o < oldLines.length || n < newLines.length) {
      if (o >= oldLines.length) {
        lines.push({
          type: 'added',
          text: newLines[n],
          newLineNumber: n + 1
        });
        n++;
      } else if (n >= newLines.length) {
        lines.push({
          type: 'removed',
          text: oldLines[o],
          oldLineNumber: o + 1
        });
        o++;
      } else if (oldLines[o] === newLines[n]) {
        lines.push({
          type: 'unchanged',
          text: oldLines[o],
          oldLineNumber: o + 1,
          newLineNumber: n + 1
        });
        o++;
        n++;
      } else {
        // Look ahead for matching line within window of 5
        let matchOld = -1;
        let matchNew = -1;

        for (let i = 1; i <= 5; i++) {
          if (n + i < newLines.length && oldLines[o] === newLines[n + i]) {
            matchNew = i;
            break;
          }
          if (o + i < oldLines.length && oldLines[o + i] === newLines[n]) {
            matchOld = i;
            break;
          }
        }

        if (matchNew !== -1) {
          // Lines were added in new
          for (let k = 0; k < matchNew; k++) {
            lines.push({
              type: 'added',
              text: newLines[n],
              newLineNumber: n + 1
            });
            n++;
          }
        } else if (matchOld !== -1) {
          // Lines were deleted in new
          for (let k = 0; k < matchOld; k++) {
            lines.push({
              type: 'removed',
              text: oldLines[o],
              oldLineNumber: o + 1
            });
            o++;
          }
        } else {
          // Replaced line
          lines.push({
            type: 'removed',
            text: oldLines[o],
            oldLineNumber: o + 1
          });
          lines.push({
            type: 'added',
            text: newLines[n],
            newLineNumber: n + 1
          });
          o++;
          n++;
        }
      }
    }

    return lines;
  };

  const diffLines = computeDiffLines(diff.oldContent, diff.newContent);
  const addedCount = diffLines.filter((l) => l.type === 'added').length;
  const removedCount = diffLines.filter((l) => l.type === 'removed').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f17] overflow-hidden border-l border-slate-800">
      {/* Header bar */}
      <div className="h-10 border-b border-slate-800 bg-[#0e131f] px-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-slate-200">
            Diff de Alterações: <span className="font-mono text-teal-400">{diff.path}</span>
          </span>
          <div className="flex items-center gap-1.5 text-[11px] ml-2 font-mono">
            <span className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
              +{addedCount}
            </span>
            <span className="text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-800/40">
              -{removedCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRevert(diff.path, diff.oldContent)}
            className="flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 px-2.5 py-1 rounded transition-colors"
            title="Desfazer as alterações feitas pelo agente e restaurar a versão anterior"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reverter Arquivo</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Fechar visualizador de diff"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Diff Table */}
      <div className="flex-1 overflow-auto font-mono text-[12px] leading-relaxed p-2">
        <div className="min-w-full">
          {diffLines.map((line, idx) => {
            if (line.type === 'added') {
              return (
                <div
                  key={idx}
                  className="flex items-start bg-emerald-950/25 text-emerald-200 hover:bg-emerald-950/40 transition-colors"
                >
                  <span className="w-10 select-none text-right pr-2 text-slate-600 font-mono"></span>
                  <span className="w-10 select-none text-right pr-2 text-emerald-500 font-mono">
                    {line.newLineNumber}
                  </span>
                  <span className="w-6 select-none text-center text-emerald-400 font-bold shrink-0">
                    +
                  </span>
                  <span className="flex-1 whitespace-pre pl-1">{line.text || ' '}</span>
                </div>
              );
            }

            if (line.type === 'removed') {
              return (
                <div
                  key={idx}
                  className="flex items-start bg-rose-950/30 text-rose-300 hover:bg-rose-950/45 transition-colors"
                >
                  <span className="w-10 select-none text-right pr-2 text-rose-500 font-mono">
                    {line.oldLineNumber}
                  </span>
                  <span className="w-10 select-none text-right pr-2 text-slate-600 font-mono"></span>
                  <span className="w-6 select-none text-center text-rose-400 font-bold shrink-0">
                    -
                  </span>
                  <span className="flex-1 whitespace-pre pl-1 line-through opacity-80">
                    {line.text || ' '}
                  </span>
                </div>
              );
            }

            return (
              <div key={idx} className="flex items-start text-slate-400 hover:bg-slate-900/40 transition-colors">
                <span className="w-10 select-none text-right pr-2 text-slate-600 font-mono">
                  {line.oldLineNumber}
                </span>
                <span className="w-10 select-none text-right pr-2 text-slate-600 font-mono">
                  {line.newLineNumber}
                </span>
                <span className="w-6 select-none text-center text-slate-600 shrink-0"> </span>
                <span className="flex-1 whitespace-pre pl-1">{line.text || ' '}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
