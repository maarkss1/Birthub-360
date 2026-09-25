import { randomUUID } from "node:crypto";
import { Campaign } from "../../domain/entities/Campaign.js";
import type { CampaignRepository } from "../ports/CampaignRepository.js";
import type { LeadRepository, CampaignStats } from "../ports/LeadRepository.js";

export class CampaignNotFoundError extends Error {
  constructor(id: string) {
    super(`Campanha não encontrada: ${id}`);
    this.name = "CampaignNotFoundError";
  }
}

export class ManageCampaign {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly leadRepository?: LeadRepository,
  ) {}

  async create(name: string): Promise<Campaign> {
    const campaign = Campaign.create({ id: randomUUID(), name });
    await this.campaignRepository.save(campaign);
    return campaign;
  }

  async list(): Promise<Campaign[]> {
    return this.campaignRepository.findAll();
  }

  async getById(campaignId: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (campaign === null) {
      throw new CampaignNotFoundError(campaignId);
    }
    return campaign;
  }

  async getStats(campaignId: string): Promise<CampaignStats> {
    await this.getById(campaignId);
    if (!this.leadRepository) {
      throw new Error("LeadRepository não configurado em ManageCampaign");
    }
    return this.leadRepository.getCampaignStats(campaignId);
  }

  async start(campaignId: string): Promise<Campaign> {
    return this.applyTransition(campaignId, (campaign) => campaign.start());
  }

  async pause(campaignId: string): Promise<Campaign> {
    return this.applyTransition(campaignId, (campaign) => campaign.pause());
  }

  async resume(campaignId: string): Promise<Campaign> {
    return this.applyTransition(campaignId, (campaign) => campaign.resume());
  }

  async finish(campaignId: string): Promise<Campaign> {
    return this.applyTransition(campaignId, (campaign) => campaign.finish());
  }

  private async applyTransition(
    campaignId: string,
    transition: (campaign: Campaign) => void,
  ): Promise<Campaign> {
    const campaign = await this.getById(campaignId);
    transition(campaign);
    await this.campaignRepository.save(campaign);
    return campaign;
  }
}
