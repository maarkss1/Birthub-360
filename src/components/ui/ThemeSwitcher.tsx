import { motion, useReducedMotion } from 'framer-motion';
import { Monitor, Moon, Sun, Sparkles } from 'lucide-react';
import type React from 'react';
import { SoundFX } from '../../lib/soundEffects';
import { cn } from '../../lib/utils';

export type ThemeStyle = 'classic' | 'futuristic' | 'neon';

export interface ThemeSwitcherProps {
  currentStyle: ThemeStyle;
  onStyleChange: (style: ThemeStyle) => void;
  className?: string;
}

export function ThemeSwitcher({ currentStyle, onStyleChange, className }: ThemeSwitcherProps) {
  const shouldReduceMotion = useReducedMotion();

  const styles: { value: ThemeStyle; icon: React.ReactNode; label: string }[] = [
    {
      value: 'classic',
      icon: <Sun size={16} />,
      label: 'Clássico',
    },
    {
      value: 'futuristic',
      icon: <Sparkles size={16} />,
      label: 'Futurista',
    },
    {
      value: 'neon',
      icon: <Moon size={16} />,
      label: 'Neon',
    },
  ];

  const handleStyleChange = (style: ThemeStyle) => {
    if (style !== currentStyle) {
      SoundFX.play('focus');
      onStyleChange(style);
    }
  };

  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-xl bg-surface-elevated/80 backdrop-blur-md border border-line', className)}>
      {styles.map((style) => (
        <motion.button
          key={style.value}
          type="button"
          onClick={() => handleStyleChange(style.value)}
          className={cn(
            'relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300',
            currentStyle === style.value
              ? 'bg-brand text-on-brand shadow-md'
              : 'text-ink-2 hover:text-ink hover:bg-surface-interactive',
          )}
          whileHover={!shouldReduceMotion ? { scale: 1.05 } : undefined}
          whileTap={!shouldReduceMotion ? { scale: 0.95 } : undefined}
          title={style.label}
        >
          {style.icon}
          <span className="hidden sm:inline">{style.label}</span>
          
          {currentStyle === style.value && (
            <motion.div
              className="absolute inset-0 rounded-lg bg-brand/20"
              layoutId="activeStyle"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}

export interface QuickThemeToggleProps {
  currentStyle: ThemeStyle;
  onStyleChange: (style: ThemeStyle) => void;
  className?: string;
}

export function QuickThemeToggle({ currentStyle, onStyleChange, className }: QuickThemeToggleProps) {
  const shouldReduceMotion = useReducedMotion();
  
  const nextStyle = () => {
    const styles: ThemeStyle[] = ['classic', 'futuristic', 'neon'];
    const currentIndex = styles.indexOf(currentStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    return styles[nextIndex];
  };

  const handleClick = () => {
    SoundFX.play('focus');
    onStyleChange(nextStyle());
  };

  const getIcon = () => {
    switch (currentStyle) {
      case 'classic':
        return <Sun size={20} />;
      case 'futuristic':
        return <Sparkles size={20} />;
      case 'neon':
        return <Moon size={20} />;
      default:
        return <Monitor size={20} />;
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className={cn(
        'relative flex items-center justify-center w-10 h-10 rounded-xl bg-surface-elevated/80 backdrop-blur-md border border-line text-ink-2 hover:text-ink hover:bg-surface-interactive transition-all duration-300',
        className,
      )}
      whileHover={!shouldReduceMotion ? { scale: 1.1, rotate: 15 } : undefined}
      whileTap={!shouldReduceMotion ? { scale: 0.9 } : undefined}
      title={`Mudar estilo (atual: ${currentStyle})`}
    >
      {getIcon()}
      
      <motion.div
        className="absolute inset-0 rounded-xl bg-brand/10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        transition={{ duration: 0.2 }}
      />
    </motion.button>
  );
}
