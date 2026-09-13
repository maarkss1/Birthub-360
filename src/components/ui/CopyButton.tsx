import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SoundFX } from '../../lib/soundEffects';
import { cn } from '../../lib/utils';

export interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  timeout?: number;
  label?: string;
  copiedLabel?: string;
  showText?: boolean;
}

export function CopyButton({
  value,
  timeout = 2000,
  label = 'Copiar',
  copiedLabel = 'Copiado!',
  showText = false,
  className,
  onClick,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!value) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback para ambientes restritos
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      SoundFX.play('confirm');
      setCopied(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
      }, timeout);
    } catch {
      SoundFX.play('error');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-2 shadow-sm transition-all duration-200 hover:border-brand/30 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer active:scale-95',
        copied && 'border-ok/30 bg-ok/10 text-ok-active',
        className,
      )}
      {...props}
    >
      <span className={cn('transition-transform duration-200', copied && 'scale-110')}>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-ok-active animate-in zoom-in-50 duration-150" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </span>
      {showText && <span>{copied ? copiedLabel : label}</span>}
    </button>
  );
}
