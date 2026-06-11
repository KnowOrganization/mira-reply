import { Pool } from "pg";

// Durable multi-account state. Replaces the single-account file store
// (~/.mira/ig.json) for everything the automation funnel needs at scale:
// accounts (tokens), automations (node graphs), parked resumes, feed events.
// Hot/atomic state (dedup, locks) lives in Redis instead — see lib/ig/redis.ts.
const URL = process.env.DATABASE_URL || "postgresql://localhost:5432/mira";

const g = globalThis as unknown as { __mira_pg?: Pool; __mira_pg_init?: Promise<void> };
export const pool: Pool = g.__mira_pg ?? new Pool({ connectionString: URL, max: 10 });
if (!g.__mira_pg) g.__mira_pg = pool;

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  ig_user_id       text PRIMARY KEY,
  username         text NOT NULL DEFAULT '',
  access_token     text NOT NULL,
  token_expires_at bigint NOT NULL DEFAULT 0,
  connected_at     bigint NOT NULL DEFAULT 0,
  settings         jsonb NOT NULL DEFAULT '{}',
  updated_at       bigint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS automations (
  id         text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(ig_user_id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT 'Untitled',
  enabled    boolean NOT NULL DEFAULT false,
  trigger    jsonb NOT NULL DEFAULT '{}',
  nodes      jsonb NOT NULL DEFAULT '[]',
  edges      jsonb NOT NULL DEFAULT '[]',
  stats      jsonb NOT NULL DEFAULT '{}',
  created_at bigint NOT NULL DEFAULT 0,
  updated_at bigint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_automations_account ON automations(account_id);

CREATE TABLE IF NOT EXISTS pending_resume (
  id                 bigserial PRIMARY KEY,
  account_id         text NOT NULL,
  kind               text NOT NULL,                 -- 'button' | 'follow' | 'retry'
  from_user_id       text NOT NULL,
  from_username      text,
  comment_id         text,
  automation_id      text NOT NULL,
  remaining_node_ids jsonb NOT NULL DEFAULT '[]',
  not_before         bigint NOT NULL DEFAULT 0,
  attempts           int NOT NULL DEFAULT 0,
  ts                 bigint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pending_user ON pending_resume(account_id, from_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_kind ON pending_resume(account_id, kind);

CREATE TABLE IF NOT EXISTS feed_events (
  id         bigserial PRIMARY KEY,
  account_id text NOT NULL,
  kind       text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  ts         bigint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_feed_account_ts ON feed_events(account_id, ts DESC);

CREATE TABLE IF NOT EXISTS webhook_events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id   text NOT NULL,
  field        text NOT NULL,
  event_key    text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}',
  received_at  bigint NOT NULL DEFAULT 0,
  processed_at bigint,
  error        text
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_key ON webhook_events(event_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_account ON webhook_events(account_id, received_at);
`;

/** Idempotent schema init — safe to call on every boot. */
export function initSchema(): Promise<void> {
  if (!g.__mira_pg_init) {
    g.__mira_pg_init = pool.query(SCHEMA).then(() => undefined);
  }
  return g.__mira_pg_init;
}
