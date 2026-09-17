export interface MotionVariantConfig {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  exit?: Record<string, unknown>;
  transition?: Record<string, unknown>;
}

export class AccessibleMotionAdapter {
  /**
   * Adapta as propriedades de animação caso a preferência de movimento reduzido esteja ativa.
   */
  getAccessibleVariant(
    standardVariant: MotionVariantConfig,
    prefersReducedMotion: boolean
  ): MotionVariantConfig {
    if (!prefersReducedMotion) {
      return standardVariant;
    }

    // Retorna animação instantânea (fade simples sem deslocamento espacial)
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.01 },
    };
  }

  /**
   * Retorna os estilos de transição CSS adequados para botões e elementos interativos.
   */
  getButtonInteractiveStyle(prefersReducedMotion: boolean): string {
    if (prefersReducedMotion) {
      return 'transition-none outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-500';
    }
    return 'transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-indigo-500';
  }
}

export const accessibleMotionAdapter = new AccessibleMotionAdapter();
