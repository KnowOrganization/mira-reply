# Migration Guideline — Convert Shaiz/Mira → TourneyPro Architecture

> **For the agent doing the migration.** You have two inputs:
> 1. The **source** codebase (Shaiz/Mira) — mapped in its `PROJECT_STRUCTURE.md`. It is a single Next.js app with a bolted-on Elysia API, **two parallel DB stacks**, **two queue systems**, god components, no real monorepo, no tests.
> 2. The **target** architecture (TourneyPro) — described below. Clean npm-workspace monorepo: `apps/api` (Elysia+Bun), `apps/web` (Next 15), `apps/mobile` (Expo), `packages/shared` (types). Single Drizzle DB stack. Strict controllers → handlers → services split. better-auth bearer tokens.
>
> **Goal:** restructure the source to match the target's *shape and conventions* — NOT to copy TourneyPro's domain code. Keep all of Mira's product logic (the IG automation engine in `lib/ig/*`). Move it into the target's slots.
>
> **Rule:** this is a refactor of *structure*, not a rewrite of *behavior*. Preserve behavior. Verify after each phase.

---

## 0. Mental model — old vs new

| Concern | Shaiz/Mira (now) | TourneyPro (target) |
|---|---|---|
| Repo shape | 1 Next app + `apps/api` + `packages/db` half-monorepo | Full npm-workspace monorepo: `apps/*` + `packages/*` |
| Package manager | bun workspaces (`apps/*`,`packages/*`) | npm workspaces (`apps/*`,`packages/*`), Bun runtime |
| Backend | Elysia in `apps/api/src/routes/*.ts` (fat route files, 842-line `posts.ts`) | Elysia in `apps/api/src/controllers/<domain>/handlers/*.ts` — one file per route |
| Business logic | inline in route files + `lib/ig/*` | `apps/api/src/services/*.ts` (thick). Handlers thin. |
| DB stack | **TWO**: Drizzle (`packages/db`) + raw node-pg (`lib/ig/pg.ts`, `storeDb.ts`) | **ONE**: Drizzle in `apps/api/src/db/`, schema per domain |
| Schema source of truth | **TWO**: Drizzle `schema.ts` + raw `initSchema()` SQL | **ONE**: `apps/api/src/db/schema/*.ts` → `drizzle/` migrations |
| Queue | **TWO**: BullMQ + in-proc `lib/ig/queue.ts` | (Mira-specific — keep BullMQ, drop in-proc; see §6) |
| Auth | BetterAuth cookies, shared `lib/auth/server.ts` | better-auth **bearer token**, `apps/api/src/libs/auth.ts` + `plugins/auth.ts` macro |
| Frontend | `app/` + monolith `components/Workspace.tsx` (3062 LOC) | `apps/web/src/app/` route groups + decomposed components |
| Worker/watcher | in Next process via `instrumentation.ts` | separate worker tier (`apps/api`-side or `worker/`), NOT in web |
| Tests | none | `*.test.ts`, `test-utils/` harness |

---

## 1. Target directory layout (what you are building toward)

