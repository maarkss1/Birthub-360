import { describe, expect, it } from 'vitest';
import { AccessibleMotionAdapter } from '../../../../src/lib/ui/accessibleMotion.js';

describe('AccessibleMotionAdapter (Agente 03)', () => {
  it('retorna a variante de animação padrão quando prefersReducedMotion é falso', () => {
    const adapter = new AccessibleMotionAdapter();
    const standard = {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3 },
    };

    const variant = adapter.getAccessibleVariant(standard, false);
    expect(variant).toEqual(standard);
  });

  it('substitui por transição desativada/fade instantâneo se prefersReducedMotion é verdadeiro', () => {
    const adapter = new AccessibleMotionAdapter();
    const standard = {
      initial: { opacity: 0, y: 50 },
      animate: { opacity: 1, y: 0 },
    };

    const variant = adapter.getAccessibleVariant(standard, true);
    expect(variant.initial).toEqual({ opacity: 0 });
    expect(variant.animate).toEqual({ opacity: 1 });
    expect(variant.transition?.duration).toBe(0.01);
  });

  it('retorna classes de estilos acessíveis para botões', () => {
    const adapter = new AccessibleMotionAdapter();
    const activeMotionClass = adapter.getButtonInteractiveStyle(false);
    const reducedMotionClass = adapter.getButtonInteractiveStyle(true);

    expect(activeMotionClass).toContain('hover:scale-[1.02]');
    expect(reducedMotionClass).toContain('transition-none');
  });
});
