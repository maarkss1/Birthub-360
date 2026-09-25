import { AudioChunk } from '../types';

export interface ProviderResponse {
  text?: string;
  audio?: AudioChunk;
  // A provider may return a raw upstream stream/iterator (e.g. an SDK's
  // async-iterable response or a Node Readable) whose concrete type differs
  // per provider/SDK; callers only ever forward it opaquely, so `unknown`
  // (narrowed by the caller when it knows the provider) is the honest type.
  stream?: unknown;
  error?: unknown;
  latencyMs: number;
}

/**
 * Text passed into a provider's `process()` call. Every current implementation
 * (Anthropic/OpenAI via `String(input)`, Gemini via `contents: input`, Twilio
 * ignoring it) treats this as plain utterance text, so `string` is the real
 * shared shape rather than a guessed object wrapper.
 */
export type ProviderInput = string;

/**
 * Conversational/memory context forwarded to a provider. Every implementation
 * that uses it does so via `JSON.stringify(context)` (never reads named
 * properties), and the only real caller passes MemoryPipeline.getContext()'s
 * result (or nothing). `Record<string, unknown>` captures that without
 * pretending there's a fixed schema.
 */
export type ProviderContext = Record<string, unknown> | null;

export abstract class BaseProvider {
  public abstract id: string;
  public abstract name: string;
  public abstract type: 'STT' | 'LLM' | 'TTS' | 'E2E';

  public abstract initialize(config: Record<string, unknown>): Promise<void>;
  public abstract process(input: ProviderInput, context?: ProviderContext): Promise<ProviderResponse>;
  public abstract checkHealth(): Promise<boolean>;
  public abstract destroy(): Promise<void>;
}
