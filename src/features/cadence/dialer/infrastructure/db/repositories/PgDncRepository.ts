import type { Pool } from "pg";
import type { DncRepository } from "../../../application/ports/DncRepository.js";

export class PgDncRepository implements DncRepository {
  constructor(private readonly pool: Pool) {}

  async isBlocked(phoneE164: string): Promise<boolean> {
    const result = await this.pool.query("SELECT 1 FROM dnc_list WHERE phone = $1", [phoneE164]);
    return (result.rowCount ?? 0) > 0;
  }

  async add(phoneE164: string, reason: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO dnc_list (phone, reason)
       VALUES ($1, $2)
       ON CONFLICT (phone) DO UPDATE SET reason = EXCLUDED.reason`,
      [phoneE164, reason],
    );
  }
}
