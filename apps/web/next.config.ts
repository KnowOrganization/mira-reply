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
    // Monorepo root — lets Turbopack resolve workspace packages (apps/* + packages/*).
    root: path.join(__dirname, "..", ".."),
  },
  // Compile the TS-source workspace packages this app imports (Drizzle client,
  // shared BetterAuth instance, shared contracts) — no prebuilt dist needed.
  transpilePackages: ["@shaiz/db", "@shaiz/auth", "@shaiz/shared"],
  allowedDevOrigins: ["*.trycloudflare.com"],
  async rewrites() {
    // afterFiles runs AFTER the filesystem — every /api/ig/* route (including
    // the Meta webhook, now an Elysia route) falls through to the Bun backend.
    // /api/auth/* (BetterAuth) is a Next file and isn't matched here.
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
