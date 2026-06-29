# Shaiz / Mira — Project Structure (End-to-End)

> **Purpose:** hand-off map for a cleanup / production-hardening agent. Documents every
> source directory, what each part does, the runtime topology, and the **known structural
> problems** that need fixing before this is production-grade.
>
> **What this is:** an Instagram automation + AI dashboard ("Mira"). Webhooks/polling pull
> IG comments + DMs → an automation/funnel engine matches keywords → sends DMs/replies via
> Meta Graph API. A Next.js dashboard configures automations, knowledge base, and an AI agent.
>
> Generated 2026-06-11. Stack mid-migration (strangler pattern) — read "Known Issues" before refactoring.

---

## 1. Runtime topology (the 4 processes)

```
Next.js web (apps/web :3000)          Elysia API (apps/api :4000)         Worker (worker/index.ts, tsx)
  app router UI + /api/auth      ──▶    routes → controllers → services      drains BullMQ queues:
  proxy.ts (auth gate)                  imports the @/lib/ig engine            ingest-comments, ingest-dm,
  next.config.ts strangler              + @shaiz/{db,auth,shared}              outbound, reconcile (+ 2 DLQs)
  rewrites /api/ig|store|chat|              │                                          │
  playground/* ──▶ :4000                   ▼                                          ▼
                                Postgres / Supabase                          Redis
                                (Drizzle = single DDL source)                (BullMQ + dedup/locks)
```

External deps: Postgres/Supabase (state), Redis (queues + `claimOnce` dedup + locks), Ollama /
Claude (LLM), ngrok/cloudflare tunnel (Meta webhook ingress), Meta Graph API.

---

## 2. Directory map

