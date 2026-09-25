import type { PrismaClient } from "@prisma/client";
import type { DncRepository } from "../../../application/ports/DncRepository.js";

// TODO: Refactor native SQL queries to use Prisma ORM directly.
export class PgDncRepository implements DncRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async isBlocked(phoneE164: string): Promise<boolean> {
    const rows = await this.prisma.$executeRawUnsafe("SELECT 1 FROM dnc_list WHERE phone = $1", [phoneE164]);
    return (((rows as any)?.length ?? rows) ?? 0) > 0;
  }

  async add(phoneE164: string, reason: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO dnc_list (phone, reason)
       VALUES ($1, $2)
       ON CONFLICT (phone) DO UPDATE SET reason = EXCLUDED.reason`,
      [phoneE164, reason],
    );
  }
}
