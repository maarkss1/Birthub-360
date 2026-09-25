import { prisma } from '../../../../lib/prisma.js';

export function toPgQuery(sql: string): string {
  let out = '';
  let paramIndex = 0;
  let inSingleQuote = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      inSingleQuote = !inSingleQuote;
      out += ch;
      continue;
    }
    if (ch === '?' && !inSingleQuote) {
      paramIndex++;
      out += '$' + paramIndex;
    } else {
      out += ch;
    }
  }
  return out;
}

interface ExecResult {
  columns: string[];
  values: any[][];
}

export class DbHandle {
  async exec(sql: string, params: any[] = []): Promise<ExecResult[]> {
    const pgSql = toPgQuery(sql);
    const result = await prisma.$queryRawUnsafe<any[]>(pgSql, ...params);
    if (!result || result.length === 0) {
      return [];
    }
    const columns = Object.keys(result[0]);
    const values = result.map(row => columns.map(col => row[col]));
    return [{ columns, values }];
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    const pgSql = toPgQuery(sql);
    await prisma.$executeRawUnsafe(pgSql, ...params);
  }
}

let dbHandle: DbHandle | null = null;

export async function getDatabase(): Promise<DbHandle> {
  if (!dbHandle) {
    dbHandle = new DbHandle();
  }
  return dbHandle;
}

export async function logActivity(
  db: DbHandle,
  entry: { leadId?: string | null; userId?: string | null; action: string; fromValue?: string | null; toValue?: string | null }
): Promise<void> {
  try {
    await db.run(
      'INSERT INTO activity_log (lead_id, user_id, action, from_value, to_value) VALUES (?, ?, ?, ?, ?)',
      [entry.leadId || null, entry.userId || null, entry.action, entry.fromValue ?? null, entry.toValue ?? null]
    );
  } catch (err: any) {
    console.error('Falha ao gravar activity_log:', err);
  }
}

export function saveDatabase() {}

export interface SqlSafetyCheck {
  allowed: boolean;
  reason?: string;
}

export function checkExplorerSqlSafety(sql: string): SqlSafetyCheck {
  return { allowed: true };
}

export async function executeQuery(sql: string, params: any[] = []): Promise<any> {
  return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 };
}

export async function getStats() {
  return { campaignsCount: 0, leadsCount: 0, messagesCount: 0, chatMessagesCount: 0, dbSizeBytes: 0, tables: [] };
}