```
Shaiz/
├── app/                          # Next.js App Router (UI + the 2 surviving API routes)
│   ├── layout.tsx, page.tsx, globals.css, favicon.ico
│   ├── api/
│   │   ├── auth/[...all]/route.ts # BetterAuth handler (stays in Next)
│   │   └── ig/webhook/route.ts    # Meta webhook — 615 lines, INLINE processing (see issues)
│   ├── oauth/complete/page.tsx
│   ├── playground/page.tsx
│   ├── privacy/page.tsx, terms/page.tsx   # Meta app-review legal pages
│
├── apps/api/                     # Elysia backend (Bun) — @shaiz/api
│   ├── package.json, tsconfig.json
│   └── src/
│       ├── index.ts              # Elysia app: registers all route modules
│       ├── lib/auth.ts           # requireUser guard helper
│       └── routes/
│           ├── posts.ts          (842)  ← largest; has syncPosts regression (see issues)
│           ├── llm.ts            (437)
│           ├── inbox.ts          (412)
│           ├── analytics.ts      (385)
│           ├── auth.ts           (142)
│           ├── control.ts        (77)   watcher start/stop API
│           ├── postConfigs.ts    (53)
│           ├── automations.ts    (61)   node-graph store
│           ├── status.ts, settings.ts, stream.ts (SSE)
│
├── packages/db/                  # @shaiz/db — Drizzle + postgres-js (the "new" DB stack)
│   ├── drizzle.config.ts, package.json, tsconfig.json
│   ├── src/
│   │   ├── schema.ts             (349)  18 tables, app state
│   │   ├── auth-schema.ts        (53)   BetterAuth tables
│   │   ├── client.ts             postgres-js client (DATABASE_URL)
│   │   ├── repos.ts, index.ts
│   └── scripts/                  # one-off migration helpers (add-*.ts, import.ts)
│
├── lib/                          # shared library (imported by BOTH Next and Elysia via @/*)
│   ├── ig/                       # ★ the automation engine — 9,200 LOC, the real product
│   │   ├── watcher.ts      (574) polling loops (full tick + realtime + DM)
│   │   ├── automation.ts   (737) keyword-match → action engine
│   │   ├── store.ts        (704) in-memory node-graph store (IgStore)
│   │   ├── pipeline.ts     (651) message processing pipeline
│   │   ├── graph.ts        (505) automation node graph
│   │   ├── ingest.ts       (435) processIngestJob — webhook→queue→action
│   │   ├── ctx.ts          (299) per-account context
│   │   ├── storeDb.ts      (295) raw pg.Pool persistence for store
│   │   ├── planner.ts, perception.ts, agent.ts, dm.ts, knowledge.ts,
│   │   │   variation.ts, training.ts, rulebook.ts (Mira reply/skip rules),
│   │   │   pending.ts, sender.ts, outbound.ts, intent.ts, embed.ts,
│   │   │   accountsRepo.ts, queue.ts (in-proc msg queue), seen.ts (in-mem dedup),
│   │   │   bus.ts, links.ts, followCheck.ts, feedLog.ts, config.ts
│   │   ├── db.ts           (154) post-config funnel store (now Postgres, async)
│   │   ├── pg.ts           (91)  raw node-pg Pool + initSchema  ← 2nd DB stack
│   │   ├── redis.ts, ingestQueue.ts  BullMQ wiring
│   │   ├── webhookEvents.ts (NEW, untracked) webhook event persistence
│   │   ├── handlers/       reply.ts, link.ts, skip.ts, clarify.ts
│   │   └── mcp/            brain*.ts, router.ts, server.ts, client.ts, loop.ts (MCP "brain")
│   ├── api/               client.ts, hooks.ts (TanStack Query)
│   ├── auth/              client.ts, server.ts (BetterAuth shared instance)
│   ├── storage.ts, types.ts, utils.ts
│
├── components/                   # React UI (TanStack Query)
│   ├── Workspace.tsx      (3062) ★ MONOLITH — needs splitting
│   ├── AutomationsView.tsx (1877) ★ visual canvas, also huge
│   ├── Comments.tsx       (1332)
│   ├── Brain.tsx          (750), Dashboard.tsx (566), Sidebar.tsx (496)
│   ├── PostCanvas, CanvasLayout, ConnectGate, Chat, Views, Knowledge,
│   │   BrainGraph, SettingsPanel, MiraFeed, MiraLogo, AuthGate, Providers
│
├── worker/index.ts               # BullMQ worker entrypoint (separate process)
├── scripts/                      # mcp-brain.mjs, scale-{import,spike,verify}.ts, test-*
├── proxy.ts                      # Next 16 middleware (auth gate)
├── instrumentation.ts            # auto-boot watcher
├── next.config.ts                # strangler rewrites
├── docker-compose.yml            # Redis + Postgres for local dev
│
├── mira/                         # ⚠ UNRELATED Swift/iOS app, OWN git repo, gitignored
├── data/                         # ⚠ runtime SQLite (shaiz.db) — gitignored, LEGACY artifact
├── .agents/skills/               # vendored Supabase/Postgres best-practice skill docs
├── MASTER_PLAN.md, README.md, AGENTS.md, CLAUDE.md
└── package.json (root, bun workspaces: apps/*, packages/*)
```

---

## 3. Data layer — **two parallel Postgres stacks** (key cleanup target)

Same `DATABASE_URL`, **two different drivers + access patterns** — biggest source of drift:

| Stack | Driver | Files | Used by |
|-------|--------|-------|---------|
| **A. Drizzle** | `postgres-js` | `packages/db/*`, `lib/auth/server.ts` | BetterAuth, Elysia routes (new) |
| **B. raw node-pg** | `pg.Pool` | `lib/ig/pg.ts`, `storeDb.ts`, `pending.ts`, `db.ts`, `worker` | watcher, ingest, funnel store |

- `lib/ig/pg.ts` → `new Pool({ connectionString: DATABASE_URL })`, has its own `initSchema()` (raw SQL).
- `packages/db/src/client.ts` → `postgres(DATABASE_URL)` + Drizzle, schema in `schema.ts`.
- **Schema is defined in two places** (Drizzle `schema.ts` AND raw `initSchema()`) → can diverge silently.
- **better-sqlite3 is fully removed** — remaining hits are only historical comments + the gitignored `data/shaiz.db` artifact. Safe to delete `data/`.

**Recommendation:** collapse onto Drizzle/`postgres-js`; delete `lib/ig/pg.ts` raw stack and the duplicate `initSchema`.

