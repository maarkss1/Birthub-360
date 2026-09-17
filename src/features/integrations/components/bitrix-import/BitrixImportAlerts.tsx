import { AlertTriangle, CheckCircle2, Lock, ShieldCheck, XCircle } from 'lucide-react';

export function BitrixImportAlerts({
  error,
  restrictedWarning,
  importResult,
}: {
  error: string;
  restrictedWarning: string;
  importResult: {
    imported: number;
    skipped: number;
    skippedConflicts: number;
    skippedNotOwned: number;
    failed?: number;
  } | null;
}) {
  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3.5 rounded-2xl border border-red-200">
          {error}
        </p>
      )}
      {!error && restrictedWarning && (
        <p className="text-xs text-warning-active dark:text-warning flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 p-3.5 rounded-2xl border border-amber-200 font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0 text-warning-active dark:text-warning" />{' '}
          {restrictedWarning}
        </p>
      )}

      {importResult && (
        <div className="text-xs space-y-1 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-3xl shadow-sm">
          <p className="text-green-700 dark:text-green-400 font-bold flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> {importResult.imported} registro(s)
            importado(s) com sucesso
            {importResult.skipped > 0 ? `, ${importResult.skipped} já existiam` : ''}.
          </p>
          {importResult.skippedConflicts > 0 && (
            <p className="text-warning-active dark:text-warning flex items-center gap-1.5 pl-6">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {importResult.skippedConflicts}{' '}
              bloqueado(s) — pertenciam a outro responsável.
            </p>
          )}
          {importResult.skippedNotOwned > 0 && (
            <p className="text-warning-active dark:text-warning flex items-center gap-1.5 pl-6">
              <Lock className="w-3.5 h-3.5 shrink-0" /> {importResult.skippedNotOwned} ignorado(s) —
              não atribuídos a você no Bitrix24.
            </p>
          )}
          {!!importResult.failed && importResult.failed > 0 && (
            <p className="text-red-600 dark:text-red-400 flex items-center gap-1.5 pl-6">
              <XCircle className="w-3.5 h-3.5 shrink-0" /> {importResult.failed} falharam de verdade
              (erro de rede/Bitrix) — os demais itens foram importados normalmente; tente novamente
              só para estes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
