// Verification script: checks the webhook_events row for the synthetic test
// event (processed_at / error state after the worker drains it).
// Run from repo root: bun --env-file=.env.local scripts/verification-misc/check-event.mjs
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 });
const rows = await sql`select event_key, account_id, field, received_at, processed_at, error from webhook_events where event_key = 'c_verify-test-123'`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
