import crypto from 'node:crypto';

export interface GateVerificationResult {
  typescriptErrors: number;
  biomeLintErrors: number;
  unexemptHotspots: number;
  unitTestsPassed: number;
  unitTestsFailed: number;
}

export interface ReleaseComplianceCertificate {
  certificateId: string;
  version: string;
  timestamp: string;
  status: 'RELEASE_APPROVED' | 'RELEASE_BLOCKED';
  checksum: string;
  gateResults: GateVerificationResult;
}

export class ReleaseComplianceSignerService {
  generateCertificate(
    version: string,
    gates: GateVerificationResult,
    signingSecret = 'birthub-release-secret',
  ): ReleaseComplianceCertificate {
    const isApproved =
      gates.typescriptErrors === 0 &&
      gates.biomeLintErrors === 0 &&
      gates.unexemptHotspots === 0 &&
      gates.unitTestsFailed === 0;

    const certificateId = `cert-rel-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const status = isApproved ? 'RELEASE_APPROVED' : 'RELEASE_BLOCKED';

    const rawData = `${certificateId}:${version}:${timestamp}:${status}:${gates.unitTestsPassed}`;
    const checksum = crypto.createHmac('sha256', signingSecret).update(rawData).digest('hex');

    return {
      certificateId,
      version,
      timestamp,
      status,
      checksum,
      gateResults: gates,
    };
  }

  verifyCertificate(
    cert: ReleaseComplianceCertificate,
    signingSecret = 'birthub-release-secret',
  ): boolean {
    const rawData = `${cert.certificateId}:${cert.version}:${cert.timestamp}:${cert.status}:${cert.gateResults.unitTestsPassed}`;
    const expectedChecksum = crypto
      .createHmac('sha256', signingSecret)
      .update(rawData)
      .digest('hex');
    return cert.checksum === expectedChecksum;
  }
}

export const releaseComplianceSignerService = new ReleaseComplianceSignerService();
