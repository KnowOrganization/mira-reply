// One-off additive migration: account-level jsonb collections for store→core.
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
for (const c of ["dm_log", "post_dms_sent", "dm_blocked", "link_pending"]) {
  await sql.unsafe(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ${c} jsonb NOT NULL DEFAULT '[]'::jsonb`);
}
const r = await sql`select column_name from information_schema.columns where table_name='accounts' and column_name in ('dm_log','post_dms_sent','dm_blocked','link_pending')`;
console.log("added columns:", r.map((x) => x.column_name).sort().join(","));
await sql.end();
process.exit(0);