```
<root>/
├── package.json                    # npm workspaces: ["apps/*","packages/*"]; engines node>=22, bun>=1.1
├── docker-compose.yml              # postgres + redis (+ mailhog if needed)
├── Makefile                        # bootstrap / dev / migrate / seed targets
│
├── packages/
│   └── shared/                     # @<scope>/shared — TYPES ONLY, no runtime code
│       ├── package.json            # workspace:* dep target
│       └── src/
│           ├── index.ts            # re-exports permissions + contracts
│           ├── permissions.ts      # permission enum (canonical, mirrored in api)
│           └── contracts/          # request/response types per domain
│               ├── index.ts
│               └── <domain>.ts
│
├── apps/
│   ├── api/                        # @<scope>/api — Elysia on Bun
│   │   ├── package.json
│   │   ├── drizzle.config.ts       # schema: ./src/db/schema/index.ts, out: ./drizzle
│   │   ├── .env.example
│   │   ├── drizzle/                # GENERATED migrations — never hand-edit
│   │   └── src/
│   │       ├── server.ts           # entry: plugins (cors, logger, swagger) + controllers + WS + error handler
│   │       ├── config/logger.ts
│   │       ├── controllers/
│   │       │   ├── index.ts        # mounts every domain controller under /v1
│   │       │   └── <domain>/
│   │       │       ├── index.ts    # new Elysia({prefix:'/<domain>'}).use(handlerA).use(handlerB)...
│   │       │       └── handlers/
│   │       │           └── <verb-resource>.ts   # ONE route per file
│   │       ├── services/<domain>-service.ts     # thick business logic, returns DTOs, no HTTP
│   │       ├── db/
│   │       │   ├── client.ts       # Drizzle + postgres driver, CONNECTION_STRING
│   │       │   └── schema/
│   │       │       ├── index.ts    # aggregate export of all schema files
│   │       │       ├── auth.ts     # better-auth tables
│   │       │       └── <domain>.ts
│   │       ├── plugins/
│   │       │   ├── auth.ts         # derive {session,user} from bearer; `auth:{permissions:[...]}` macro
│   │       │   └── rate-limit.ts
│   │       ├── libs/
│   │       │   ├── auth.ts         # better-auth config (Drizzle adapter + bearer plugin)
│   │       │   ├── redis.ts
│   │       │   └── <integration>.ts
│   │       ├── types/permissions.ts # mirror of packages/shared permissions
│   │       ├── realtime/           # WebSocket rooms + typed events (if needed)
│   │       ├── scripts/seeder/     # seed-dev.ts + seeds/NN-<domain>.ts, idempotent ON CONFLICT
│   │       └── test-utils/         # harness.test.ts, app.ts, factories.ts
│   │
│   ├── web/                        # @<scope>/web — Next 15 App Router
│   │   ├── package.json            # dev on a fixed port
│   │   ├── next.config.ts
│   │   ├── postcss.config.mjs      # @tailwindcss/postcss (Tailwind v4)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx      # wraps children in <Providers>
│   │       │   ├── (public)/       # route groups for layout segmentation
│   │       │   ├── (auth)/
│   │       │   └── (dashboard)/
│   │       ├── components/{ui,<feature>}/   # NO god components — split by feature
│   │       ├── hooks/              # TanStack Query hooks
│   │       ├── lib/api/            # API client
│   │       ├── providers/index.tsx # ThemeProvider (next-themes) + QueryProvider
│   │       └── styles/globals.css  # @import "tailwindcss" + CSS vars, dark via class
│   │
│   └── mobile/                     # Expo + Expo Router (only if a mobile app exists; Mira has Swift app — see §9)
│
└── (NO `lib/` at root, NO `data/` SQLite, NO root `app/`, NO `instrumentation.ts` in web)
```

Pick a scope name (e.g. `@mira/*`) and use it consistently in every `package.json` `name` field.

---

## 2. Backend conventions — the part you must get exactly right

### 2a. Controllers are thin, services are thick
- A **handler** validates input (Elysia `t.*` schema), checks auth, calls a service, shapes the response (status codes + error envelope). Nothing else.
- A **service** does all business logic, talks to Drizzle, returns a DTO or throws a typed `<Domain>ServiceError`. It NEVER sets HTTP status or touches `set`.

### 2b. One route = one file
Split fat route files. Mira's `apps/api/src/routes/posts.ts` (842 lines) becomes:
```
controllers/posts/
  index.ts
  handlers/
    list-posts.ts
    get-post.ts
    sync-posts.ts        # the syncPosts logic (fix the `existing = next[m.id]` regression here)
    create-post.ts
    ...
```
Same for `inbox.ts`, `analytics.ts`, `llm.ts`, `automations.ts`, `control.ts`, etc.

### 2c. Handler shape (copy this template)
```typescript
import { Elysia, t } from 'elysia';
import { loggerPlugin } from '../../../config/logger';
import { authPlugin } from '../../../plugins/auth';
import { PERMISSIONS } from '../../../types/permissions';
import { getPost as getPostService } from '../../../services/posts-service';

export const getPost = new Elysia()
  .use(loggerPlugin)
  .use(authPlugin)
  .get('/:postId', async ({ params, set }) => {
    const post = await getPostService(params.postId);
    if (!post) { set.status = 404; return { error: 'NOT_FOUND', message: 'Post not found' }; }
    return post;
  }, {
    auth: { permissions: [PERMISSIONS.POSTS_VIEW] },
    headers: t.Object({ authorization: t.String() }),
    params: t.Object({ postId: t.String() }),
    detail: { tags: ['posts'], summary: 'Get a post' },
  });
```

