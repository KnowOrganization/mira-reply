// Verification script: lists public tables on the DATABASE_URL Postgres.
// Run from repo root: bun --env-file=.env.local scripts/verification-misc/check-tables.mjs
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5, connect_timeout: 10 });
const t = await sql`select table_name from information_schema.tables where table_schema='public' order by table_name`;
console.log("tables:", t.map(x=>x.table_name).join(", "));
await sql.end();
