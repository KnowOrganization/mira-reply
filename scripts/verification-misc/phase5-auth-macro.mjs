// Phase 5 verification: prove the Elysia `auth` macro accepts a valid BetterAuth
// bearer session and injects context. Creates a throwaway user+session, hits a
// macro-guarded endpoint with the bearer token (expect NOT 401), then a few more,
// and cleans up via SQL. Run from repo root:
//   API_BASE=http://127.0.0.1:4004 bun --env-file=.env.local scripts/verification-misc/phase5-auth-macro.mjs
import { auth } from "@shaiz/auth";
import postgres from "postgres";

const BASE = process.env.API_BASE || "http://127.0.0.1:4004";
const ctx = await auth.$context;
const user = await ctx.internalAdapter.createUser({
  email: `phase5-${Date.now()}@example.invalid`,
  name: "Phase5 Test",
  emailVerified: false,
});
const session = await ctx.internalAdapter.createSession(user.id, undefined);
const H = { authorization: `Bearer ${session.token}` };

for (const path of ["/api/ig/status"]) {
  const noAuth = await fetch(`${BASE}${path}`);
  const withAuth = await fetch(`${BASE}${path}`, { headers: H });
  console.log(`${path}  no-auth=${noAuth.status}  bearer=${withAuth.status}  bearerBody=${(await withAuth.text()).slice(0, 120)}`);
}

// cleanup (SQL — internalAdapter delete threw in a prior run)
const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 });
await sql`delete from session where user_id = ${user.id}`;
await sql`delete from "user" where id = ${user.id}`;
await sql.end();
console.log("cleaned up throwaway user", user.id);
process.exit(0);
