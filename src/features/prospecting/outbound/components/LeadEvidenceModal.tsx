import type React from 'react';
import { useEffect, useState } from 'react';
import type { FieldEvidence, ThemeMode, VerificationStatus } from '../types.js';
import { X, ShieldCheck, ShieldQuestion, ShieldAlert, HelpCircle, Loader2, FileSearch, AlertTriangle } from 'lucide-react';

interface LeadEvidenceModalProps {
  leadId: string;
  leadName: string;
  isOpen: boolean;
  onClose: () => void;
  theme?: ThemeMode;
}

const STATUS_META: Record<VerificationStatus, { label: string; icon: React.ReactNode; text: string; bg: string; border: string }> = {
  verified: { label: 'Verificado', icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  inferred: { label: 'Inferido', icon: <ShieldQuestion className="w-3.5 h-3.5" />, text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  unverified: { label: 'Não verificado', icon: <ShieldAlert className="w-3.5 h-3.5" />, text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  conflicted: { label: 'Conflitante', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  // Nunca escondido/omitido: um campo sem nenhuma fonte confirmando é tão
  // relevante para "por que confiar nisso?" quanto um campo verificado.
  unknown: { label: 'Desconhecido', icon: <HelpCircle className="w-3.5 h-3.5" />, text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30 border-dashed' }
};

const FIELD_LABELS: Record<string, string> = {
  razao_social: 'Razão Social',
  situacao_cadastral: 'Situação Cadastral',
  cnae_fiscal_descricao: 'CNAE Principal',
  capital_social: 'Capital Social',
  decision_maker_name: 'Nome do Decisor',
  decision_maker_title: 'Cargo do Decisor',
  decision_maker_email: 'E-mail do Decisor',
  decision_maker_linkedin: 'LinkedIn do Decisor',
  company_linkedin: 'LinkedIn da Empresa'
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export const LeadEvidenceModal: React.FC<LeadEvidenceModalProps> = ({ leadId, leadName, isOpen, onClose, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [evidence, setEvidence] = useState<FieldEvidence[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetch(`/api/leads/${leadId}/evidence`)
      .then(res => {
        if (!res.ok) throw new Error(`Falha ao buscar evidências (HTTP ${res.status})`);
        return res.json();
      })
      .then(data => {
        if (!cancelled) setEvidence(Array.isArray(data.evidence) ? data.evidence : []);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Falha de conexão ao buscar evidências.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, leadId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <div
        className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[85vh] flex flex-col border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-5 border-b flex items-center justify-between sticky top-0 z-10 ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <FileSearch className="w-5 h-5 text-[var(--brand-primary)] shrink-0" />
            <div className="min-w-0">
              <h3 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Evidências de campo — {leadName}
              </h3>
              <p className="text-[11px] text-slate-400">
                Por que confiar em cada dado: provedor, confiança e status de verificação.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl shrink-0 transition ${
              isDark ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2.5 overflow-y-auto flex-1">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Buscando evidências registradas...</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {!isLoading && !error && evidence !== null && evidence.length === 0 && (
            <div className={`p-4 rounded-xl border text-xs ${isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              Nenhuma evidência registrada para este lead. Isso significa que o pipeline não
              encontrou (ou este lead foi salvo antes da Wave 6 / Evidence &amp; Provenance) —
              nunca é sinal de que os dados exibidos no card são inventados.
            </div>
          )}

          {!isLoading && !error && evidence && evidence.length > 0 && evidence.map((ev) => {
            const meta = STATUS_META[ev.verificationStatus];
            return (
              <div key={ev.id} className={`p-3 rounded-xl border ${meta.bg} ${meta.border}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {FIELD_LABELS[ev.field] || ev.field}
                  </span>
                  <span className={`flex items-center gap-1 text-[10px] font-bold font-mono ${meta.text}`}>
                    {meta.icon}
                    {meta.label}
                  </span>
                </div>
                <p className={`text-xs mt-1 font-mono break-words ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {ev.value === null || ev.value === undefined || ev.value === '' ? '(vazio)' : String(ev.value)}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-slate-400">
                  <span>provedor: <strong className={isDark ? 'text-slate-300' : 'text-slate-600'}>{ev.provider}</strong></span>
                  <span>confiança: <strong className={isDark ? 'text-slate-300' : 'text-slate-600'}>{Math.round(ev.confidence * 100)}%</strong></span>
                  <span>obtido em: <strong className={isDark ? 'text-slate-300' : 'text-slate-600'}>{formatDate(ev.retrievedAt)}</strong></span>
                  {ev.expiresAt && (
                    <span>expira em: <strong className={isDark ? 'text-slate-300' : 'text-slate-600'}>{formatDate(ev.expiresAt)}</strong></span>
                  )}
                  {ev.sourceReference && (
                    <span className="truncate max-w-full">fonte: <strong className={isDark ? 'text-slate-300' : 'text-slate-600'}>{ev.sourceReference}</strong></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
