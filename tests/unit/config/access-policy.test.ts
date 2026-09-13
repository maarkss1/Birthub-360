import { describe, expect, it } from 'vitest';
import {
  isAuthorizedLoginEmail,
  normalizeLoginEmail,
} from '../../../src/config/access-policy';

describe('access policy', () => {
  it('autoriza qualquer e-mail com formato válido, de qualquer empresa (sem allowlist de domínio)', () => {
    expect(isAuthorizedLoginEmail(' MARCELO.NASCIMENTO@ATLASGR.COM.BR ')).toBe(true);
    expect(isAuthorizedLoginEmail('novo.usuario@atlasgr.com.br')).toBe(true);
    expect(isAuthorizedLoginEmail('operador@totaltrac.com.br')).toBe(true);
    // O ICP da plataforma é "qualquer empresa com área comercial" (ver
    // docs/BrandConstitution.md) — domínios fora de atlasgr/totaltrac precisam
    // passar, não só os dois domínios legados.
    expect(isAuthorizedLoginEmail('contato@empresaexterna.com')).toBe(true);
    expect(isAuthorizedLoginEmail('usuario@gmail.com')).toBe(true);
  });

  it('rejeita e-mail malformado ou ausente', () => {
    expect(isAuthorizedLoginEmail('sem-arroba.com')).toBe(false);
    expect(isAuthorizedLoginEmail('sem-dominio@')).toBe(false);
    expect(isAuthorizedLoginEmail('')).toBe(false);
    expect(isAuthorizedLoginEmail(null)).toBe(false);
    expect(isAuthorizedLoginEmail(undefined)).toBe(false);
  });

  it('normalizes whitespace and letter casing', () => {
    expect(normalizeLoginEmail(' Joao.Reis@AtlasGR.com.br ')).toBe('joao.reis@atlasgr.com.br');
  });
});
