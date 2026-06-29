# Mira — Instagram Auto-Reply

> A personal AI that watches your Instagram comments, classifies intent, drafts human-sounding replies, and delivers links by DM — with a 3-panel review workspace so you stay in control.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-19-blue?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
  <img alt="Ollama" src="https://img.shields.io/badge/LLM-Ollama-orange" />
</p>

---

## ✨ What it does

- **Watches comments** on your Instagram posts via webhook + polling
- **Classifies intent** — question, business inquiry, praise, personal, spam
- **Drafts replies** with a local LLM, mirroring the commenter's language (English / Hinglish)
- **Delivers links by DM** when a comment asks for one
- **Knowledge base** — answers post-specific questions, asks the owner once when unsure, then serves every queued commenter
- **Review workspace** — 3-panel triage UI to approve, edit, or send

Reply modes: `shadow` (draft only) · `assisted` (approve before send) · `auto` (send immediately).

---

## 🧱 Requirements

| Need | Why | Install |
|------|-----|---------|
| **Node.js 20+** | runs the app | https://nodejs.org |
| **Ollama** | local LLM for replies + embeddings | https://ollama.com |
| **Meta / Instagram app** | OAuth + webhook access | https://developers.facebook.com/apps |

> ⚠️ **Ollama is required.** Every reply and knowledge search calls it. No Ollama → no replies.
> To avoid installing it on every machine, point `OLLAMA_HOST` at one shared Ollama instance.

Pull the models once:

```bash
ollama pull qwen2.5:7b-instruct   # reply generation (~4.7 GB)
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

# 4. Make sure Ollama is running
ollama serve        # (skip if it already runs as a service)

# 5. Start the app
bun run dev
```

Open **http://localhost:3100**.

---

## 🔐 Environment variables

Copy `.env.local.example` → `.env.local` and fill it in. **`.env.local` is gitignored — never commit real secrets.**

| Variable | Required | Description |
|----------|----------|-------------|
| `META_APP_ID` | ✅ | Meta app ID — [developers.facebook.com/apps](https://developers.facebook.com/apps) |
| `META_APP_SECRET` | ✅ | Meta app secret |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Public base URL — must match the OAuth redirect whitelisted in the Meta dashboard |
| `META_WEBHOOK_VERIFY_TOKEN` | ✅ | Any random string — set the same value in the Meta dashboard |
| `MIRA_REPLY_MODE` | ✅ | `shadow` · `assisted` · `auto` |
| `OLLAMA_HOST` | ⬜ | Defaults to `http://localhost:11434` |
| `OLLAMA_MODEL` | ⬜ | Defaults to `qwen2.5:7b-instruct` |
| `OLLAMA_EMBED_MODEL` | ⬜ | Defaults to `nomic-embed-text` |

> 🔒 **The Instagram access token is never an env var and is never committed.**
> After you connect via OAuth, it is stored at `~/.mira/ig.json` (file mode `0600`) on your own machine only.

---

## 🔗 Connecting Instagram

1. In the Meta dashboard, add the **Instagram API with Instagram Login** product.
2. Whitelist the OAuth redirect: `<NEXT_PUBLIC_BASE_URL>/api/ig/callback`.
3. For live comment ingestion, the Meta webhook needs a public URL — expose your dev server with a tunnel (e.g. `cloudflared tunnel`) and set `NEXT_PUBLIC_BASE_URL` to that tunnel URL.
4. Start the app, click **Connect**, complete OAuth. The token lands in `~/.mira/ig.json`.

---

## 🗂️ Project structure

```
apps/web/        Next.js dashboard (UI + /api/auth)
apps/api/        Elysia backend — routes → controllers → services
lib/ig/          Automation engine — ingest, automation, pipeline, graph, dm, store, rulebook
packages/db/     Drizzle schema + repos (Postgres/Supabase)
packages/auth/   BetterAuth · packages/shared/  shared contracts
worker/          BullMQ worker (event ingest + outbound send)
```

See `PROJECT_STRUCTURE.md` for the full map. State lives in Postgres (Drizzle) + Redis; the
Instagram access token is the only thing kept outside the DB (`~/.mira/ig.json`, file mode `0600`).

---

## 📜 Scripts

| Command | Action |
|---------|--------|
| `bun run start:all` | Start Ollama (if not running) **and** the dev server together |
| `bun run dev` | Start the dev server only |
| `bun run build` | Production build |
| `bun start` | Run the production build |
| `bun run lint` | Lint |

---

## 🛠️ Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · Ollama · Server-Sent Events
