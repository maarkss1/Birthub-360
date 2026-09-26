import type { RequestHandler } from 'express';

/** Keep legacy adapters closed until their identity and data isolation are migrated. */
export function unavailableLegacyModule(
  module: 'voice-hub' | 'outbound' | 'dialer-3cx',
): RequestHandler {
  return (_req, res) => {
    res.status(503).json({
      success: false,
      code: 'MODULE_NOT_READY',
      module,
      error: 'Módulo indisponível: integração segura por organização ainda não concluída.',
    });
  };
}
