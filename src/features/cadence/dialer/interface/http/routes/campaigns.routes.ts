import { Router } from "express";
import { z } from "zod";
import type { ManageCampaign } from "../../../application/use-cases/ManageCampaign.js";
import type { CampaignRepository } from "../../../application/ports/CampaignRepository.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const createCampaignSchema = z.object({
  name: z.string().min(1),
});

export function campaignsRoutes(deps: {
  manageCampaign: ManageCampaign;
  campaignRepository: CampaignRepository;
}): Router {
  const router = Router();

  router.get(
    "/campaigns",
    asyncHandler(async (_req, res) => {
      const campaigns = await deps.manageCampaign.list();
      res.json(campaigns.map((c) => c.toProps()));
    }),
  );

  router.post(
    "/campaigns",
    asyncHandler(async (req, res) => {
      const body = createCampaignSchema.parse(req.body);
      const campaign = await deps.manageCampaign.create(body.name);
      res.status(201).json(campaign.toProps());
    }),
  );

  router.get(
    "/campaigns/:id",
    asyncHandler(async (req, res) => {
      const id = z.string().uuid().parse(req.params["id"]);
      const campaign = await deps.manageCampaign.getById(id);
      res.json(campaign.toProps());
    }),
  );

  router.get(
    "/campaigns/:id/stats",
    asyncHandler(async (req, res) => {
      const id = z.string().uuid().parse(req.params["id"]);
      const stats = await deps.manageCampaign.getStats(id);
      res.json(stats);
    }),
  );

  router.post(
    "/campaigns/:id/start",
    asyncHandler(async (req, res) => {
      const id = z.string().uuid().parse(req.params["id"]);
      const campaign = await deps.manageCampaign.start(id);
      res.json(campaign.toProps());
    }),
  );

  router.post(
    "/campaigns/:id/pause",
    asyncHandler(async (req, res) => {
      const id = z.string().uuid().parse(req.params["id"]);
      const campaign = await deps.manageCampaign.pause(id);
      res.json(campaign.toProps());
    }),
  );

  router.post(
    "/campaigns/:id/resume",
    asyncHandler(async (req, res) => {
      const id = z.string().uuid().parse(req.params["id"]);
      const campaign = await deps.manageCampaign.resume(id);
      res.json(campaign.toProps());
    }),
  );

  router.post(
    "/campaigns/:id/finish",
    asyncHandler(async (req, res) => {
      const id = z.string().uuid().parse(req.params["id"]);
      const campaign = await deps.manageCampaign.finish(id);
      res.json(campaign.toProps());
    }),
  );

  return router;
}
