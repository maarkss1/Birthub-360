import type { Campaign } from "../../domain/entities/Campaign.js";

export interface CampaignRepository {
  save(campaign: Campaign): Promise<void>;
  findById(id: string): Promise<Campaign | null>;
  findActive(): Promise<Campaign[]>;
  findAll(): Promise<Campaign[]>;
}
