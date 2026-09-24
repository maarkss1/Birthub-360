import { Prisma } from '@prisma/client';
import * as agentRepository from '../repositories/agentRepository.js';
import * as sessionRepository from '../repositories/sessionRepository.js';
import { getTelephonyProvider } from './telephonyProvider.js';
import type { PhoneSessionMetadata } from './telephonyService.js';
import { logger } from '../lib/logger.js';

export class AgentNotFoundError extends Error {}
export class DuplicateCallError extends Error {}

export interface OutboundCallRequest {
  tenantId: string;
  agentId: string;
  /** E.164, validated at the route boundary. */
  targetNumber: string;
  /**
   * Arbitrary caller-supplied facts about who is being called (lead name, company, the reason for
   * the call). Made available to the agent's greeting template and echoed back on the
   * `agent.call.ended` webhook so the originating system can correlate the result.
   */
  context?: Record<string, unknown>;
  /** Per-call override of where `agent.call.ended` is delivered. */
  callbackUrl?: string;
}

export interface OutboundCallResult {
  sessionId: string;
  callSid: string;
  status: string;
}

/**
 * Places an outbound call and returns as soon as Twilio has accepted it — the conversation itself
 * happens later, over the TwiML webhooks, and the outcome arrives via the `agent.call.ended`
 * webhook. Callers get back a sessionId to correlate the two.
 */
export async function initiateOutboundCall(params: OutboundCallRequest): Promise<OutboundCallResult> {
  // Tenant-scoped lookup (not findAgentById) so one tenant can never dial using another's agent.
  const agent = await agentRepository.getAgent(params.agentId, params.tenantId);
  if (!agent) {
    throw new AgentNotFoundError('Agente não encontrado para este tenant.');
  }

  const provider = getTelephonyProvider();
  // Checked before the session is created so a misconfigured deployment fails without leaving an
  // orphaned "active" session behind — which the duplicate guard below would then treat as a real
  // call in flight, blocking this number indefinitely.
  provider.assertConfigured();

  const metadata: PhoneSessionMetadata = {
    direction: 'outbound',
    callSid: null,
    // Only the provider knows the caller ID it will actually use, so this is filled in below.
    from: null,
    to: params.targetNumber,
    context: params.context ?? {},
    callbackUrl: params.callbackUrl ?? null,
    turns: [],
  };

  // Double-submit / retry-of-queue guard: the "is a call already active for this number" check and
  // the session creation happen in one Serializable DB transaction (see
  // createOutboundPhoneSessionIfNoneInFlight) so two near-simultaneous requests for the same
  // tenant+number can never both slip through and dial the same lead twice. A losing concurrent
  // request surfaces here as a Postgres serialization failure (Prisma P2034), not as `inFlight`.
  let claim: Awaited<ReturnType<typeof sessionRepository.createOutboundPhoneSessionIfNoneInFlight>>;
  try {
    claim = await sessionRepository.createOutboundPhoneSessionIfNoneInFlight(
      agent.tenantId,
      agent.id,
      params.targetNumber,
      metadata,
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      logger.warn('[OutboundCall] Concurrent dial to the same number lost the double-submit race', {
        tenantId: agent.tenantId,
        to: params.targetNumber,
      });
      throw new DuplicateCallError('Já existe uma chamada em andamento para este número.');
    }
    throw err;
  }

  if (claim.inFlight || !claim.session) {
    throw new DuplicateCallError('Já existe uma chamada em andamento para este número.');
  }
  const session = claim.session;

  try {
    const call = await provider.placeCall({ to: params.targetNumber, sessionId: session.id });

    // Persisted as soon as the provider accepts the call rather than when the conversation starts:
    // a call that is never answered never reaches the media callback, and without the id stored
    // here the status callback could not find this session to record the "no answer" outcome.
    metadata.callSid = call.callId;
    metadata.from = call.from;
    await sessionRepository.updateSession(session.id, {
      metadata: metadata as unknown as Prisma.InputJsonValue,
    });

    logger.info('[OutboundCall] Call queued', {
      sessionId: session.id,
      callSid: call.callId,
      provider: provider.name,
      tenantId: agent.tenantId,
      agentId: agent.id,
    });

    return { sessionId: session.id, callSid: call.callId, status: call.status };
  } catch (err) {
    // The session was already created, so leaving it "active" would block every future call to
    // this number via the duplicate guard above.
    await sessionRepository.updateSession(session.id, { status: 'failed' });
    logger.error('[OutboundCall] Twilio rejected the call', {
      sessionId: session.id,
      to: params.targetNumber,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
