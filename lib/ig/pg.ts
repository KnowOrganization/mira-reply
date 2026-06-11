import { Pool } from "pg";

// Durable multi-account state. Replaces the single-account file store
// (~/.mira/ig.json) for everything the automation funnel needs at scale:
// accounts (tokens), automations (node graphs), parked resumes, feed events.
// Hot/atomic state (dedup, locks) lives in Redis instead — see lib/ig/redis.ts.
//
// SCHEMA / DDL is owned SOLELY by Drizzle now (packages/db/src/schema.ts →
// packages/db/drizzle/ migrations). This module is just the data-access driver
// (simple queries via query(), transactions via pool.connect() in storeDb.ts /
// pending.ts). The previous raw `CREATE TABLE` block lived here AND in Drizzle —
// two schema sources that could drift; that duplicate is gone (Phase 3).
const URL = process.env.DATABASE_URL || "postgresql://localhost:5432/mira";

const g = globalThis as unknown as { __mira_pg?: Pool };
export const pool: Pool = g.__mira_pg ?? new Pool({ connectionString: URL, max: 10 });
if (!g.__mira_pg) g.__mira_pg = pool;

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

// Retained as a no-op so existing callers (worker boot, storeDb, pending,
// accountsRepo) keep compiling. DDL is applied via Drizzle migrations, not here.
export function initSchema(): Promise<void> {
  return Promise.resolve();
}
