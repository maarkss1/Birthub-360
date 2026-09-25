import type React from 'react';
import { useState } from 'react';
import { Bug, X, Send, CheckCircle2 } from 'lucide-react';
import type { User } from '../types.js';

interface ReportErrorButtonProps {
  user?: User | null;
  page: string;
  isDark?: boolean;
}

// Botão flutuante presente em toda tela (login incluído) para o usuário reportar
// um problema na hora, sem precisar saber a quem recorrer. O relato vai para
// error_reports no Postgres — revisável depois pelo Explorador de Banco.
export function ReportErrorButton({ user, page, isDark = true }: ReportErrorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const close = () => {
    if (sending) return;
    setIsOpen(false);
    setSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await fetch('/api/error-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          page,
          userId: user?.id,
          userEmail: user?.email,
          userAgent: navigator.userAgent
        })
      });
      setSent(true);
      setMessage('');
      setTimeout(() => {
        setIsOpen(false);
        setSent(false);
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao enviar reporte:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-lg border text-xs font-semibold transition ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
        title="Reportar um problema"
      >
        <Bug className="w-4 h-4" />
        <span className="hidden sm:inline">Reportar problema</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 animate-in fade-in duration-150"
          onClick={close}
        >
          <div
            className={`w-full max-w-sm rounded-2xl shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {sent ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Reportado! Obrigado — vamos analisar.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Bug className="w-4 h-4 text-red-500" /> Reportar um problema
                  </h3>
                  <button
                    type="button"
                    onClick={close}
                    className={isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Conta o que aconteceu — a tela em que você está já vai junto no relato.
                </p>
                <textarea
                  autoFocus
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  placeholder="O que você esperava que acontecesse, e o que aconteceu de fato?"
                  className={`w-full rounded-xl text-sm p-3 outline-none border resize-none focus:ring-2 ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                  style={{ '--tw-ring-color': '#ef444433' } as React.CSSProperties}
                />
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="w-full mt-3 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {sending ? 'Enviando...' : (
                    <>
                      Enviar reporte
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
