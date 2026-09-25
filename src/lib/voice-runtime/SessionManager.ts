import { VoiceSession, SessionState, AgentRuntimeConfig, ConversationTurn } from './types';
import { observability } from './Observability';
import { latencyMonitor } from './LatencyMonitor';
import { memoryPipeline } from './MemoryPipeline';
import { streamingEngine } from './StreamingEngine';
import { audioPipeline } from './AudioPipeline';
import { failoverEngine } from './FailoverEngine';
import { webhookService } from '../../src/services/webhook.service.js';
import { getAiConsent } from '../../src/services/settingService.js';

// A session with no activity for this long is considered abandoned. Without this, a session that
// never reaches endSession() (dropped WebSocket, crashed client, etc.) lives in `sessions` /
// MemoryPipeline / LatencyMonitor forever — real memory growth for a platform whose own pitch is
// "alto volume" (AGENTS.md §1), and a real cross-request risk: a sessionId that is never expired
// is a sessionId that can still be replayed against handleUserText indefinitely.
const SESSION_IDLE_TTL_MS = 30 * 60 * 1000;
const SESSION_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

export class SessionManager {
  private sessions: Map<string, VoiceSession> = new Map();
  private lastActivityAt: Map<string, number> = new Map();
  private sweepTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.sweepTimer = setInterval(() => this.sweepIdleSessions(), SESSION_SWEEP_INTERVAL_MS);
    // Never keep the Node process alive just for this housekeeping timer (matters for tests and
    // for clean shutdown under Cloud Run).
    this.sweepTimer.unref?.();
  }

  private sweepIdleSessions() {
    const now = Date.now();
    for (const [sessionId, lastActivity] of this.lastActivityAt.entries()) {
      if (now - lastActivity > SESSION_IDLE_TTL_MS) {
        observability.logEvent(sessionId, 'SESSION_EXPIRED_IDLE', { idleMs: now - lastActivity });
        this.endSession(sessionId);
      }
    }
  }

  private touch(sessionId: string) {
    this.lastActivityAt.set(sessionId, Date.now());
  }

  public createSession(agentId: string, callerId: string, config: AgentRuntimeConfig, tenantId: string): VoiceSession {
    const sessionId = `sess_${crypto.randomUUID()}`;

    const session: VoiceSession = {
      sessionId,
      agentId,
      tenantId,
      workspaceId: 'ws_default',
      organizationId: 'org_default',
      projectId: 'proj_default',
      callerId,
      channel: 'web',
      provider: config.providerLlm,
      status: 'Idle',
      durationMs: 0,
      latencyMs: 0,
      model: config.model,
      language: 'pt-BR',
      region: 'sa-east-1',
      history: [],
      events: []
    };

    this.sessions.set(sessionId, session);
    this.touch(sessionId);

    // Initialize pipelines
    latencyMonitor.initialize(sessionId);
    memoryPipeline.initialize(sessionId);
    streamingEngine.createSessionStreams(sessionId, undefined);

    observability.logEvent(sessionId, 'SESSION_CREATED', { agentId, callerId, tenantId });

    return session;
  }

  public updateState(sessionId: string, state: SessionState) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = state;
    observability.logEvent(sessionId, 'STATE_CHANGED', { state });
  }

  public async startSession(sessionId: string) {
    this.touch(sessionId);
    this.updateState(sessionId, 'Connecting');
    // Connect to external VoIP or WebRTC signaling
    this.updateState(sessionId, 'Listening');
  }

  public async processUserAudio(sessionId: string, rawAudio: ArrayBuffer) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.touch(sessionId);

    const chunk = audioPipeline.processInputChunk(sessionId, rawAudio);
    streamingEngine.writeInput(sessionId, chunk);
  }

  public async handleUserText(sessionId: string, text: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.touch(sessionId);

    this.updateState(sessionId, 'Thinking');

    const turn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    memoryPipeline.addTurn(sessionId, turn);

    // Context & RAG would happen here
    const context = memoryPipeline.getContext(sessionId);

    try {
      // AI consent check (LGPD, AGENTS.md bloqueador #8) — the contact's utterance and the
      // session's conversational context are personal/contact data. Never let them reach any
      // external LLM/TTS provider (including the "guaranteed" GoogleGemini fallback) for a
      // tenant that has not registered consent.
      const consent = await getAiConsent(session.tenantId);
      if (!consent.granted) {
        observability.logEvent(sessionId, 'AI_CONSENT_MISSING', { tenantId: session.tenantId });
        this.updateState(sessionId, 'Error');
        return;
      }

      observability.startSpan(`llm-${sessionId}`);

      const { result: response, providerUsed: llmProviderUsed, usedFallback: llmUsedFallback } =
        await failoverEngine.executeWithFailover(
          sessionId,
          'GenerateResponse',
          session.provider,
          'LLM',
          // 'GoogleGemini' is always the last link in the chain — the guaranteed fallback (see
          // AGENTS.md bloqueador #6). Deduplicated automatically if session.provider already is it.
          ['OpenAI', 'Anthropic', 'GoogleGemini'],
          async (provider) => {
            return await provider.process(text, context);
          },
          session.tenantId
        );

      latencyMonitor.recordProviderUsed(sessionId, 'llm', llmProviderUsed, llmUsedFallback);
      const latency = observability.endSpan(`llm-${sessionId}`, sessionId, 'LLM_COMPLETED', { providerUsed: llmProviderUsed, usedFallback: llmUsedFallback });
      if (latency) latencyMonitor.recordMetric(sessionId, 'llmMs', latency);

      // Handle Tools if LLM returned tool calls
      if (response.text) {
        this.updateState(sessionId, 'Speaking');

        const responseText = response.text;

        const assistantTurn: ConversationTurn = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: responseText,
          timestamp: Date.now()
        };

        memoryPipeline.addTurn(sessionId, assistantTurn);

        // TTS processing
        observability.startSpan(`tts-${sessionId}`);
        const { result: ttsResponse, providerUsed: ttsProviderUsed, usedFallback: ttsUsedFallback } =
          await failoverEngine.executeWithFailover(
            sessionId,
            'TextToSpeech',
            'Voicebox',
            'TTS',
            ['ElevenLabs'], // 'Deepgram' was never a registered provider — a phantom fallback id.
            async (provider) => {
              return await provider.process(responseText);
            },
            session.tenantId
          );
        latencyMonitor.recordProviderUsed(sessionId, 'tts', ttsProviderUsed, ttsUsedFallback);
        const ttsLatency = observability.endSpan(`tts-${sessionId}`, sessionId, 'TTS_COMPLETED', { providerUsed: ttsProviderUsed, usedFallback: ttsUsedFallback });
        if (ttsLatency) latencyMonitor.recordMetric(sessionId, 'ttsMs', ttsLatency);

        if (ttsResponse.audio) {
          streamingEngine.writeOutput(sessionId, ttsResponse.audio);
        }
      }

      this.updateState(sessionId, 'Listening');

    } catch (error: unknown) {
      this.updateState(sessionId, 'Error');
      const message = error instanceof Error ? error.message : String(error);
      observability.logEvent(sessionId, 'SESSION_ERROR', { error: message });
    }
  }

  public endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    this.updateState(sessionId, 'Finished');
    streamingEngine.cleanup(sessionId);

    observability.logEvent(sessionId, 'SESSION_ENDED');

    if (session) {
      // `webhookService.dispatch` is tenant-scoped. The legacy organizationId/workspaceId/projectId
      // fields are placeholders and must never be used as an ownership key for external delivery.
      webhookService.dispatch(session.tenantId, 'call.completed', {
        sessionId,
        durationMs: session.durationMs,
        agentId: session.agentId,
        history: session.history
      }).catch((err) => {
        observability.logEvent(sessionId, 'WEBHOOK_DISPATCH_ERROR', { error: String(err) });
      });
    }

    // Release all per-session state. Previously nothing here ever removed the session from
    // `sessions`/MemoryPipeline/LatencyMonitor — every call leaked for the lifetime of the
    // process, and a stale sessionId stayed indefinitely valid for handleUserText/
    // processUserAudio, which is both a resource leak and a concurrency/replay risk at the "alto
    // volume" this platform targets (AGENTS.md §1).
    memoryPipeline.clear(sessionId);
    latencyMonitor.clear(sessionId);
    this.sessions.delete(sessionId);
    this.lastActivityAt.delete(sessionId);
  }

  public getSession(sessionId: string) {
    return this.sessions.get(sessionId);
  }
}

export const sessionManager = new SessionManager();
