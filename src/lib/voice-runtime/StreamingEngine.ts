import { WebSocket } from 'ws';
import { AudioChunk } from './types';
import { observability } from './Observability';

type StreamCallback = (chunk: AudioChunk) => void;

export class StreamingEngine {
  private inputStreams: Map<string, ReadableStreamDefaultController<AudioChunk>> = new Map();
  private outputStreams: Map<string, ReadableStreamDefaultController<AudioChunk>> = new Map();
  private outputCallbacks: Map<string, StreamCallback[]> = new Map();
  private webSockets: Map<string, WebSocket> = new Map();

  public createSessionStreams(sessionId: string, wsConnection?: WebSocket) {
    if (wsConnection) {
      this.webSockets.set(sessionId, wsConnection);

      wsConnection.on('message', (msg: WebSocket.RawData) => {
        // Here we would parse Twilio media payload, or generic WebSocket binary frames
        const data: ArrayBuffer | Uint8Array = Array.isArray(msg) ? Buffer.concat(msg) : msg;
        const chunk: AudioChunk = {
          data,
          timestamp: Date.now(),
          isSpeech: true
        };
        this.writeInput(sessionId, chunk);
      });

      wsConnection.on('close', () => {
        this.cleanup(sessionId);
      });
    }

    const input = new ReadableStream<AudioChunk>({
      start: (controller) => {
        this.inputStreams.set(sessionId, controller);
      },
      cancel: () => {
        this.inputStreams.delete(sessionId);
      }
    });

    const output = new ReadableStream<AudioChunk>({
      start: (controller) => {
        this.outputStreams.set(sessionId, controller);
      },
      cancel: () => {
        this.outputStreams.delete(sessionId);
      }
    });

    this.outputCallbacks.set(sessionId, []);

    return { input, output };
  }

  public writeInput(sessionId: string, chunk: AudioChunk) {
    const controller = this.inputStreams.get(sessionId);
    if (controller) {
      controller.enqueue(chunk);
    }
  }

  public writeOutput(sessionId: string, chunk: AudioChunk) {
    const controller = this.outputStreams.get(sessionId);
    if (controller) {
      controller.enqueue(chunk);
    }

    const callbacks = this.outputCallbacks.get(sessionId) || [];
    callbacks.forEach(cb => cb(chunk));

    // Also send over WebSocket if connected
    const ws = this.webSockets.get(sessionId);
    if (ws && ws.readyState === 1) { // 1 = OPEN
      ws.send(chunk.data);
    }
  }

  public onOutput(sessionId: string, callback: StreamCallback) {
    const callbacks = this.outputCallbacks.get(sessionId) || [];
    callbacks.push(callback);
    this.outputCallbacks.set(sessionId, callbacks);
  }

  public interrupt(sessionId: string) {
    observability.logEvent(sessionId, 'STREAMING_INTERRUPTED');

    const ws = this.webSockets.get(sessionId);
    if (ws && ws.readyState === 1) {
       // Twilio specific clear instruction if using Media Streams, or general abort signal
       ws.send(JSON.stringify({ event: 'clear' }));
    }
  }

  public cleanup(sessionId: string) {
    const inCtrl = this.inputStreams.get(sessionId);
    if (inCtrl) {
      try { inCtrl.close(); } catch { /* already closed */ }
      this.inputStreams.delete(sessionId);
    }

    const outCtrl = this.outputStreams.get(sessionId);
    if (outCtrl) {
      try { outCtrl.close(); } catch { /* already closed */ }
      this.outputStreams.delete(sessionId);
    }

    this.outputCallbacks.delete(sessionId);

    const ws = this.webSockets.get(sessionId);
    if (ws) {
      ws.close();
      this.webSockets.delete(sessionId);
    }
  }
}

export const streamingEngine = new StreamingEngine();
