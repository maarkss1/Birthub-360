import { Router } from "express";
import { z } from "zod";
import type { ImportLeads } from "../../../application/use-cases/ImportLeads.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const importLeadsSchema = z.object({
  leads: z
    .array(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
      }),
    )
    .min(1)
    .max(5000, "Envie no máximo 5000 leads por requisição"),
});

export function leadsRoutes(deps: { importLeads: ImportLeads }): Router {
  const router = Router();

  router.post(
    "/campaigns/:campaignId/leads/import",
    asyncHandler(async (req, res) => {
      const campaignId = z.string().uuid().parse(req.params.campaignId);
      const body = importLeadsSchema.parse(req.body);
      const result = await deps.importLeads.execute(campaignId, body.leads);
      res.status(201).json(result);
    }),
  );

  return router;
}
