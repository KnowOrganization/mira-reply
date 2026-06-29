import { NextResponse, type NextRequest } from "next/server";

// The full Mira app is served on the public domain (login-gated by proxy.ts +
// per-route requireUser). Set PUBLIC_LANDING_ONLY=1 to restore the old
// marketing-only deploy: every non-landing/storefront route redirects to
// /landing. Static assets, _next, fonts, favicon are excluded via the matcher.
export function middleware(req: NextRequest) {
  if (process.env.PUBLIC_LANDING_ONLY !== "1") return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname === "/landing" || pathname.startsWith("/landing/")) {
    return NextResponse.next();
  }
  // Public storefront pages are served on the public deploy too.
  if (pathname.startsWith("/s/")) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/landing";
  return NextResponse.redirect(url);
}

export const config = {
  // run on everything except Next internals, static assets, api proxy, favicon
  matcher: ["/((?!_next/|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)"],
};
