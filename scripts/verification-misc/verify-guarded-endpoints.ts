// Verification script: creates a throwaway test user + session via
// better-auth's internal adapter, hits the guarded control endpoints with the
// bearer token, prints responses, then deletes the test user + session.
//
// NOTE: the internalAdapter.deleteSessions/deleteUser calls at the bottom threw
// in better-auth's adapter factory during the 2026-06-11 verification run; the
// test rows were cleaned up manually via SQL instead (see cleanup-test-user.mjs).
// Run from repo root: bun --env-file=.env.local scripts/verification-misc/verify-guarded-endpoints.ts
import { auth } from "../../lib/auth/server";

const ctx = await auth.$context;
const user = await ctx.internalAdapter.createUser({
  email: "verify-test@example.invalid",
  name: "Verify Test",
  emailVerified: false,
});
const session = await ctx.internalAdapter.createSession(user.id, undefined);
console.log("test user:", user.id, "session created");

const H = { authorization: `Bearer ${session.token}` };
for (const path of ["/api/ig/ingest-stats", "/api/ig/watcher", "/api/ig/status"]) {
  const res = await fetch(`http://127.0.0.1:4000${path}`, { headers: H });
  const body = await res.text();
  console.log(`${path} -> ${res.status}: ${body.slice(0, 500)}`);
}

// cleanup
await ctx.internalAdapter.deleteSessions(user.id);
await ctx.internalAdapter.deleteUser(user.id);
console.log("test user + session deleted");
process.exit(0);
