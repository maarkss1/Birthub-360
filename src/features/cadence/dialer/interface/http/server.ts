import express, { type Express } from "express";
import { pinoHttp } from "pino-http";
import type { Logger } from "../../infrastructure/logger.js";
import type { ManageCampaign } from "../../application/use-cases/ManageCampaign.js";
import type { ImportLeads } from "../../application/use-cases/ImportLeads.js";
import type { CampaignRepository } from "../../application/ports/CampaignRepository.js";
import type { DncRepository } from "../../application/ports/DncRepository.js";
import { healthRoutes } from "./routes/health.routes.js";
import { campaignsRoutes } from "./routes/campaigns.routes.js";
import { leadsRoutes } from "./routes/leads.routes.js";
import { dncRoutes } from "./routes/dnc.routes.js";
import { createErrorHandler } from "./middlewares/errorHandler.js";

export interface ServerDependencies {
  logger: Logger;
  manageCampaign: ManageCampaign;
  importLeads: ImportLeads;
  campaignRepository: CampaignRepository;
  dncRepository: DncRepository;
}

export function createServer(deps: ServerDependencies): Express {
  const app = express();

  app.use(pinoHttp({ logger: deps.logger }));
  app.use(express.json());

  app.use(healthRoutes());
  app.use(campaignsRoutes({ manageCampaign: deps.manageCampaign, campaignRepository: deps.campaignRepository }));
  app.use(leadsRoutes({ importLeads: deps.importLeads }));
  app.use(dncRoutes({ dncRepository: deps.dncRepository }));

  // Precisa ser o último `app.use`: middlewares de erro só funcionam
  // quando registrados depois de todas as rotas.
  app.use(createErrorHandler(deps.logger));

  return app;
}
