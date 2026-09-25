import { getOutboundConfig } from './twilioClient.js';

export class TelephonyProviderNotSupportedError extends Error {}

export interface PlaceCallParams {
  to: string;
  /**
   * Our own session id. Providers thread it back through whatever mechanism they use to reach us
   * mid-call (a TwiML query string today, room metadata on a SIP stack), so the media side can
   * resolve the session without a lookup by provider id.
   */
  sessionId: string;
}

export interface PlacedCall {
  /** The provider's id for this call — Twilio's CallSid, a SIP call-id, a room participant id. */
  callId: string;
  status: string;
  /** Caller ID actually used, which only the provider knows. */
  from: string;
}

/**
 * The seam between "decide to call this lead" and "make a phone ring".
 *
 * Everything valuable around a call — tenant scoping, the duplicate-dial guard, the transcript,
 * the `agent.call.ended` webhook — is provider-agnostic and lives in outboundCallService. Only
 * call origination differs between Twilio and a SIP stack, so only that is behind this interface.
 * The conversation itself deliberately is not: Twilio's turn-based TwiML and SIP's continuous RTP
 * stream have no honest common abstraction, and forcing one would cost more than it saves.
 */
export interface TelephonyProvider {
  readonly name: string;
  /**
   * Throws when this deployment cannot place calls at all. Called before a session is created, so
   * a misconfigured deployment fails without leaving an orphaned session behind.
   */
  assertConfigured(): void;
  placeCall(params: PlaceCallParams): Promise<PlacedCall>;
}

export const twilioTelephonyProvider: TelephonyProvider = {
  name: 'twilio',

  assertConfigured() {
    getOutboundConfig();
  },

  async placeCall({ to, sessionId }: PlaceCallParams): Promise<PlacedCall> {
    const { client, fromNumber, baseUrl } = getOutboundConfig();

    const call = await client.calls.create({
      to,
      from: fromNumber,
      method: 'POST',
      url: `${baseUrl}/api/telephony/twilio/outbound?sessionId=${encodeURIComponent(sessionId)}`,
      statusCallback: `${baseUrl}/api/telephony/twilio/status`,
      statusCallbackMethod: 'POST',
      // Twilio fires the `completed` event for every terminal outcome — answered, busy, no-answer,
      // failed and canceled all arrive here, which is what lets endCall record an unanswered call.
      statusCallbackEvent: ['completed'],
    });

    return { callId: call.sid, status: call.status, from: fromNumber };
  },
};

export function getTelephonyProvider(): TelephonyProvider {
  const configured = (process.env.TELEPHONY_PROVIDER || 'twilio').toLowerCase();

  switch (configured) {
    case 'twilio':
      return twilioTelephonyProvider;
    default:
      throw new TelephonyProviderNotSupportedError(
        `TELEPHONY_PROVIDER="${configured}" não é suportado. Valores válidos: twilio.`,
      );
  }
}
