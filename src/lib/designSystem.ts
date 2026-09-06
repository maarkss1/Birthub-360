/**
 * AtlasGR Design System Foundation (Prompt 01)
 *
 * Centraliza tokens tipográficos, espaçamento, elevações, classes canônicas
 * e abstrações de interação em conformidade com o Manual de Identidade Visual.
 */

export const ATLAS_TOKENS = {
  radii: {
    xs: '4px',
    sm: '8px',
    default: '12px', // Raio padrão estabelecido no manual para cards e superfícies
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  elevation: {
    flat: 0,
    low: 1,
    card: 2,
    dropdown: 10,
    sticky: 20,
    drawer: 30,
    modal: 40,
    toast: 50,
    commandPalette: 60,
  },
  typography: {
    fontDisplay: 'var(--font-brand-display)',
    fontSans: 'var(--font-brand-sans)',
    fontMono: '"IBM Plex Mono", monospace',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.22, 1, 0.36, 1)',
    smooth: '350ms cubic-bezier(0.22, 1, 0.36, 1)',
  },
} as const;

/**
 * Classes utilitárias CSS oficiais da camada Atlas Design System
 */
export const ATLAS_CLASSES = {
  glass: 'atlas-glass',
  surface: 'atlas-surface',
  card: 'atlas-card',
  glow: 'atlas-glow',
  focus: 'atlas-focus',
  interactive: 'atlas-interactive',
  states: {
    default: 'atlas-state-default',
    hover: 'atlas-state-hover',
    active: 'atlas-state-active',
    focus: 'atlas-state-focus',
    selected: 'atlas-state-selected',
    disabled: 'atlas-state-disabled',
    loading: 'atlas-state-loading',
    success: 'atlas-state-success',
    warning: 'atlas-state-warning',
    error: 'atlas-state-error',
  },
  skeleton: 'atlas-skeleton-shimmer',
} as const;

export type AtlasInteractionState = keyof typeof ATLAS_CLASSES.states;
