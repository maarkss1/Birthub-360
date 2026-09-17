export interface VoiceQualityMetrics {
  jitterMs: number;
  rttMs: number;
  packetLossPercent: number;
}

export interface VoiceQualityReport {
  mosScore: number;
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'BAD';
  recommendation?: string;
}

export class VoiceCallQualityMonitor {
  /**
   * Calcula o MOS Score (Mean Opinion Score) da chamada telefônica (escala de 1.0 a 5.0)
   * segundo o algoritmo ITU-T G.107 (E-model simplificado para WebRTC).
   */
  calculateMosScore(metrics: VoiceQualityMetrics): VoiceQualityReport {
    const { jitterMs, rttMs, packetLossPercent } = metrics;

    // Latência efetiva incluindo jitter
    const effectiveLatency = rttMs + jitterMs * 2 + 10;

    // Fator R base
    let rFactor = 93.2 - effectiveLatency / 40;
    if (effectiveLatency > 160) {
      rFactor = 93.2 - (effectiveLatency - 120) / 10;
    }

    // Penalização por perda de pacotes
    rFactor -= packetLossPercent * 2.5;
    rFactor = Math.max(0, Math.min(100, rFactor));

    // Conversão R-factor para MOS Score (1.0 - 4.5)
    let mos = 1 + 0.035 * rFactor + 0.000007 * rFactor * (rFactor - 60) * (100 - rFactor);
    mos = Math.max(1.0, Math.min(4.5, Number(mos.toFixed(2))));

    let rating: VoiceQualityReport['rating'] = 'EXCELLENT';
    let recommendation: string | undefined;

    if (mos >= 4.2) {
      rating = 'EXCELLENT';
    } else if (mos >= 3.8) {
      rating = 'GOOD';
    } else if (mos >= 3.3) {
      rating = 'FAIR';
      recommendation = 'Conexão estável, mas com pequena oscilação.';
    } else if (mos >= 2.5) {
      rating = 'POOR';
      recommendation = 'Instabilidade de rede detectada: verifique sinal Wi-Fi/4G.';
    } else {
      rating = 'BAD';
      recommendation = 'Qualidade crítica de áudio: recomende rediscagem ou canal alternativo.';
    }

    return {
      mosScore: mos,
      rating,
      recommendation,
    };
  }
}

export const voiceCallQualityMonitor = new VoiceCallQualityMonitor();
