// Mira backend — Bun + Elysia. Owns every API route, the watcher, and the
// BullMQ producers/worker. The Next.js app (apps/web, currently at repo root)
// proxies /api/* here via next.config rewrites during the strangler migration.
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { rateLimit } from "elysia-rate-limit";
import { redis } from "@/lib/ig/redis";
import { query } from "@shaiz/db";
import { initObservability, captureError, logEvent } from "@shaiz/shared";

void initObservability("mira-api");
import { statusRoute } from "./routes/status";
import { settingsRoute } from "./routes/settings";
import { automationsRoute } from "./routes/automations";
import { postConfigsRoute } from "./routes/postConfigs";
import { productsRoute } from "./routes/products";
import { streamRoute } from "./routes/stream";
import { authRoute } from "./routes/auth";
import { teamRoute } from "./routes/team";
import { postsRoute } from "./routes/posts";
import { inboxRoute } from "./routes/inbox";
import { crmRoute } from "./routes/crm";
import { opportunitiesRoute } from "./routes/opportunities";
import { analyticsRoute } from "./routes/analytics";
import { llmRoute } from "./routes/llm";
import { controlRoute } from "./routes/control";
import { webhookRoute } from "./routes/webhook";
import { storeRoute } from "./routes/store";
import { moderationRoute } from "./routes/moderation";
import { profileRoute } from "./routes/profile";
import { pushRoute } from "./routes/push";

// Railway (and most PaaS) inject PORT; honor it first, then API_PORT, then 4000.
const PORT = Number(process.env.PORT || process.env.API_PORT || 4000);

// Fail fast on missing required secrets/connections. In production a missing
// var is fatal (no silent insecure fallback); in dev we warn and continue so
// local work isn't blocked.
const REQUIRED_ENV = [
  "DATABASE_URL",
  "REDIS_URL",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
  "BETTER_AUTH_SECRET",
];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length) {
  const msg = `[api] missing required env: ${missingEnv.join(", ")}`;
  if (process.env.NODE_ENV === "production") throw new Error(msg);
  console.warn(`${msg} — continuing (NODE_ENV != production)`);
}

// Explicit origins (not reflect-any-with-credentials). Normal traffic comes
// server-side via the Next rewrite proxy, so this only matters for direct calls.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_BASE_URL || "",
].filter(Boolean);

// Security headers on every response (success + error). This is a JSON API:
// CSP belongs on the HTML-serving web app (set there via Next), so here we set
// the meaningful transport/sniffing/framing headers. HSTS is a no-op over plain
// HTTP and active once fronted by HTTPS (Railway/Vercel terminate TLS).
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
};

