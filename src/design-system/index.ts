/**
 * BIRTH HUB 360° CANONICAL DESIGN SYSTEM
 * Single Source of Truth for Tokens, Component Metrics and Motion
 */

import componentsTokens from './tokens/components.json';
import primitivesTokens from './tokens/primitives.json';
import semanticDarkTokens from './tokens/semantic.dark.json';
import semanticLightTokens from './tokens/semantic.light.json';

export const tokens = {
  primitives: primitivesTokens,
  semantic: {
    light: semanticLightTokens,
    dark: semanticDarkTokens,
  },
  components: componentsTokens,
} as const;

export const MOTION_CONSTANTS = {
  EASE_PREMIUM: 'cubic-bezier(0.22, 1, 0.36, 1)',
  EASE_OUT_EXPO: 'cubic-bezier(0.16, 1, 0.3, 1)',
  EASE_IN_OUT_SMOOTH: 'cubic-bezier(0.4, 0, 0.2, 1)',
  duration: {
    instant: 100,
    fast: 180,
    base: 280,
    deliberate: 420,
    gentle: 600,
  },
  scale: {
    press: 0.98,
    subtle: 0.995,
  },
} as const;

export const Z_INDEX = {
  base: 0,
  card: 1,
  sticky: 10,
  header: 50,
  dropdown: 100,
  drawer: 400,
  modal: 500,
  popover: 600,
  toast: 700,
  tools: 800,
  tooltip: 900,
  system: 1000,
} as const;

export const LAYOUT_METRICS = {
  sidebar: {
    expanded: 260,
    collapsed: 64,
  },
  header: {
    height: 56,
  },
  container: {
    dashboardMax: 1440,
  },
} as const;
