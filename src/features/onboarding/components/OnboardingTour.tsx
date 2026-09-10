import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandOrb } from '../../../components/ui/BrandOrb';
import { Button } from '../../../components/ui/Button';
import { useTheme } from '../../../contexts/ThemeContext';
import { SoundFX } from '../../../lib/soundEffects';
import { ChevronRight, X } from 'lucide-react';

type TourStep = {
  id: number;
  message: string;
  position: 'center' | 'top-right' | 'bottom-center' | 'left-center';
};

const steps: TourStep[] = [
  {
    id: 1,
    message:
      'Olá! Bem-vindo à nossa plataforma B2B. Eu sou a Inteligência Artificial do sistema. Estou aqui para ajudar você a dominar a prospecção.',
    position: 'center',
  },
  {
    id: 2,
    message:
      'Aqui na página inicial, você deve escolher em qual operação deseja trabalhar: Birth Hub 360. Cada uma tem ferramentas e identidades próprias.',
    position: 'left-center',
  },
  {
    id: 3,
    message:
      "Na parte inferior, você sempre terá acesso ao 'Dock de Inteligências'. Lá estão nossas ferramentas avançadas, como o Copilot e o simulador de Roleplay.",
    position: 'bottom-center',
  },
  {
    id: 4,
    message:
      'Tudo pronto! Se precisar de mim, estarei sempre no canto inferior. Vamos começar a vender!',
    position: 'center',
  },
];

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Check if user has already seen the tour
    const hasSeen = localStorage.getItem('@prospector:has_seen_tour');
    if (!hasSeen) {
      // Delay before starting the tour
      // Sem chime aqui: tocar áudio sem nenhuma interação do usuário viola a regra de mídia da
      // Constituição (CLAUDE.md §9 — áudio nunca toca automaticamente por conveniência estética,
      // só com controle do usuário) e este componente não expõe nenhum controle de mute (o
      // `SoundFX.toggleMute()` existe na lib mas nunca é chamado daqui). O clique em "Avançar"
      // (handleNext, abaixo) já tem SoundFX.playClick(), que é som disparado por gesto real do
      // usuário — mantido. Achado desta auditoria.
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleNext = () => {
    SoundFX.playClick();
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('@prospector:has_seen_tour', 'true');
  };

  if (!isVisible) return null;

  const step = steps[currentStep];

  // Helper to map position to CSS classes
  const getPositionClasses = (pos: string) => {
    switch (pos) {
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'left-center':
        return 'top-1/2 left-32 -translate-y-1/2';
      case 'top-right':
        return 'top-20 right-20';
      case 'bottom-center':
        return 'bottom-32 left-1/2 -translate-x-1/2';
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dark overlay just for step 1 to focus attention */}
      <AnimatePresence>
        {currentStep === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className={`absolute flex flex-col items-center pointer-events-auto ${getPositionClasses(step.position)}`}
      >
        <div className="relative mb-6">
          <BrandOrb size={180} />
          {/* Pulsing indicator behind the orb */}
          <div className={`absolute inset-0 rounded-full animate-ping opacity-20 bg-brand`} />
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`backdrop-blur-xl border p-6 rounded-3xl shadow-2xl max-w-sm flex flex-col items-center text-center relative overflow-hidden ${
            theme === 'light'
              ? 'bg-white/70 border-white/50 text-slate-800'
              : 'bg-slate-900/80 border-white/10 text-white'
          }`}
        >
          {/* Subtle glow inside tooltip */}
          <div
            className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand/0 via-brand to-brand/0`}
          />

          <p className="text-base font-semibold leading-relaxed mb-6">{step.message}</p>

          <div className="flex w-full justify-between items-center mt-2">
            <button
              type="button"
              onClick={handleClose}
              className={`text-xs font-semibold transition-colors flex items-center gap-1 ${
                theme === 'light'
                  ? 'text-slate-500 hover:text-slate-800'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <X size={14} /> Pular Tour
            </button>
            <Button
              onClick={handleNext}
              className={`bg-brand text-on-brand hover:bg-brand-active shadow-lg`}
            >
              {currentStep === steps.length - 1 ? 'Começar' : 'Avançar'}{' '}
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
