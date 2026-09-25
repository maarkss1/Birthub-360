import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { Logger } from "../../../infrastructure/logger.js";
import { InvalidCampaignTransitionError } from "../../../domain/entities/Campaign.js";
import { InvalidPhoneNumberError } from "../../../domain/value-objects/PhoneNumber.js";
import { CampaignNotFoundError } from "../../../application/use-cases/ManageCampaign.js";

/**
 * Traduz erros de domínio/aplicação conhecidos em respostas HTTP com o
 * status correto. Qualquer erro não mapeado vira 500 e é logado por
 * completo (nunca exposto ao cliente) — evita vazar detalhes internos.
 */
export function createErrorHandler(logger: Logger) {
  return function errorHandler(
    error: unknown,
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
  ): void {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "validation_error", details: error.flatten() });
      return;
    }

    if (error instanceof CampaignNotFoundError) {
      res.status(404).json({ error: "campaign_not_found", message: error.message });
      return;
    }

    if (error instanceof InvalidCampaignTransitionError) {
      res.status(409).json({ error: "invalid_campaign_transition", message: error.message });
      return;
    }

    if (error instanceof InvalidPhoneNumberError) {
      res.status(400).json({ error: "invalid_phone_number", message: error.message });
      return;
    }

    logger.error({ err: error }, "Erro não tratado ao processar requisição");
    res.status(500).json({ error: "internal_error" });
  };
}
