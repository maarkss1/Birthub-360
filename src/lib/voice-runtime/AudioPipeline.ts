import { AudioChunk } from './types';
import { streamingEngine } from './StreamingEngine';
import { observability } from './Observability';

export class AudioPipeline {
  
  public processInputChunk(sessionId: string, rawChunk: ArrayBuffer | Uint8Array): AudioChunk {
    // Pass-through without corrupting the audio since true WebRTC DSP requires native C++ addons
    // like @picovoice/cobra-node or webrtc-vad which are failing to install.
    
    // 3. Voice Activity Detection (VAD)
    const isSpeech = this.detectVoiceActivity(rawChunk);

    if (isSpeech) {
      observability.logEvent(sessionId, 'VAD_SPEECH_DETECTED');
      // Trigger barge-in if we are currently speaking
      streamingEngine.interrupt(sessionId);
    }

    return {
      data: rawChunk,
      timestamp: Date.now(),
      isSpeech
    };
  }

  private detectVoiceActivity(chunk: ArrayBuffer | Uint8Array): boolean {
    // VAD placeholder
    // Simple Energy Thresholding as VAD simulation for 16-bit PCM
    const buffer = chunk instanceof ArrayBuffer ? new Int16Array(chunk) : new Int16Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / 2);
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
       const sample = buffer[i] / 32768.0;
       sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / buffer.length);

    return rms > 0.05;
  }
}

export const audioPipeline = new AudioPipeline();
