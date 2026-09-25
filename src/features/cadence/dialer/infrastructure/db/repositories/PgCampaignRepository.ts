import type { PrismaClient } from "@prisma/client";
import { prisma } from '../../../../../../lib/prisma';
import { Campaign, type CampaignProps, type CampaignStatus } from "../../../domain/entities/Campaign.js";
import type { CampaignRepository } from "../../../application/ports/CampaignRepository.js";

interface CampaignRow {
  id: string;
  name: string;
  status: CampaignStatus;
  created_at: Date;
  updated_at: Date;
}

function rowToProps(row: CampaignRow): CampaignProps {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// TODO: Refactor native SQL queries to use Prisma ORM directly.
export class PgCampaignRepository implements CampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(campaign: Campaign): Promise<void> {
    const props = campaign.toProps();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO campaigns (id, name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at`,
      [props.id, props.name, props.status, props.createdAt, props.updatedAt],
    );
  }

  async findById(id: string): Promise<Campaign | null> {
    const rows = await this.prisma.$queryRawUnsafe<CampaignRow[]>("SELECT * FROM campaigns WHERE id = $1", [
      id,
    ]);
    const row = rows[0];
    return row === undefined ? null : Campaign.restore(rowToProps(row));
  }

  async findActive(): Promise<Campaign[]> {
    const rows = await this.prisma.$queryRawUnsafe<CampaignRow[]>(
      "SELECT * FROM campaigns WHERE status = 'active' ORDER BY created_at DESC",
    );
    return rows.map((row) => Campaign.restore(rowToProps(row)));
  }

  async findAll(): Promise<Campaign[]> {
    const rows = await this.prisma.$queryRawUnsafe<CampaignRow[]>(
      "SELECT * FROM campaigns ORDER BY created_at DESC",
    );
    return rows.map((row) => Campaign.restore(rowToProps(row)));
  }
}
