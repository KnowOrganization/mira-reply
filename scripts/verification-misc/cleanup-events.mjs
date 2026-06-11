// Verification cleanup: removes the synthetic verify_test_acct rows from
// webhook_events after a pipeline verification run.
// Run from repo root: bun --env-file=.env.local scripts/verification-misc/cleanup-events.mjs
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 });
const del = await sql`delete from webhook_events where account_id = 'verify_test_acct' returning event_key`;
console.log("webhook_events deleted:", del.map(r => r.event_key));
await sql.end();
