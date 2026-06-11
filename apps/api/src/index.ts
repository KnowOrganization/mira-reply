// Mira backend — Bun + Elysia. Owns every API route, the watcher, and the
// BullMQ producers/worker. The Next.js app (apps/web, currently at repo root)
// proxies /api/* here via next.config rewrites during the strangler migration.
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { statusRoute } from "./routes/status";
import { settingsRoute } from "./routes/settings";
import { automationsRoute } from "./routes/automations";
import { postConfigsRoute } from "./routes/postConfigs";
import { streamRoute } from "./routes/stream";
import { authRoute } from "./routes/auth";
import { postsRoute } from "./routes/posts";
import { inboxRoute } from "./routes/inbox";
import { analyticsRoute } from "./routes/analytics";
import { llmRoute } from "./routes/llm";
import { controlRoute } from "./routes/control";

const PORT = Number(process.env.API_PORT || 4000);

// Explicit origins (not reflect-any-with-credentials). Normal traffic comes
// server-side via the Next rewrite proxy, so this only matters for direct calls.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_BASE_URL || "",
].filter(Boolean);

export const app = new Elysia()
  .use(cors({ origin: ALLOWED_ORIGINS, credentials: true }))
  .get("/health", () => ({ ok: true, service: "mira-api" }))
  .use(statusRoute)
  .use(settingsRoute)
  .use(automationsRoute)
  .use(postConfigsRoute)
  .use(streamRoute)
  .use(authRoute)
  .use(postsRoute)
  .use(inboxRoute)
  .use(analyticsRoute)
  .use(llmRoute)
  .use(controlRoute)
  // bind loopback only — the API is reached via the Next rewrite proxy, never
  // directly from the network (defense in depth; each route also requires auth).
  .listen({ port: PORT, hostname: "127.0.0.1" });

console.log(`[api] mira backend listening on :${PORT}`);