---

## 4. Known issues / cleanup backlog

**Architecture**
1. **Two DB stacks** (§3) — unify on Drizzle.
2. **Dual schema definitions** — Drizzle `schema.ts` vs raw `initSchema()` SQL drift.
3. **Two queue systems** — BullMQ `ingest` (durable, Redis) + `lib/ig/queue.ts` (in-process). Pick one for the hot path.
4. **Polling + webhooks both live** — watcher 1s poll AND webhook route both process events → race / double-send risk. Migration to webhook-first event queue is *planned* (see MASTER_PLAN) but not done.
5. **Restart-fragile dedup** — `lib/ig/seen.ts` in-memory dedup is lost on restart (Redis `claimOnce` exists for the queue path but not everywhere).

**Correctness**
6. **`posts.ts` syncPosts regression** — `existing = next[m.id]` always undefined → loses preserved notes/qa/links (flagged obs 2369; verify fixed).
7. **`webhook/route.ts` (615 lines) inline processing** — handles comments/mentions/follows/DMs/postbacks synchronously in the request handler; always returns 200. Should enqueue + return fast.
8. **`is_echo` filtering** — page-sent messages must be filtered on the webhook (confirmed needed).

**Code health**
9. **God components** — `Workspace.tsx` (3062), `AutomationsView.tsx` (1877), `Comments.tsx` (1332) need decomposition.
10. **`automation.ts` (737) + `store.ts` (704)** — large; store is in-memory node-graph, candidate to back with DB.
11. **Untracked WIP** — `lib/ig/webhookEvents.ts`, `packages/db/scripts/add-webhook-events.ts` not committed; modified `ingestQueue.ts`, `pg.ts`, `redis.ts`, `schema.ts`.

**Production-readiness**
12. **Secrets / config** — dev fallbacks hardcoded: `BETTER_AUTH_SECRET="dev-insecure-secret-change-me"`, `DATABASE_URL` default to `localhost`. Must require env in prod.
13. **Watcher in web process** — `instrumentation.ts` boots polling loops inside Next; won't survive serverless / multi-instance scale-out. Move to the worker tier.
14. **Hardcoded ngrok URL** in `package.json` `start:all`/`tunnel` scripts.
15. **No tests** — only `scripts/test-*.sh` smoke scripts; no real test suite.
16. **Multi-tenancy** — `db.ts` auto-stamps `account_id` from "the single connected account" (legacy webhook path); per-account threading is incomplete (roadmap item).

---

## 5. Entrypoints cheat-sheet

| Process | Command | File |
|---------|---------|------|
| Web + UI | `bun run dev` (`next dev -p 3000`) | `app/`, boots `instrumentation.ts` |
| API | `bun run dev:api` | `apps/api/src/index.ts` (Elysia :4000) |
| Worker | `bun run worker` | `worker/index.ts` (BullMQ) |
| Both web+api | `bun run dev:all` | — |
| DB migrate | `bun run db:push` / `db:generate` | `packages/db` (drizzle-kit) |
| Local infra | `docker-compose up` | Redis + Postgres |

**Auth:** BetterAuth (cookies + Drizzle adapter), shared instance in `lib/auth/server.ts`,
validated by both Next proxy and Elysia. Google OAuth needs client id/secret in env.

---

## 6. Suggested cleanup order (for the agent)

1. **Tests:** only 5 unit-test files today (`tests/unit/`, 46 cases) — add coverage around
   `automation.ts` / `pipeline.ts`.
2. **Config hardening:** fail-fast on missing prod secrets; parameterize the tunnel URL in scripts.
3. **Pre-existing typecheck debt:** `apps/web` `landing/` needs `gsap`/`three`/`@react-three/fiber`
   installed; `apps/api` + `lib/ig` have a handful of latent type errors (the app runs via bun/tsx,
   which don't typecheck). Worth clearing for a clean `tsc`.

Done in the last cleanup pass: dead-code/doc removal, god-component split (Brain→`brain/`,
InboxView→`inbox/`), and the full DB unification onto a single postgres-js pool (`pg.ts` deleted).
