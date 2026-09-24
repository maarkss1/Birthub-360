import { describe, it, expect } from 'vitest';
import { safeEqual } from './safeCompare.js';

describe('safeEqual', () => {
  it('returns true for identical strings', () => {
    expect(safeEqual('super-secret-value', 'super-secret-value')).toBe(true);
  });

  it('returns false for different strings of the same length', () => {
    expect(safeEqual('super-secret-value', 'super-secret-VALUE')).toBe(false);
  });

  it('returns false for strings of different lengths without throwing', () => {
    expect(safeEqual('short', 'a-much-longer-secret')).toBe(false);
  });

  it('returns false when compared against an empty string', () => {
    expect(safeEqual('anything', '')).toBe(false);
  });
});
