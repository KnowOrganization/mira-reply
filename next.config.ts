import type { NextConfig } from "next";
import path from "node:path";

// Strangler proxy: routes already ported to the Bun/Elysia backend are
// rewritten there; everything else still hits the local Next app/api routes.
// `beforeFiles` runs before filesystem routes, so it overrides the matching
// app/api/** route that still exists during the migration. As routes move,
// add them here; at cutover this collapses to a single /api/:path* rewrite.
const API_URL = process.env.API_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Let Next compile the Drizzle workspace package (TS source) — so the shared
  // BetterAuth instance + db client can be imported directly, no raw-SQL workaround.
  transpilePackages: ["@shaiz/db"],
  allowedDevOrigins: ["*.trycloudflare.com"],
  async rewrites() {
    // afterFiles runs AFTER the filesystem, so any /api/ig/* route that still
    // has a Next file (only the Meta `webhook` now) is served by Next; everything
    // else falls through to the Bun/Elysia backend. /api/auth/* (BetterAuth) is
    // a Next file too and isn't matched here. This is the Phase-E catch-all.
    return {
      afterFiles: [
        { source: "/api/ig/:path*", destination: `${API_URL}/api/ig/:path*` },
        { source: "/api/chat", destination: `${API_URL}/api/chat` },
        { source: "/api/playground/:path*", destination: `${API_URL}/api/playground/:path*` },
      ],
      beforeFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
