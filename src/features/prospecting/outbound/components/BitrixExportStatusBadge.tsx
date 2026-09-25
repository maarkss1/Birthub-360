import type React from 'react';
import type { ThemeMode } from '../types.js';
import { CheckCircle2, XCircle, ShieldOff, Clock } from 'lucide-react';

export type BitrixExportStatus = 'not_exported' | 'exported' | 'error' | 'blocked';

interface BitrixExportStatusBadgeProps {
  status: BitrixExportStatus;
  error?: string;
  exportedAt?: string;
  theme?: ThemeMode;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

// Wave 12 (CPI) - CRM/Operação: feedback real do último resultado de exportação
// persistido no lead (não só o resultado efêmero do clique nesta sessão) —
// "não exportado" nunca aparece com a mesma cor de "exportado com sucesso".
export const BitrixExportStatusBadge: React.FC<BitrixExportStatusBadgeProps> = ({ status, error, exportedAt, theme = 'dark' }) => {
  const isDark = theme === 'dark';

  if (status === 'not_exported') {
    return (
      <span
        className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold flex items-center gap-1 ${
          isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
        }`}
        title="Este lead ainda não foi enviado ao Bitrix24."
      >
        <Clock className="w-3 h-3" />
        <span>Não exportado</span>
      </span>
    );
  }

  if (status === 'exported') {
    return (
      <span
        className="px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
        title={exportedAt ? `Exportado com sucesso em ${formatDate(exportedAt)}` : 'Exportado com sucesso'}
      >
        <CheckCircle2 className="w-3 h-3" />
        <span>Exportado{exportedAt ? ` em ${formatDate(exportedAt)}` : ''}</span>
      </span>
    );
  }

  if (status === 'blocked') {
    return (
      <span
        className="px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 bg-amber-500/15 text-amber-500 border-amber-500/30 max-w-[220px]"
        title={error || 'Bloqueado pela checagem de elegibilidade (Wave 12) antes de qualquer envio ao Bitrix24.'}
      >
        <ShieldOff className="w-3 h-3 shrink-0" />
        <span className="truncate">Bloqueado: {error || 'não elegível'}</span>
      </span>
    );
  }

  // status === 'error'
  return (
    <span
      className="px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 bg-rose-500/15 text-rose-500 border-rose-500/30 max-w-[220px]"
      title={error || 'Falha ao exportar para o Bitrix24.'}
    >
      <XCircle className="w-3 h-3 shrink-0" />
      <span className="truncate">Erro: {error || 'falha desconhecida'}</span>
    </span>
  );
};