### 2d. Route param naming — RESOURCE-SPECIFIC, not `:id`
TourneyPro recently refactored every `:id` → `:teamId`, `:matchId`, etc. **Apply the same rule.** Two route files in the same Elysia tree with different param names on the same path segment crash the server (Mira's history shows the exact bug). So:
- `/posts/:postId`, `/inbox/:threadId`, `/automations/:automationId` — never bare `:id`.
- Within one domain controller, use ONE param name for that resource everywhere.

### 2e. Controller mounting
```typescript
// controllers/posts/index.ts
import { Elysia } from 'elysia';
import { listPosts } from './handlers/list-posts';
import { getPost } from './handlers/get-post';
export const postsController = new Elysia({ prefix: '/posts' })
  .use(listPosts).use(getPost) /* ...all handlers */;

// controllers/index.ts
import { Elysia } from 'elysia';
import { postsController } from './posts';
export const controllers = new Elysia({ prefix: '/v1' })
  .use(postsController) /* ...all domains */;
```

### 2f. Domains to carve out of Mira
From Mira's existing routes + the `lib/ig` engine, expect roughly these domains:
`posts`, `inbox`, `analytics`, `llm`, `automations`, `postConfigs`, `control`, `settings`, `status`, `stream`, `auth`, plus `webhook` (see §7) and `brain`/`agent` (the MCP brain in `lib/ig/mcp/*`).

---

## 3. DB unification — THE single biggest cleanup (source §3)

Mira has **two parallel Postgres stacks on the same `DATABASE_URL`** + **two schema definitions** that drift. Collapse to one.

**Steps:**
1. **Pick Drizzle as the only stack.** Move `packages/db/src/schema.ts` + `auth-schema.ts` into `apps/api/src/db/schema/` split per domain (`schema.ts`'s 18 tables → group into `<domain>.ts` files). Create `db/schema/index.ts` aggregating them.
2. **Delete the raw node-pg stack:** `lib/ig/pg.ts` (the `new Pool` + `initSchema()`), and rewrite `lib/ig/storeDb.ts`, `lib/ig/pending.ts`, `lib/ig/db.ts`, and `worker/` to query through the Drizzle client (`db/client.ts`) instead of `pg.Pool`.
3. **Kill the duplicate schema.** `initSchema()`'s raw SQL is deleted; Drizzle migrations (`drizzle/`) become the only DDL. Run `bunx drizzle-kit generate` then `migrate`.
4. **Delete dead artifacts:** `data/shaiz.db` (gitignored legacy SQLite) and any stale `better-sqlite3` comments.
5. Drizzle convention: **snake_case columns, camelCase TS field names** — map explicitly (`shortName: text('short_name')`).

After this phase the answer to "where is table X defined?" must be exactly one file.

---

## 4. Auth — move from cookie-shared to bearer macro

Mira shares a BetterAuth instance via `lib/auth/server.ts`, validated by both Next proxy and Elysia (cookies). Target uses **bearer tokens** + an Elysia auth plugin macro.

1. Put better-auth config in `apps/api/src/libs/auth.ts` with the **bearer plugin enabled** and the Drizzle adapter pointing at `db/schema/auth.ts`.
2. Create `apps/api/src/plugins/auth.ts` that `.derive`s `{ session, user }` from the `Authorization: Bearer <token>` header (resolve via better-auth's internal adapter `findSession`), enriches `user` with permissions, and registers an `auth` macro so handlers declare `auth: { permissions: [...] }`.
3. Every write handler is guarded by the macro. Public ones (webhook, oauth complete, legal pages) are explicitly unguarded — document why.
4. Keep `/api/auth/[...all]` only if the web app still needs the better-auth HTTP handler; otherwise the API owns auth.

---

## 5. Frontend — decompose god components

- Move `app/` → `apps/web/src/app/`. Introduce route groups `(public)`, `(auth)`, `(dashboard)` for layout segmentation.
- Wrap root layout in a single `providers/index.tsx` = `next-themes` ThemeProvider + TanStack Query QueryProvider.
- **Split the monoliths** (source §9): `Workspace.tsx` (3062), `AutomationsView.tsx` (1877), `Comments.tsx` (1332). Break each into `components/<feature>/` with a container + presentational children + per-section hooks in `hooks/`. Do this incrementally — one feature slice at a time, verifying the UI still renders between slices.
- Tailwind v4: `@import "tailwindcss"` in `globals.css`, all tokens as CSS vars, dark mode via `class` strategy (`@custom-variant dark`). Use `@tailwindcss/postcss` in `postcss.config.mjs`.
- Move the API client into `lib/api/`; data fetching goes through TanStack Query hooks in `hooks/`.

---

## 6. Queues — pick one (source §3, §4)

Mira runs BullMQ (`ingest` queue, Redis, durable) AND an in-process `lib/ig/queue.ts`. **Keep BullMQ for the hot path; delete the in-proc queue.** Route everything that was using `lib/ig/queue.ts` through the BullMQ `ingest` queue + `processIngestJob`. Keep Redis `claimOnce` dedup and extend it to cover the paths still relying on the restart-fragile in-memory `lib/ig/seen.ts` (source §5).

---

## 7. Webhook + watcher — enqueue-and-return, move off the web tier

Two source problems to fix while restructuring:
1. **`webhook/route.ts` (615 lines, inline sync processing, source §7):** refactor to **enqueue the event and return 200 fast**. The actual comment/DM/follow/postback processing moves into the worker via `processIngestJob`. Keep `is_echo` filtering on the webhook (source §8). The webhook becomes a thin Elysia handler under the API (`controllers/webhook/`) or stays as the single surviving Next route — decide based on where ingress lands, but it must not do synchronous processing.
2. **Watcher in web process (source §13):** `instrumentation.ts` boots the 1s/7s polling loops inside Next. Move those loops (`lib/ig/watcher.ts`) into the **worker tier** so they survive serverless/multi-instance. Once webhook-first ingestion is solid, retire the polling loop to kill the poll-vs-webhook double-send race (source §4).

---

## 8. Config / secrets hardening (source §12, §14)

- **Fail fast on missing env in prod.** No hardcoded fallbacks like `BETTER_AUTH_SECRET="dev-insecure-secret-change-me"` or `DATABASE_URL` defaulting to localhost. Validate required env at boot; throw if absent when `NODE_ENV=production`.
- **Parameterize the ngrok/tunnel URL** — remove the hardcoded URL from `package.json` scripts; read from env.
- Ship `apps/api/.env.example` listing every required var. CORS in `server.ts`: `origin: true` + `credentials: true` + explicit `allowedHeaders` + `preflight: true` for dev (mirror TourneyPro's working config; do NOT leave `allowedHeaders` undefined — that was a real bug).
- Use fixed, non-colliding dev ports and put them in env, not scattered literals.

---

## 9. What to leave alone / out of scope

- **`mira/` Swift iOS app** (source §131) — unrelated, own git repo, gitignored. Do NOT touch or fold into the monorepo. TourneyPro's `apps/mobile` is Expo/RN; Mira's mobile is native Swift and stays separate. Skip the mobile slot unless told otherwise.
- **Product behavior of the IG automation engine** (`lib/ig/automation.ts`, `pipeline.ts`, `graph.ts`, `store.ts`, the MCP brain) — preserve logic. You are relocating and re-wiring its DB/queue access, not redesigning the funnel engine.

---

## 10. Phase order (do in this sequence, verify between each)

1. **Scaffold the monorepo shell.** Root `package.json` npm workspaces, `packages/shared` (move/define permission enum + contract types), `apps/api`/`apps/web` skeletons, `drizzle.config.ts`, `docker-compose.yml`, `Makefile`, `.env.example`. Nothing wired yet.
2. **Unify the DB (§3).** Single Drizzle schema split per domain; delete raw pg + `initSchema` + `data/`. Generate + run migrations. Verify app boots and reads/writes through Drizzle only.
3. **Move watcher off web + webhook enqueue-and-return (§7).** Worker tier owns polling; webhook returns fast.
4. **Carve controllers → handlers + services (§2).** One route per file, services thick, `:resourceId` params, mounted under `/v1`. Migrate fat route files one domain at a time.
5. **Bearer auth plugin + macro (§4).** Guard every write handler.
6. **Collapse queues to BullMQ (§6).**
7. **Decompose god components + route groups (§5).**
8. **Harden config/secrets (§8).**
9. **Add a test harness** (`test-utils/`) and tests around `automation.ts` / `pipeline.ts` (source §15).

**Between every phase:** boot the app, run the smoke path (webhook → enqueue → action; dashboard loads; sign-in works), confirm no regression. Commit per phase. Never claim a phase done without running it.

---

## 11. Definition of done

- [ ] One DB stack (Drizzle), one schema source, migrations in `drizzle/`. `lib/ig/pg.ts` gone.
- [ ] `apps/api/src/controllers/<domain>/handlers/<route>.ts` — no route file over ~150 lines; no business logic in handlers.
- [ ] `services/*` hold all logic, return DTOs, throw typed errors.
- [ ] Resource-specific route params everywhere (`:postId`, never `:id`). Server boots without param-conflict crash.
- [ ] Bearer auth macro guards all non-public handlers.
- [ ] Webhook enqueues and returns 200 fast; watcher runs in worker tier, not Next.
- [ ] One queue (BullMQ). In-proc queue + restart-fragile dedup gone.
- [ ] No god component over ~400 LOC; route groups in place.
- [ ] No hardcoded secrets/tunnel URLs; `.env.example` complete; CORS `allowedHeaders` set.
- [ ] `packages/shared` is the single source for permissions + contracts, consumed via `workspace:*`.
- [ ] Test harness exists; `automation.ts`/`pipeline.ts` covered.
- [ ] `mira/` Swift app untouched; `data/` SQLite deleted.
