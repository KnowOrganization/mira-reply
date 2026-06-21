# Mira — Instagram Auto-Reply

> A personal AI that watches your Instagram comments, classifies intent, drafts human-sounding replies, and delivers links by DM — with a 3-panel review workspace so you stay in control.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-19-blue?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
  <img alt="Bun" src="https://img.shields.io/badge/Runtime-Bun-black?logo=bun" />
  <img alt="Claude" src="https://img.shields.io/badge/LLM-Claude-orange" />
</p>

---

## ✨ What it does

- **Watches comments** on your Instagram posts via webhook + polling
- **Classifies intent** — question, business inquiry, praise, personal, spam
- **Drafts replies** with an LLM, mirroring the commenter's language (English / Hinglish)
- **Delivers links by DM** when a comment asks for one
- **Knowledge base** — answers post-specific questions, asks the owner once when unsure, then serves every queued commenter
- **Review workspace** — 3-panel triage UI to approve, edit, or send

Reply modes (set per channel): `shadow` (draft only) · `assisted` (approve before send) · `auto` (send immediately).

---

## 🏗️ Architecture

Mira is a **Bun workspaces monorepo**:

```
apps/
  web/     Next.js 16 app (UI + Next route proxy)        → :3000
  api/     Elysia backend — routes, Meta webhook         → :4000  (loopback only)
packages/
  auth/    Better Auth (Google OAuth, sessions)
  db/      Postgres schema + migrations
  shared/  shared types and helpers
worker/    BullMQ queues — comments, DMs, reconcile, outbound
lib/ig/    Pipeline — intent, llm, knowledge, dm, watcher, store, rulebook, providers
scripts/   start-mira.sh launcher + maintenance scripts
```

The web app proxies `/api/*` to the Elysia backend (`apps/api`). The API binds to
loopback only and is reached through that proxy. Persistent state lives in
**Postgres** + **Redis**; the Instagram access token lives in `~/.mira/ig.json`.

---

## 🧱 Requirements

| Need | Why | Install |
|------|-----|---------|
| **Bun 1.3+** | runtime + package manager | https://bun.sh |
| **PostgreSQL** | persistent store | https://www.postgresql.org |
| **Redis** | BullMQ job queues | https://redis.io |
| **Claude** | default reply engine (Agent SDK) | https://claude.ai |
| **Ollama** | embeddings (always) + optional local LLM fallback | https://ollama.com |
| **Meta / Instagram app** | OAuth + webhook access | https://developers.facebook.com/apps |

> ⚠️ **Embeddings always use Ollama** — Claude has no embeddings API. If Ollama is
> down, semantic recall degrades gracefully to keyword matching.
>
> The reply engine defaults to **Claude** (`MIRA_AI_PROVIDER=claude`). Set it to
> `ollama` to run replies through a local model instead.

Pull the Ollama models once:

```bash
ollama pull qwen2.5:14b-instruct  # reply generation (local fallback)
ollama pull nomic-embed-text      # knowledge embeddings (~270 MB)
```

---

## 🚀 Setup

```bash
# 1. Clone
git clone https://github.com/Danyalsk/mira-reply.git
cd mira-reply

# 2. Install dependencies
bun install

# 3. Create your env file
cp .env.local.example .env.local
#    then open .env.local and fill in the values

# 4. Make sure Postgres and Redis are running, then push the schema
bun run db:push

# 5. Start the full stack (api + worker + web + tunnel)
bun run start:all
```

Open **http://localhost:3000**.

Prefer to run pieces individually:

```bash
bun run dev        # web only            (:3000)
bun run dev:api    # api only            (:4000)
bun run dev:all    # web + api together
bun run worker     # BullMQ worker
```

---

## 🔐 Environment variables

Copy `.env.local.example` → `.env.local` and fill it in. **`.env.local` is gitignored — never commit real secrets.**

