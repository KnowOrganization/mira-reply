// Single BetterAuth instance — shared by the Next route handler, the Next proxy,
// and the Bun/Elysia API. Auth lives in OUR Postgres (Drizzle adapter), sessions
// are cookies (no JWT-in-header plumbing, no fetch monkey-patch). Both processes
// share the same secret + DB, so either can validate a session cookie.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins/bearer";
import { db, authSchema } from "@shaiz/db";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET || "dev-insecure-secret-change-me",
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  // Validate the session from a short-lived signed cookie instead of a DB lookup
  // on every request — the DB is far (Supabase ap-northeast-1), so a per-request
  // session query added ~200ms to EVERY authenticated call. 5-min cache, signed.
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  // bearer lets non-cookie clients (the Bun worker, tests) send the session token
  // as Authorization: Bearer too. Cookies remain the primary browser path.
  plugins: [bearer()],
  // baseURL + web origin + the mobile deep-link scheme (so the native app's
  // social-login callbackURL is allowed). Mobile signs in via /api/auth/sign-in/
  // social, reads the session token from the bearer plugin (/api/auth/token),
  // and signs out via /api/auth/sign-out — no custom native endpoints needed.
  trustedOrigins: [
    baseURL,
    process.env.NEXT_PUBLIC_BASE_URL || "",
    process.env.MOBILE_DEEP_LINK_SCHEME || "miraapp://",
  ].filter(Boolean),
});

export type Auth = typeof auth;

/** Resolve the logged-in user id from a request's headers (cookie or bearer). */
export async function getSessionUserId(headers: Headers): Promise<string | null> {
  const s = await auth.api.getSession({ headers });
  return s?.user?.id ?? null;
}
