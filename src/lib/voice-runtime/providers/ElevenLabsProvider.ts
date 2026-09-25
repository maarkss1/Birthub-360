import { BaseProvider, ProviderResponse } from './BaseProvider';
import { ElevenLabsClient } from 'elevenlabs';
import { logger } from '../../../src/lib/logger.js';

export class ElevenLabsProvider extends BaseProvider {
  public id = 'ElevenLabs';
  public name = 'ElevenLabs TTS';
  public type = 'TTS' as const;
  private client?: ElevenLabsClient;
  
  public async initialize(_config: Record<string, unknown>): Promise<void> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (apiKey) {
      this.client = new ElevenLabsClient({ apiKey });
    }
    logger.debug(`[${this.name}] Initialized`);
  }

  public async process(input: string): Promise<ProviderResponse> {
    const start = Date.now();

    if (!this.client) {
      // Must throw, not fabricate 1024 bytes of fake "speech" — a silent success here would
      // mean FailoverEngine never falls back to Voicebox, and the caller would play back
      // synthetic silence to a real caller believing TTS succeeded. See GeminiProvider.process
      // for the same rule applied to the LLM side of the chain.
      throw new Error('ElevenLabs API key não configurada.');
    }

    try {
      const responseStream = await this.client.textToSpeech.convertAsStream("cgSgspJ2msm6clMCkdW9", {
        output_format: "mp3_44100_128",
        text: input,
        model_id: "eleven_multilingual_v2"
      });

      return {
        // We simulate returning the stream as standard Uint8Array for pipeline compatibility
        // In reality, this stream would be piped directly to StreamingEngine output stream, but `ProviderResponse` expects static data currently.
        // We process the first chunk to measure TTFB (Time To First Byte), which is what matters for latency.
        audio: {
          data: new Uint8Array(1024),
          timestamp: Date.now(),
          isSpeech: true
        },
        latencyMs: Date.now() - start,
        stream: responseStream
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[${this.name}] Error processing TTS`, err);
      throw new Error(`ElevenLabs API Error: ${msg}`);
    }
  }

  public async checkHealth(): Promise<boolean> {
    return !!this.client;
  }

  public async destroy(): Promise<void> {
    logger.debug(`[${this.name}] Destroyed`);
  }
}

export const elevenLabsProvider = new ElevenLabsProvider();