export const app = new Elysia()
  .onRequest(({ set }) => {
    Object.assign(set.headers, SECURITY_HEADERS);
  })
  // Single global error boundary. Validation -> 422 with field detail; framework
  // 404/parse -> clean status; anything else -> log full server-side, return a
  // generic message so internal/upstream detail never leaks to the client.
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 422;
      return { error: "invalid request", code: "VALIDATION", details: error.message };
    }
    if (code === "NOT_FOUND") { set.status = 404; return { error: "not found", code }; }
    if (code === "PARSE") { set.status = 400; return { error: "invalid body", code }; }
    captureError(error, { code });
    if (!set.status || Number(set.status) < 400) set.status = 500;
    return { error: "internal error", code: "INTERNAL" };
  })
  // Structured access log — one JSON line per request for the log aggregator.
  .onAfterResponse(({ request, set }) => {
    logEvent("req", {
      method: request.method,
      path: new URL(request.url).pathname,
      status: set.status,
    });
  })
  .use(
    swagger({
      documentation: {
        info: { title: "Mira API", version: "0.1.0" },
        tags: [
          { name: "auth", description: "Instagram OAuth & account connection" },
          { name: "settings", description: "Account & AI settings" },
          { name: "posts", description: "Posts management" },
          { name: "inbox", description: "Comments, mentions, knowledge base, drafts" },
          { name: "crm", description: "Conversations & DM management" },
          { name: "opportunities", description: "CRM opportunities & decisions" },
          { name: "analytics", description: "Dashboard, feed, brain, insights" },
          { name: "llm", description: "Agent, chat, playground" },
          { name: "automations", description: "Automation rules" },
          { name: "moderation", description: "Comment & user moderation" },
          { name: "team", description: "Orgs, members, invites" },
          { name: "store", description: "Public storefront (no auth)" },
          { name: "webhook", description: "Meta webhook (public)" },
        ],
      },
    })
  )
  .use(
    cors({
      origin: ALLOWED_ORIGINS,
      credentials: true,
      // explicit allowedHeaders (not undefined) — a real bug source per the
      // migration guideline; cover cookie + bearer auth + JSON.
      allowedHeaders: ["Content-Type", "Authorization"],
      preflight: true,
    })
  )
  // Inbound abuse/DoS/cost protection. Keyed per active account (so one tenant's
  // burst can't starve another) falling back to client IP for anonymous calls.
  // In-memory store — fine for the current single API instance; swap in a Redis
  // context if a second instance is ever added. 240 req/min is generous for the
  // dashboard while still bounding worst-case LLM spend and flood attempts.
  // ponytail: in-memory store, Redis context when multi-instance.
  .use(
    rateLimit({
      duration: 60_000,
      max: 240,
      errorResponse: new Response(
        JSON.stringify({ error: "rate limit exceeded", code: "RATE_LIMITED" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      ),
      generator: (request, server) =>
        request.headers.get("x-mira-account") ||
        server?.requestIP(request)?.address ||
        "anon",
      // Never throttle Meta's webhook (dropping events loses messages; it's
      // HMAC-verified + idempotent) or the uptime probes / API docs.
      skip: (request) => {
        const p = new URL(request.url).pathname;
        return (
          p.startsWith("/api/ig/webhook") ||
          p === "/health" ||
          p === "/ready" ||
          p.startsWith("/swagger")
        );
      },
    })
  )
  // Liveness — cheap, no dependencies. Process up = 200.
  .get("/health", () => ({ ok: true, service: "mira-api" }))
  // Readiness — checks the dependencies a request actually needs. Point the
  // platform/uptime healthcheck here; 503 when DB or Redis is unreachable.
  .get("/ready", async ({ set }) => {
    const [dbOk, redisOk] = await Promise.all([
      query("SELECT 1").then(() => true).catch(() => false),
      redis.ping().then((r) => r === "PONG").catch(() => false),
    ]);
    const ok = dbOk && redisOk;
    if (!ok) set.status = 503;
    return { ok, db: dbOk, redis: redisOk };
  })
  .use(statusRoute)
  .use(settingsRoute)
  .use(automationsRoute)
  .use(postConfigsRoute)
  .use(productsRoute)
  .use(streamRoute)
  .use(authRoute)
  .use(teamRoute)
  .use(postsRoute)
  .use(inboxRoute)
  .use(crmRoute)
  .use(opportunitiesRoute)
  .use(analyticsRoute)
  .use(llmRoute)
  .use(controlRoute)
  .use(moderationRoute)
  .use(profileRoute)
  .use(pushRoute)
  // public Meta endpoint (signature-verified, not session-authed)
  .use(webhookRoute)
  // public storefront (no auth — field-whitelisted, slug-resolved server-side)
  .use(storeRoute)
  // Bind all interfaces — on Railway the API runs as its own service reached over
  // the network (Vercel rewrites /api/* here). Security rests on per-route auth,
  // webhook HMAC, and the CORS allowlist (ALLOWED_ORIGINS) — not on loopback.
  // maxRequestBodySize caps payloads globally (Bun default is 128MB) so a single
  // oversized body can't exhaust memory before any route logic runs.
  .listen({ port: PORT, hostname: "0.0.0.0", maxRequestBodySize: 4 * 1024 * 1024 });

console.log(`[api] mira backend listening on :${PORT}`);

// Pre-warm the Postgres pool so the FIRST real request isn't paying the cold
// TLS-handshake to Supabase (ap-northeast-1) — that was the ~6s first-load stall.
import("@shaiz/db")
  .then(({ query }) => query("SELECT 1"))
  .then(() => console.log("[api] db pool warm"))
  .catch(() => {});