| Variable | Required | Description |
|----------|----------|-------------|
| `META_APP_ID` | ✅ | Meta app ID — [developers.facebook.com/apps](https://developers.facebook.com/apps) |
| `META_APP_SECRET` | ✅ | Meta app secret |
| `META_WEBHOOK_VERIFY_TOKEN` | ✅ | Any random string — set the same value in the Meta dashboard |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Public base URL — must match the OAuth redirect whitelisted in the Meta dashboard (default `http://localhost:3000`) |
| `DATABASE_URL` | ✅ | Postgres connection string (default `postgresql://localhost:5432/mira`) |
| `REDIS_URL` | ✅ | Redis connection string (default `redis://127.0.0.1:6379`) |
| `BETTER_AUTH_SECRET` | ✅ | Secret for Better Auth sessions |
| `MIRA_AI_PROVIDER` | ⬜ | `claude` (default) or `ollama` |
| `MIRA_CLAUDE_MODEL` | ⬜ | Defaults to `claude-sonnet-4-6` |
| `CLAUDE_CODE_OAUTH_TOKEN` | ⬜ | Required when provider is `claude`. Mint with `claude setup-token`; bills your Claude subscription, not an API key |
| `MIRA_REPLY_MODE` | ⬜ | Legacy single mode that seeds both channels on first run — `shadow` · `assisted` · `auto` |
| `MIRA_COMMENT_MODE` | ⬜ | Comment posture (default `assisted`) |
| `MIRA_DM_MODE` | ⬜ | DM posture (default `auto`) |
| `MIRA_ALWAYS_REPLY` | ⬜ | Reply to almost everything; only rulebook skips stay silent. `0` to disable |
| `WORKER_CONCURRENCY_COMMENTS` | ⬜ | Comment lane concurrency (default `10`) |
| `WORKER_CONCURRENCY_DM` | ⬜ | DM lane concurrency (default `10`) |
| `OLLAMA_HOST` | ⬜ | Defaults to `http://localhost:11434` |
| `OLLAMA_MODEL` | ⬜ | Local fallback reply model (default `qwen2.5:14b-instruct`) |
| `OLLAMA_EMBED_MODEL` | ⬜ | Embeddings model (default `nomic-embed-text`) |
| `API_PORT` | ⬜ | Elysia backend port (default `4000`) |

> 🔒 **The Instagram access token is never an env var and is never committed.**
> After you connect via OAuth, it is stored at `~/.mira/ig.json` (file mode `0600`) on your own machine only.

---

## 🔗 Connecting Instagram

1. In the Meta dashboard, add the **Instagram API with Instagram Login** product.
2. Whitelist the OAuth redirect: `<NEXT_PUBLIC_BASE_URL>/api/ig/callback`.
3. For live comment ingestion, the Meta webhook needs a public URL — expose your dev server with a tunnel (e.g. `bun run tunnel`, which runs ngrok against `:3000`) and set `NEXT_PUBLIC_BASE_URL` to that tunnel URL.
4. Start the app, click **Connect**, complete OAuth. The token lands in `~/.mira/ig.json`.

---

## 📜 Scripts

| Command | Action |
|---------|--------|
| `bun run start:all` | Launch the full stack — api, worker, web, and tunnel (`scripts/start-mira.sh`) |
| `bun run dev` | Web dev server only (`:3000`) |
| `bun run dev:api` | Elysia backend only (`:4000`) |
| `bun run dev:all` | Web + api together |
| `bun run worker` | BullMQ worker (comment / DM / reconcile / outbound queues) |
| `bun run tunnel` | ngrok tunnel to `:3000` |
| `bun run db:push` | Apply the database schema |
| `bun run db:generate` | Generate migrations |
| `bun run build` | Production build (web) |
| `bun start` | Run the production build |
| `bun run lint` | Lint |
| `bun test tests/` | Run the test suite |

---

## 🛠️ Tech stack

Bun · Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Elysia · PostgreSQL · Redis · BullMQ · Better Auth · Claude Agent SDK · Ollama · Server-Sent Events
