import { describe, expect, it } from 'vitest';
import { VoiceCallQualityMonitor } from '../../../../../src/features/integrations/birth-voice/services/voiceQualityMonitor.service.js';

describe('VoiceCallQualityMonitor (Agente 12)', () => {
  it('calcula MOS Score excelente para métricas de baixa latência e 0% perda', () => {
    const monitor = new VoiceCallQualityMonitor();
    const report = monitor.calculateMosScore({
      rttMs: 30,
      jitterMs: 5,
      packetLossPercent: 0,
    });

    expect(report.mosScore).toBeGreaterThanOrEqual(4.2);
    expect(report.rating).toBe('EXCELLENT');
  });

  it('detecta perda de qualidade e emite recomendação para alta latência e packet loss', () => {
    const monitor = new VoiceCallQualityMonitor();
    const report = monitor.calculateMosScore({
      rttMs: 250,
      jitterMs: 45,
      packetLossPercent: 8,
    });

    expect(report.mosScore).toBeLessThan(3.0);
    expect(['POOR', 'BAD']).toContain(report.rating);
    expect(report.recommendation).toBeDefined();
  });
});
