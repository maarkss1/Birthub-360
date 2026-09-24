import type { Lead } from "../../domain/entities/Lead.js";

export interface CampaignStats {
  campaignId: string;
  totalLeads: number;
  pending: number;
  inProgress: number;
  contacted: number;
  exhausted: number;
  doNotCall: number;
  invalidNumber: number;
  contactRatePercent: number;
}

export interface LeadRepository {
  save(lead: Lead): Promise<void>;
  saveMany(leads: readonly Lead[]): Promise<void>;
  findById(id: string): Promise<Lead | null>;
  /**
   * Seleciona um lote de leads elegíveis para discagem agora (respeitando o
   * limite `limit`) e já os marca como `in_progress` de forma atômica —
   * implementações contra banco real devem usar `SELECT ... FOR UPDATE SKIP
   * LOCKED` (ver `PgLeadRepository`) para que múltiplos processos do motor
   * de discagem rodando em paralelo nunca reservem o mesmo lead duas vezes.
   * Os leads retornados já vêm com `status === "in_progress"` persistido.
   */
  claimNextEligible(campaignId: string, now: Date, limit: number): Promise<Lead[]>;
  /** Usado para checar duplicidade na importação (mesmo telefone na mesma campanha). */
  existsByCampaignAndPhone(campaignId: string, phoneE164: string): Promise<boolean>;
  /** Retorna agregações de status de leads para uma campanha. */
  getCampaignStats(campaignId: string): Promise<CampaignStats>;
}
