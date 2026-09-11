/**
 * Fundação do design system.
 *
 * Centraliza tokens tipográficos, espaçamento, elevações, classes canônicas
 * e abstrações de interação, em conformidade com `identidade-visual/birthhub360/`.
 *
 * As constantes se chamavam DS_TOKENS/DS_CLASSES e as classes que elas
 * nomeiam tinham o prefixo `atlas-`; ambos passaram a `DS_*`/`bh-*` junto com a
 * troca de marca — os valores não mudaram.
 */

export const DS_TOKENS = {
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
 * Classes utilitárias CSS oficiais da camada de design system
 */
export const DS_CLASSES = {
  glass: 'bh-glass',
  surface: 'bh-surface',
  card: 'bh-card',
  glow: 'bh-glow',
  focus: 'bh-focus',
  interactive: 'bh-interactive',
  states: {
    default: 'bh-state-default',
    hover: 'bh-state-hover',
    active: 'bh-state-active',
    focus: 'bh-state-focus',
    selected: 'bh-state-selected',
    disabled: 'bh-state-disabled',
    loading: 'bh-state-loading',
    success: 'bh-state-success',
    warning: 'bh-state-warning',
    error: 'bh-state-error',
  },
  skeleton: 'bh-skeleton-shimmer',
} as const;

export type InteractionState = keyof typeof DS_CLASSES.states;
