// Next 16 Proxy (middleware). Optimistic auth gate: every /api/ig/* (and
// /api/chat, /api/playground) request must carry a valid BetterAuth session,
// EXCEPT public Meta/OAuth endpoints. Runs before rewrites, so it covers both
// the Elysia-proxied routes and the in-Next brain routes.
//
// NOTE: this is an OPTIMISTIC check (Next docs). Each route ALSO enforces auth
// itself (Elysia routes via requireUser; un-migrated Next routes must add their
// own check) — never rely on the proxy alone.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/server";

const PUBLIC_PREFIXES = [
  "/api/ig/webhook", // Meta, HMAC-verified
  "/api/ig/callback", // Meta OAuth redirect (no session header)
  "/api/ig/connect", // reads the session cookie itself
];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  const userId = await getSessionUserId(req.headers);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.next();
}

export const config = {
  // Proxy always runs on Node.js in Next 16 — `runtime` key here is forbidden.
  matcher: ["/api/ig/:path*", "/api/chat/:path*", "/api/playground/:path*"],
};
