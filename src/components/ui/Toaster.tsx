import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type ToastMessage, toast } from '../../lib/toast';

// bg-green-600 + text-white (abaixo) mede 3.30:1 contra o mínimo de 4.5:1 exigido pra texto normal
// (WCAG 2 AA) — achado real, medido com a fórmula oficial de luminância relativa, independente da
// falha intermitente de bg-red-600 no axe-core (ver comentário em animate-toast-in/globals.css: essa
// segunda era a animação de entrada do toast sendo capturada a meio caminho, não uma cor real
// insuficiente — bg-red-600 mede 4.83:1 em repouso, já dentro do mínimo). bg-green-700 mede 5.02:1.
const KIND_STYLES: Record<ToastMessage['kind'], { bg: string; icon: typeof CheckCircle2 }> = {
  success: { bg: 'bg-green-700/80 backdrop-blur-xl border border-green-500/30', icon: CheckCircle2 },
  error: { bg: 'bg-red-600/80 backdrop-blur-xl border border-red-500/30', icon: AlertTriangle },
  info: { bg: 'bg-obsidian/80 backdrop-blur-xl border border-white/10', icon: Info },
};

const AUTO_DISMISS_MS = 4500;

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return toast.subscribe((message) => {
      setToasts((prev) => [...prev, message]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== message.id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const { bg, icon: Icon } = KIND_STYLES[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.x > 100 || velocity.x > 500) {
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }
              }}
              role={t.kind === 'error' ? 'alert' : 'status'}
              aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
              className={`${bg} pointer-events-auto text-white px-4 py-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-start gap-2.5 text-sm font-medium`}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="flex-1">{t.text}</span>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                aria-label="Fechar notificação"
                className="shrink-0 opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
