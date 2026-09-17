import { describe, expect, it } from 'vitest';
import { ReleaseComplianceSignerService } from '../../../../src/features/release/services/releaseComplianceSigner.service.js';

describe('ReleaseComplianceSignerService (Agente 08)', () => {
  it('aprova o release e gera checksum assinado quando todos os gates passam', () => {
    const signer = new ReleaseComplianceSignerService();
    const cert = signer.generateCertificate('v2.0.0', {
      typescriptErrors: 0,
      biomeLintErrors: 0,
      unexemptHotspots: 0,
      unitTestsPassed: 3366,
      unitTestsFailed: 0,
    });

    expect(cert.status).toBe('RELEASE_APPROVED');
    expect(cert.checksum).toHaveLength(64);
    expect(signer.verifyCertificate(cert)).toBe(true);
  });

  it('bloqueia o release se houver qualquer erro de TypeScript ou testes falhando', () => {
    const signer = new ReleaseComplianceSignerService();
    const cert = signer.generateCertificate('v2.0.0', {
      typescriptErrors: 1,
      biomeLintErrors: 0,
      unexemptHotspots: 0,
      unitTestsPassed: 3360,
      unitTestsFailed: 1,
    });

    expect(cert.status).toBe('RELEASE_BLOCKED');
  });
});
