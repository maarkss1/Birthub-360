import { X } from 'lucide-react';
import type React from 'react';
import { useEffect, useId, useRef } from 'react';
import { cn } from '../../lib/utils';

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Normalmente uma string simples; aceita ReactNode para cabeçalhos com ícone/subtítulo (ex.:
      SavedSearchesModal) sem duplicar a estrutura de header fora deste componente. */
  title: React.ReactNode;
  children: React.ReactNode;
  /** Classe Tailwind de largura máxima do painel (ex.: "max-w-2xl"). Default: "max-w-md". */
  maxWidth?: string;
  /** Rodapé fixo (ex.: botões Cancelar/Salvar), renderizado fora da área rolável do corpo. */
  footer?: React.ReactNode;
  /** Quando true, clique no backdrop e Escape não fecham o dialog — use durante um submit em
      andamento. O botão de fechar (X) e qualquer botão dentro de `footer`/`children` continuam
      funcionando normalmente; é uma proteção contra fechamento acidental, não um lock total. */
  preventClose?: boolean;
  /** Ativa o efeito cinematográfico de borda em órbita contínua (ex: salvando formulário). */
  isLoading?: boolean;
};

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  footer,
  preventClose = false,
  isLoading = false,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const preventCloseRef = useRef(preventClose);
  onCloseRef.current = onClose;
  preventCloseRef.current = preventClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        previouslyFocused.current = document.activeElement as HTMLElement | null;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
      }
    } else {
      if (dialog.open) {
        dialog.close();
        document.body.style.overflow = '';
        previouslyFocused.current?.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      if (preventCloseRef.current) return;
      onCloseRef.current();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, []);

  // Bug real de acessibilidade/teclado corrigido (Onda 3, Agente 03): este componente tinha um
  // onKeyDown('Enter') no <dialog> que chamava onClose() a cada Enter, sem checar o alvo do
  // evento. Como Enter borbulha de qualquer <input>/<textarea>/<button> focado dentro do corpo
  // (todo formulário em Dialog — ContactForm, CompanyForm, PropostaForm, GoalEditorDialog etc. —
  // tem campos de texto), digitar num campo e apertar Enter fechava o modal e descartava o que a
  // pessoa tinha acabado de preencher, sem aviso. Escape para fechar já é tratado nativamente
  // acima ('cancel', disparado pelo <dialog>); Enter deve continuar tendo o comportamento nativo
  // de cada controle focado (ativar o botão em foco, ou nada em texto livre), não fechar o modal.
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (preventClose) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;
    if (!isInDialog) {
      onClose();
    }
  };

  return (
    // <dialog> nativo (não um <div> genérico): já tem semântica própria de modal, foco preso
    // dentro dele via showModal(), e Escape tratado pelo evento nativo 'cancel' (acima) — o
    // jsx-a11y não reconhece <dialog> como elemento interativo, então sinaliza o onClick de
    // "clicar fora fecha" como se fosse um <div> qualquer sem teclado. Padrão documentado pelo
    // próprio MDN para <dialog> + clique no backdrop; nenhum atalho de teclado fica sem
    // equivalente (Escape já fecha, foco já é gerenciado nativamente).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      className={cn(
        'backdrop:bg-black/40 open:animate-fade-in fixed m-auto rounded-2xl border border-line bg-surface-elevated/90 p-0 text-ink shadow-dialog outline-none backdrop:backdrop-blur-md sm:w-full transition-all',
        maxWidth,
        isLoading && 'border-transparent overflow-hidden isolate',
      )}
    >
      {isLoading && (
        <>
          <div className="absolute inset-[-100%] z-[-2] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,var(--brand)_50%,transparent_100%)] opacity-80 pointer-events-none" />
          <div className="absolute inset-[1.5px] z-[-1] rounded-[calc(1rem-1.5px)] bg-surface-elevated/95 backdrop-blur-xl pointer-events-none" />
        </>
      )}
      <div className={cn("flex max-h-[85vh] flex-col backdrop-blur-xl rounded-2xl relative z-10 transition-opacity duration-300", isLoading && "opacity-60 pointer-events-none select-none")}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          {typeof title === 'string' ? (
            <h2 id={titleId} className="font-display text-lg font-bold tracking-tight">
              {title}
            </h2>
          ) : (
            title
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-2 transition-all duration-200 hover:bg-surface-interactive hover:text-ink hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="p-4 border-t border-line shrink-0 flex justify-end gap-3">{footer}</div>
        )}
      </div>
    </dialog>
  );
}
