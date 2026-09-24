import React, { useState } from 'react';
import {
  History,
  RotateCcw,
  Plus,
  Trash2,
  X,
  Clock,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  FolderGit2
} from 'lucide-react';
import { WorkspaceCheckpoint } from '../types/agent';

interface CheckpointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoints: WorkspaceCheckpoint[];
  onRestoreCheckpoint: (checkpoint: WorkspaceCheckpoint) => void;
  onCreateCheckpoint: (customPrompt?: string) => void;
  onDeleteCheckpoint: (id: string) => void;
}

export const CheckpointsModal: React.FC<CheckpointsModalProps> = ({
  isOpen,
  onClose,
  checkpoints,
  onRestoreCheckpoint,
  onCreateCheckpoint,
  onDeleteCheckpoint
}) => {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<WorkspaceCheckpoint | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    onCreateCheckpoint(manualTitle.trim());
    setManualTitle('');
    setIsCreating(false);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f141f] border border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#131a29]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Pontos de Restauração & Histórico (Checkpoints)
              </h2>
              <p className="text-xs text-slate-400">
                Restaurar versões anteriores do workspace com 1 clique (Rollback instantâneo)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-medium rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Ponto</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Create Manual Checkpoint Form */}
        {isCreating && (
          <form
            onSubmit={handleCreateSubmit}
            className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center gap-3"
          >
            <input
              type="text"
              autoFocus
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Nome ou descrição do checkpoint (ex: Antes de refatorar rotas)..."
              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
            >
              Salvar Ponto
            </button>
          </form>
        )}

        {/* Content Body: Left List, Right Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Checkpoint list */}
          <div className="w-1/2 border-r border-slate-800 overflow-y-auto p-3 space-y-2">
            {checkpoints.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <History className="w-8 h-8 text-slate-600" />
                <span>Nenhum ponto de restauração gravado ainda.</span>
                <span className="text-[11px] text-slate-600">
                  Checkpoints são criados automaticamente antes de cada tarefa do agente.
                </span>
              </div>
            ) : (
              checkpoints.map((cp, idx) => {
                const isSelected = selectedCheckpoint?.id === cp.id;
                return (
                  <div
                    key={cp.id}
                    onClick={() => setSelectedCheckpoint(cp)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/40 text-slate-100'
                        : 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono text-teal-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(cp.timestamp)}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                        {cp.fileCount} arquivos
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-200 line-clamp-2">
                      {cp.prompt || `Checkpoint #${checkpoints.length - idx}`}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `Deseja reverter todo o projeto para o checkpoint gravado em ${formatTime(
                                cp.timestamp
                              )}? Todas as alterações atuais não salvas serão substituídas.`
                            )
                          ) {
                            onRestoreCheckpoint(cp);
                            onClose();
                          }
                        }}
                        className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-semibold"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restaurar este ponto</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCheckpoint(cp.id);
                          if (selectedCheckpoint?.id === cp.id) {
                            setSelectedCheckpoint(null);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        title="Excluir este checkpoint"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Preview */}
          <div className="w-1/2 overflow-y-auto p-4 bg-[#0a0e17]/60">
            {selectedCheckpoint ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-200">
                    Arquivos salvos neste snapshot
                  </span>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Confirmar restauração para a versão de ${formatTime(
                            selectedCheckpoint.timestamp
                          )}?`
                        )
                      ) {
                        onRestoreCheckpoint(selectedCheckpoint);
                        onClose();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Aplicar Rollback</span>
                  </button>
                </div>

                <div className="space-y-1">
                  {Object.keys(selectedCheckpoint.files).map((p) => (
                    <div
                      key={p}
                      className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 text-xs font-mono"
                    >
                      <span className="text-slate-300 truncate">{p}</span>
                      <span className="text-[10px] text-slate-500">
                        {selectedCheckpoint.files[p].length} chars
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center">
                <FileCode className="w-8 h-8 text-slate-600 mb-2" />
                <span>Selecione um checkpoint ao lado para inspecionar os arquivos armazenados.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#131a29] flex items-center justify-between text-xs text-slate-400">
          <span>Total de {checkpoints.length} pontos salvos</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
