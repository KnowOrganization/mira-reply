// Mira backend — Bun + Elysia. Owns every API route, the watcher, and the
// BullMQ producers/worker. The Next.js app (apps/web, currently at repo root)
// proxies /api/* here via next.config rewrites during the strangler migration.
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { statusRoute } from "./routes/status";
import { settingsRoute } from "./routes/settings";
import { automationsRoute } from "./routes/automations";
import { postConfigsRoute } from "./routes/postConfigs";
import { productsRoute } from "./routes/products";
import { streamRoute } from "./routes/stream";
import { authRoute } from "./routes/auth";
import { postsRoute } from "./routes/posts";
import { inboxRoute } from "./routes/inbox";
import { crmRoute } from "./routes/crm";
import { opportunitiesRoute } from "./routes/opportunities";
import { analyticsRoute } from "./routes/analytics";
import { llmRoute } from "./routes/llm";
import { controlRoute } from "./routes/control";
import { webhookRoute } from "./routes/webhook";
import { storeRoute } from "./routes/store";

const PORT = Number(process.env.API_PORT || 4000);

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

export const app = new Elysia()
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
  .get("/health", () => ({ ok: true, service: "mira-api" }))
  .use(statusRoute)
  .use(settingsRoute)
  .use(automationsRoute)
  .use(postConfigsRoute)
  .use(productsRoute)
  .use(streamRoute)
  .use(authRoute)
  .use(postsRoute)
  .use(inboxRoute)
  .use(crmRoute)
  .use(opportunitiesRoute)
  .use(analyticsRoute)
  .use(llmRoute)
  .use(controlRoute)
  // public Meta endpoint (signature-verified, not session-authed)
  .use(webhookRoute)
  // public storefront (no auth — field-whitelisted, slug-resolved server-side)
  .use(storeRoute)
  // bind loopback only — the API is reached via the Next rewrite proxy, never
  // directly from the network (defense in depth; each route also requires auth).
  .listen({ port: PORT, hostname: "127.0.0.1" });

console.log(`[api] mira backend listening on :${PORT}`);

// Pre-warm the Postgres pool so the FIRST real request isn't paying the cold
// TLS-handshake to Supabase (ap-northeast-1) — that was the ~6s first-load stall.
import("@/lib/ig/pg")
  .then(({ query }) => query("SELECT 1"))
  .then(() => console.log("[api] db pool warm"))
  .catch(() => {});
