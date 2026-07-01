import { NextResponse, type NextRequest } from "next/server";

// Authenticated route segments — direct URL access without a session cookie
// redirects to root (which shows the sign-in gate).
const PROTECTED = new Set([
  "dashboard", "brain", "automations", "inbox",
  "opportunities", "store", "settings",
]);

// The full Mira app is served on the public domain (login-gated by proxy.ts +
// per-route requireUser). Set PUBLIC_LANDING_ONLY=1 to restore the old
// marketing-only deploy: every non-landing/storefront route redirects to
// /landing. Static assets, _next, fonts, favicon are excluded via the matcher.
export function middleware(req: NextRequest) {
  if (process.env.PUBLIC_LANDING_ONLY === "1") {
    const { pathname } = req.nextUrl;
    if (pathname === "/landing" || pathname.startsWith("/landing/")) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/s/")) {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/landing";
    return NextResponse.redirect(url);
  }

  // Protect authenticated routes. Cookie presence is a fast path only —
  // AuthGate and the API layer perform real session validation.
  const segment = req.nextUrl.pathname.split("/")[1];
  if (PROTECTED.has(segment)) {
    const cookie =
      req.cookies.get("better-auth.session_token") ??
      req.cookies.get("__Secure-better-auth.session_token");
    if (!cookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // run on everything except Next internals, static assets, api proxy, favicon
  matcher: ["/((?!_next/|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)"],
};
