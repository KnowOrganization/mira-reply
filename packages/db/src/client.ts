// Drizzle client over postgres-js. Points at DATABASE_URL — local Postgres in
// dev, Supabase in prod (same Postgres wire protocol, just swap the env var).
// Singleton on globalThis so Next HMR / repeated imports reuse one pool.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const URL = process.env.DATABASE_URL || "postgresql://localhost:5432/mira";

const g = globalThis as unknown as {
  __shaiz_sql?: ReturnType<typeof postgres>;
  __shaiz_db?: ReturnType<typeof drizzle<typeof schema>>;
};

// Supabase poolers need prepare:false; harmless on local Postgres too.
export const sql = g.__shaiz_sql ?? postgres(URL, { prepare: false, max: 10 });
if (!g.__shaiz_sql) g.__shaiz_sql = sql;

export const db = g.__shaiz_db ?? drizzle(sql, { schema });
if (!g.__shaiz_db) g.__shaiz_db = db;

export type DB = typeof db;
