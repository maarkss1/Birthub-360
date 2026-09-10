import { describe, expect, it } from 'vitest';
import {
  isAuthorizedLoginEmail,
  normalizeLoginEmail,
  getTenantFromEmail,
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

  it('deriva o segmento default a partir do e-mail (só rótulo de exibição, não gate de acesso)', () => {
    expect(getTenantFromEmail('marcelo@atlasgr.com.br')).toBe('atlasgr');
    expect(getTenantFromEmail('suporte@totaltrac.com.br')).toBe('totaltrac');
    expect(getTenantFromEmail('caue@totaltrack.com.br')).toBe('totaltrac');
    // Qualquer outra empresa cai no default 'atlasgr' — não é mais um erro nem
    // uma rejeição, é só o playbook inicial (editável depois).
    expect(getTenantFromEmail('contato@empresaexterna.com')).toBe('atlasgr');
  });
});
