// Verification cleanup: deletes the throwaway better-auth test user + session
// created by verify-guarded-endpoints.ts (its in-script cleanup threw).
// Run from repo root: bun --env-file=.env.local scripts/verification-misc/cleanup-test-user.mjs
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 });
const del1 = await sql`delete from session where user_id in (select id from "user" where email = 'verify-test@example.invalid') returning id`;
const del2 = await sql`delete from "user" where email = 'verify-test@example.invalid' returning id`;
console.log("sessions deleted:", del1.length, "users deleted:", del2.length);
await sql.end();
