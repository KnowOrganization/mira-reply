import { NextResponse, type NextRequest } from "next/server";

// Public deploy = landing page only. The full Mira app is kept off the public
// URL (you run it locally): every non-landing route redirects to /landing, so
// the dashboard/app is never served publicly. Static assets, _next, fonts, and
// favicon are excluded via the matcher so the landing renders correctly.
export function middleware(req: NextRequest) {
  // Only restrict on the public Vercel deploy. Locally (no VERCEL env) serve the
  // full Mira app as normal.
  if (!process.env.VERCEL) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname === "/landing" || pathname.startsWith("/landing/")) {
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
