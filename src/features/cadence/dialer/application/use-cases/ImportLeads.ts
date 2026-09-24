import { randomUUID } from "node:crypto";
import { Lead } from "../../domain/entities/Lead.js";
import { PhoneNumber } from "../../domain/value-objects/PhoneNumber.js";
import type { LeadRepository } from "../ports/LeadRepository.js";
import type { DncRepository } from "../ports/DncRepository.js";

export interface RawLeadInput {
  name: string;
  phone: string;
}

export interface ImportLeadsResult {
  imported: number;
  skippedInvalidPhone: number;
  skippedDuplicate: number;
  skippedDoNotCall: number;
}

export class ImportLeads {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly dncRepository: DncRepository,
  ) {}

  async execute(campaignId: string, rows: readonly RawLeadInput[]): Promise<ImportLeadsResult> {
    const result: ImportLeadsResult = {
      imported: 0,
      skippedInvalidPhone: 0,
      skippedDuplicate: 0,
      skippedDoNotCall: 0,
    };

    const toPersist: Lead[] = [];
    const seenInBatch = new Set<string>();

    for (const row of rows) {
      const phone = PhoneNumber.tryCreate(row.phone);
      if (phone === null) {
        result.skippedInvalidPhone += 1;
        continue;
      }

      const e164 = phone.toE164();

      if (seenInBatch.has(e164)) {
        result.skippedDuplicate += 1;
        continue;
      }

      const isDuplicate = await this.leadRepository.existsByCampaignAndPhone(
        campaignId,
        e164,
      );
      if (isDuplicate) {
        result.skippedDuplicate += 1;
        continue;
      }

      const isBlocked = await this.dncRepository.isBlocked(e164);
      if (isBlocked) {
        result.skippedDoNotCall += 1;
        continue;
      }

      seenInBatch.add(e164);
      const lead = Lead.create({
        id: randomUUID(),
        campaignId,
        name: row.name.trim(),
        phone,
      });
      toPersist.push(lead);
      result.imported += 1;
    }

    if (toPersist.length > 0) {
      await this.leadRepository.saveMany(toPersist);
    }

    return result;
  }
}
