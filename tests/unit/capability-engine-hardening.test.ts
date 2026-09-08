import { describe, expect, it } from 'vitest';
import { canUserRolePerformCapabilityAction } from '../../src/features/job-roles/services/capabilityUserRolePolicy.js';
import { getVerifiedToolBinding } from '../../src/features/job-roles/catalog/verifiedToolBindings.js';

describe('Capability Engine hardening — UserRole policy', () => {
  it('mantém VISUALIZADOR estritamente em leitura', () => {
    expect(canUserRolePerformCapabilityAction('VISUALIZADOR', 'READ')).toBe(true);
    expect(canUserRolePerformCapabilityAction('VISUALIZADOR', 'EXECUTE')).toBe(false);
    expect(canUserRolePerformCapabilityAction('VISUALIZADOR', 'WRITE')).toBe(false);
    expect(canUserRolePerformCapabilityAction('VISUALIZADOR', 'ADMIN')).toBe(false);
  });

  it('SDR e CLOSER não podem continuar avaliação de capability ADMIN', () => {
    expect(canUserRolePerformCapabilityAction('SDR', 'ADMIN')).toBe(false);
    expect(canUserRolePerformCapabilityAction('CLOSER', 'ADMIN')).toBe(false);
    expect(canUserRolePerformCapabilityAction('SDR', 'WRITE')).toBe(true);
    expect(canUserRolePerformCapabilityAction('CLOSER', 'WRITE')).toBe(true);
  });

  it('GESTOR e ADMIN podem continuar avaliação de ADMIN sem bypassar grants funcionais', () => {
    expect(canUserRolePerformCapabilityAction('GESTOR', 'ADMIN')).toBe(true);
    expect(canUserRolePerformCapabilityAction('ADMIN', 'ADMIN')).toBe(true);
  });

  it('papel desconhecido falha fechado', () => {
    expect(canUserRolePerformCapabilityAction('SUPER_USER', 'READ')).toBe(false);
  });
});

describe('Capability Engine hardening — verified tool bindings', () => {
  it('mantém disponível somente binding com evidência explícita', () => {
    const binding = getVerifiedToolBinding('account.read');
    expect(binding?.available).toBe(true);
    expect(binding?.verification).toBe('VERIFIED');
    expect(binding?.binding).toBe('AccountIntelligenceService.getIntelligence');
    expect(binding?.evidencePath).toContain('accountIntelligence.service.ts');
  });

  it('rebaixa binding conceitual não verificado para FUTURE_TOOL', () => {
    const binding = getVerifiedToolBinding('outbound.generate_message');
    expect(binding?.available).toBe(false);
    expect(binding?.reason).toBe('FUTURE_TOOL');
    expect(binding?.verification).toBe('UNVERIFIED');
  });

  it('não confunde autorização com runtime de agente', () => {
    const binding = getVerifiedToolBinding('agent.execute');
    expect(binding?.available).toBe(false);
    expect(binding?.reason).toBe('FUTURE_TOOL');
  });

  it('preserva SOURCE_REQUIRED para faturamento sem fonte real', () => {
    const binding = getVerifiedToolBinding('billing.read');
    expect(binding?.available).toBe(false);
    expect(binding?.reason).toBe('SOURCE_REQUIRED');
  });
});
