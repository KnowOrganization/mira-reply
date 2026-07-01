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
  async headers() {
    // Baseline security headers on every response. CSP is intentionally omitted:
    // this app loads three.js/r3f/gsap/framer with inline/eval-heavy bundles, so
    // a correct CSP needs nonce wiring + a measured source allowlist — a wrong
    // one silently breaks WebGL. Tracked as a follow-up; these headers are the
    // zero-breakage wins. ponytail: add CSP once script/style sources are mapped.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    // afterFiles runs AFTER the filesystem — every /api/ig/* route (including
    // the Meta webhook, now an Elysia route) falls through to the Bun backend.
    // /api/auth/* (BetterAuth) is a Next file and isn't matched here.
    return {
      afterFiles: [
        { source: "/api/ig/:path*", destination: `${API_URL}/api/ig/:path*` },
        { source: "/api/store/:path*", destination: `${API_URL}/api/store/:path*` },
        { source: "/api/chat", destination: `${API_URL}/api/chat` },
        { source: "/api/playground/:path*", destination: `${API_URL}/api/playground/:path*` },
      ],
      beforeFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
