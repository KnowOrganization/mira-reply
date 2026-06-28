# Mira — Project Structure

> Instagram automation + AI dashboard. Webhooks pull IG comments + DMs → an
> automation/funnel engine matches keywords + an LLM brain → sends DMs/replies via
> the Meta Graph API. A Next.js dashboard configures automations, knowledge, and the agent.
>
> Monorepo, **bun** workspaces. The old strangler migration (root `app/` → `apps/web` +
> `apps/api`) is complete. This doc reflects the current layout.

---

## 1. Runtime topology (3 processes + 2 stores)

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
mira-reply/
├── apps/
│   ├── web/                      # @shaiz/web — Next 16, React 19, TanStack Query
│   │   ├── src/app/              # app router: page.tsx, landing, playground, oauth,
│   │   │   ├── api/auth/[...all] #   privacy/terms, s/[slug] storefront; ONLY auth route left in Next
│   │   ├── src/components/       # UI; split into automations/, workspace/, comments/,
│   │   │   │                     #   landing/, skeleton/, ui/ subfolders
│   │   │   ├── Brain.tsx (1025)        ★ still oversized — split candidate
│   │   │   ├── InboxView.tsx (853)     ★ still oversized — split candidate
│   │   │   ├── Dashboard.tsx (566), Sidebar.tsx (467), AutomationsView.tsx (500), …
│   │   ├── src/lib/api/          # client.ts (apiFetch) + hooks.ts (759, TanStack Query)
│   │   ├── proxy.ts, next.config.ts, instrumentation.ts (no-op), middleware.ts
│   │
│   └── api/                      # @shaiz/api — Elysia (Bun), port 4000
│       └── src/
│           ├── index.ts          # registers routes, CORS, health
│           ├── routes/           # thin: posts, inbox, llm, analytics, crm, webhook,
│           │   │                 #   auth, status, settings, stream(SSE), control,
│           │   │                 #   automations, postConfigs, products, store, opportunities
│           ├── controllers/<feat>/handlers/*.ts   # one tiny handler per endpoint (~12–25 LOC)
│           ├── services/         # business logic: posts(807), inbox(400), llm(393),
│           │                     #   analytics(382), crm(216)
│           └── lib/{auth,roles}.ts, plugins/auth.ts
│
├── lib/ig/                       # ★ the automation engine (~8k LOC, 59 files), shared via @/*
│   ├── automation.ts(799) store.ts(740) pipeline.ts(697) graph.ts(635) ingest.ts(460)
│   ├── ctx, dm, knowledge, perception, planner, agent, variation, intent, rulebook,
│   │   sender, links, outbound, reconcile, opportunity, crm, conversation, window, …
│   ├── pg.ts        # raw node-pg Pool + query() — DATA-ACCESS DRIVER ONLY (no DDL; initSchema is a no-op)
│   ├── db.ts        # raw-SQL API: post_configs, processed_comments, user_states, message_log
│   ├── storeDb.ts   # raw-SQL: assemble IgStore + delta write-through (perf-sensitive)
│   ├── pending.ts   # raw-SQL: atomic automation resume claim (pending_resume)
│   ├── conversation.ts # raw-SQL: DM thread memory (conversations, messages)
│   ├── redis.ts, ingestQueue.ts   # BullMQ wiring + claimOnce/locks
│   ├── seen.ts      # in-memory fast-path dedup (Redis claimOnce is the durable layer)
│   ├── handlers/ {reply,link,skip,clarify}.ts
│   ├── providers/ {claude,ollama}.ts
│   └── mcp/         # in-process MCP "brain" tool server (brain*, router, server, client, loop)
│
├── packages/
│   ├── db/          # @shaiz/db — Drizzle + postgres-js. schema.ts = SINGLE DDL SOURCE (22 tables),
│   │   │            #   auth-schema.ts, client.ts (pool), repos.ts (typed access), drizzle/ migrations
│   │   └── scripts/import.ts   # data import (npm db:import)
│   ├── auth/        # @shaiz/auth — BetterAuth singleton (Drizzle adapter)
│   └── shared/      # @shaiz/shared — automation + storefront contracts (used by web AND engine)
│
├── worker/index.ts  # BullMQ worker entrypoint (separate process; only place that sends to Meta)
├── scripts/         # start-mira.sh (npm mira), mcp-brain.mjs (npm mcp:brain)
├── tests/unit/      # 5 bun tests: variation, intent, threshold, rulebook, recall  (bun test tests/)
├── docker-compose.yml   # Redis + Postgres for local dev
└── package.json (bun workspaces: apps/*, packages/*)
```

---

## 3. Data layer

- **Drizzle (`packages/db`)** owns all DDL via `schema.ts` + `drizzle/` migrations — the single
  schema source. Apply with `bun run db:push`. `repos.ts` = typed access used by the API services.
- **Raw node-pg (`lib/ig/{pg,db,storeDb,pending,conversation}.ts`)** issues hand-written SQL
  against the **same Drizzle-owned tables**. `pg.ts` is a driver only — `initSchema()` is a no-op,
  it does NOT define schema, so there is no schema drift.
- Trade-off: two query styles + two connection pools (node-pg + postgres-js) to one DB. Migrating
  the raw-SQL files onto Drizzle would collapse to one pool/style — deferred (see §5); the raw layer
  works and the hot path (ingest/outbound/reconcile) is perf-sensitive, so migrate with live
  round-trip verification, not blind.

## 4. Entrypoints

| Process | Command | File |
|---------|---------|------|
| Web + UI | `bun run dev` | `apps/web` (boots no-op `instrumentation.ts`) |
| API | `bun run dev:api` | `apps/api/src/index.ts` (:4000) |
| Worker | `bun run worker` | `worker/index.ts` |
| Web + API | `bun run dev:all` | — |
| DB migrate / import | `bun run db:push` / `db:import` | `packages/db` |
| Local infra | `docker-compose up` | Redis + Postgres |
| Tests | `bun test tests/` | `tests/unit/` |

Auth: BetterAuth (cookies + Drizzle adapter), singleton in `@shaiz/auth`, validated by both the
Next proxy and Elysia (`requireUser`).

## 5. Open items (architecture is otherwise sound)

1. **DB unification (optional):** migrate `lib/ig/{db,pending,conversation,storeDb}.ts` from raw SQL
   onto Drizzle to get a single pool/style. Schema already unified; do `db.ts` first (touches the
   ingest hot path), `storeDb.ts` last. Needs live comment/DM round-trip verification.
2. **God components:** split `apps/web/src/components/Brain.tsx` (1025) and `InboxView.tsx` (853)
   following the existing `automations/`+`workspace/` subfolder pattern. Pure UI refactor.
3. **Tests:** only 5 unit tests today — add coverage around `automation.ts` / `pipeline.ts`.
4. **Config hardening:** fail-fast on missing prod secrets; parameterize the tunnel URL in scripts.
