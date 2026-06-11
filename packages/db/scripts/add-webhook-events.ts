// One-off additive migration: append-only raw webhook event log.
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
await sql.unsafe(`
CREATE TABLE IF NOT EXISTS webhook_events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id   text NOT NULL,
  field        text NOT NULL,
  event_key    text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}',
  received_at  bigint NOT NULL DEFAULT 0,
  processed_at bigint,
  error        text
)`);
await sql.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_key ON webhook_events(event_key)`);
await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_webhook_events_account ON webhook_events(account_id, received_at)`);
const r = await sql`select to_regclass('webhook_events') as t`;
console.log("webhook_events:", r[0].t ? "ready" : "MISSING");
await sql.end();
process.exit(0);
