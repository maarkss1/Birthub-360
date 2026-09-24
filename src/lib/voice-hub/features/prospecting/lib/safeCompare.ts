import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison for secrets (shared webhook secrets, callback tokens). A naive
 * `a === b` leaks timing information proportional to how many leading characters match, which is
 * enough to brute-force a secret byte-by-byte over many requests. `timingSafeEqual` requires
 * equal-length buffers, so unequal lengths are treated as an immediate mismatch without ever
 * calling it (this is safe: length alone is not sensitive here — the secret's byte content is).
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
