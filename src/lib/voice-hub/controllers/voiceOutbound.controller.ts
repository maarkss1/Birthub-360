import { Request, Response } from 'express';
import { outboundCallSchema } from '../validators/index.js';
import { initiateOutboundCall, AgentNotFoundError, DuplicateCallError } from '../services/outboundCallService.js';
import { TwilioNotConfiguredError } from '../services/twilioClient.js';
import { logger } from '../lib/logger.js';

export async function initiateOutboundCallHandler(req: Request, res: Response) {
  const parsed = outboundCallSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  try {
    const result = await initiateOutboundCall({
      tenantId: req.tenantId!,
      agentId: parsed.data.agentId,
      targetNumber: parsed.data.targetNumber,
      context: parsed.data.context,
      callbackUrl: parsed.data.callbackUrl,
    });

    return res.status(202).json({ success: true, ...result });
  } catch (err) {
    if (err instanceof AgentNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof DuplicateCallError) {
      return res.status(409).json({ error: err.message });
    }
    if (err instanceof TwilioNotConfiguredError) {
      // A deployment gap, not a bad request — surfaced distinctly so an automated dialer can tell
      // "this will never work until an operator acts" from "this number failed".
      return res.status(503).json({ error: err.message });
    }

    logger.error('[VoiceOutbound] Failed to initiate call', err);
    return res.status(502).json({ error: 'Não foi possível iniciar a chamada no provedor de telefonia.' });
  }
}
