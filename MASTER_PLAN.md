# Mira — Master Plan

**Instagram Comment Intelligence. Local-first. Built to feel human.**

Version 1.0 · 2026-05-21 · Status: all phases (0–7) shipped ✅

---

## 1. Product thesis

Mira is not a comment bot. A bot replies the same thing to everyone and gets the
account banned. Mira is a **comment intelligence layer**: it understands every
comment, answers what it can from a memory it builds over time, asks the owner
exactly once for anything it doesn't know, and never sends the same sentence
twice.

Three loops define the product:

1. **Answer loop** — generic comments (thanks, fire, welcome) get a unique,
   vibe-matched reply automatically. No human in the path.
2. **Learn loop** — a comment asks something specific ("which jacket?", "where
   is this?"). If Mira doesn't know, it asks the owner *beautifully*, once. The
   answer becomes a permanent fact. The next person who asks — on *any* post —
   gets answered instantly with no owner involvement.
3. **Deliver loop** — a comment asks for a link. Links aren't clickable in IG
   comments, so Mira DMs the link and posts a short public comment saying it did.
   If no link exists yet, Mira asks the owner, stores it, and serves everyone
   who asked — past and future.

Everything is managed from **one master Comments page**. A **Dashboard**
surprises the owner with what their account looks like. An **advanced Chat** is
the command console for Mira.

---

## 2. Locked decisions

| Decision | Choice | Consequence |
|---|---|---|
| LLM | **Local-only (Ollama)** | Privacy story intact (privacy/terms pages stay true). Pull a stronger model — `qwen2.5:14b-instruct` for replies, `nomic-embed-text` for memory search. No API cost, no data leaves the machine. |
| Automation posture | **Mostly-auto** | Default mode auto-sends generic acks + answers Mira is confident about (KB-backed). Uncertain / link / sensitive comments are queued for the owner. |
| Delivery | **Plan first** | This document. Build proceeds phase by phase after review. |

---

## 3. Where the codebase is today

Honest current-state — the plan builds on this, it does not pretend it's empty.

**Stack:** Next.js 16 (App Router, Turbopack), React 19, Tailwind v4,
framer-motion, Ollama. Single-page SPA — `app/page.tsx` switches views.

**Data:** one flat JSON file, `~/.mira/ig.json`, via `lib/ig/store.ts`
(`readStore` / `writeStore` / `patchStore`).

**Pipeline:** `lib/ig/pipeline.ts` — `processInbound` → `decide` → classify
intent → LLM draft / clarify / send / skip. `lib/ig/watcher.ts` polls the
Graph API every 15s. `lib/ig/bus.ts` is an SSE event bus.

**Views:** Chat · Auto-Reply · Comments · Posts · Settings.

**What already works and is reused:** intent classification, the clarification
loop (per-post), watermark dedup polling, SSE live updates, Ollama streaming
chat with account-context injection, Posts context editor.

**What's missing for the vision:**

- Memory is **per-post only** (`post.qa`). No account-level facts, no
  cross-post recall. This is the single biggest gap.
- No reply-uniqueness defense. Identical text repeats → IG ban risk.
- Auto-Reply and Comments are **two separate pages** for one workflow.
- No dashboard.
- Chat can talk but cannot *act*.
- Link delivery uses `/{igUserId}/messages` (needs a pre-existing
  conversation). The correct mechanism is comment **private replies**.

**Known defects to fix in Phase 0:**

- **Store write races.** `patchStore` is read-modify-write. The watcher fires
  `processInbound` for many comments concurrently (`.catch()` without `await`),
  each calling `patchStore` several times. Concurrent writes silently lose data.
  Needs a serialized writer.
- DM mechanism (above).
- Defensive `undefined` guards already patched in `chat/route.ts` and
  `AutoReply.tsx` — old records predate current schema; the Phase 0 migration
  removes the root cause.

---

## 4. Target architecture

```
                       ┌────────────────────────────┐
  Instagram Graph API  │      Ingestion              │
  ── comments ───────► │  watcher (poll) + webhook   │
                       └──────────────┬─────────────┘
                                      ▼
                       ┌────────────────────────────┐
                       │      Pipeline (decide)      │
                       │  classify → intent + vibe   │
                       │           + sensitivity     │
                       └──────────────┬─────────────┘
                  ┌───────────────────┼───────────────────┐
                  ▼                   ▼                   ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │ Knowledge Engine│ │ Reply Engine    │ │ Link Vault +    │
        │ embed + recall  │ │ generate +      │ │ DM Router       │
        │ clarify→fact    │ │ vibe + dedupe   │ │ private_replies │
        └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
                 └──────────┬────────┴──────────┬────────┘
                            ▼                   ▼
                  ┌─────────────────┐ ┌─────────────────┐
                  │ Store (queued   │ │ Sender (pace +  │
                  │ writer, ig.json)│ │ throttle gate)  │
                  └────────┬────────┘ └─────────────────┘
                           ▼
        SSE bus  ──►  UI: Dashboard · Master Comments · Posts · Chat
```

New library modules under `lib/ig/`:

| Module | Responsibility |
|---|---|
| `store.ts` *(rewrite)* | Schema v2 + serialized write queue + migration |
| `embed.ts` *(new)* | Ollama `nomic-embed-text` calls, cosine similarity, keyword fallback |
| `knowledge.ts` *(new)* | Fact CRUD, semantic recall, clarification→fact promotion |
| `variation.ts` *(new)* | Reply fingerprinting, similarity gate, style-seed directives |
| `sender.ts` *(new)* | Pace/throttle gate, daily caps, jitter, selective-reply |
| `links.ts` *(new)* | Link Vault, private-reply delivery, retroactive fan-out |
| `intent.ts` *(extend)* | + vibe + sensitivity + language |
| `pipeline.ts` *(extend)* | Orchestrate the engines above |
| `agent.ts` *(new)* | Chat tool-calling loop (command console) |

---

## 5. Data model — `ig.json` schema v2

New record types (added to `lib/ig/store.ts`):

```ts
// Account-level + post-level memory. The heart of the learn loop.
type Fact = {
  id: string;
  question: string;          // canonical phrasing
  answer: string;            // owner's confirmed answer
  topic: "gear" | "location" | "song" | "personal" | "shop" | "general";
  scope: "account" | "post"; // account = recalled on every post
  postId?: string;           // set when scope = "post"
  aliases: string[];         // alternate phrasings seen in the wild
  embedding?: number[];      // nomic-embed-text vector for recall
  link?: { url: string; label: string };  // present → this fact is a link
  hitCount: number;          // times reused to answer a comment
  confidence: number;        // owner-confirmed = 1.0
  durable: boolean;          // false = decays (e.g. "currently in Goa")
  expiresAt?: number;
  sourceCommentId?: string;
  createdAt: number; updatedAt: number; lastUsedAt?: number;
};

// Reply uniqueness ledger — anti-ban.
type ReplyFingerprint = {
  hash: string;              // normalized-text hash
  shingles: string[];        // word-trigrams for Jaccard similarity
  intent: string;
  sentAt: number;
};

// Owner profile — pre-loaded facts so Mira rarely has to ask.
type OwnerProfile = {
  bio: string;               // free text Mira reads as context
  voice: string;             // tone description, drives style
  defaultLanguage: "english" | "hinglish";
  // facts pre-seeded by the owner live in the Fact list, scope:"account"
};
```

Extended `IgStore`:

```ts
type IgStore = {
  schemaVersion: 2;          // drives migration
  // ... all existing fields ...
  knowledge: Fact[];         // the knowledge base
  fingerprints: ReplyFingerprint[];  // last ~500 sent replies
  ownerProfile: OwnerProfile;
  dailyStats: Record<string, DailyStat>;  // "YYYY-MM-DD" → counters
  sendQueue: ScheduledSend[];  // paced outbound (anti-ban)
};
```

Extended `Settings`:

```ts
type Settings = {
  replyMode: "shadow" | "assisted" | "balanced" | "auto"; // default: balanced
  // shadow   = draft only, never send
  // assisted = owner approves everything
  // balanced = MOSTLY-AUTO: auto acks + confident KB answers, queue the rest
  // auto     = send everything within safety limits
  dailySendCap: number;          // hard ceiling, default 80
  minSecondsBetweenSends: number;// pacing floor, default 45
  sendJitter: boolean;           // randomize timing, default true
  selectiveReplyRate: number;    // 0–1, fraction of low-value acks to skip
  uniquenessThreshold: number;   // similarity above this → regenerate, default 0.55
  // ... existing: skipOwnComments, autoDMLinks, cooldownMinutes, quietHours ...
};
```

**Migration:** `readStore` detects missing `schemaVersion`, runs a one-time
upgrade — folds existing `post.qa` entries into `Fact` records
(`scope:"post"`), seeds empty `knowledge`/`fingerprints`/`ownerProfile`,
backfills `schemaVersion: 2`. Old `~/.shaiz` data already copied to `~/.mira`.

**Concurrency fix:** all mutations route through a single async write queue —
`patchStore` enqueues a read-modify-write task; tasks run strictly in series.
Kills the lost-write race.

---

## 6. Core engines

### 6.1 Knowledge Engine — the learn loop

The behavior the owner described: *"which riding jacket you are using — when you
say it once, the system remembers, and if on another post someone asks, the
system replies with that past data."*

**Storage:** `Fact[]` in the store. Two scopes — `account` (recalled
everywhere — gear, personal, shop) and `post` (tied to one post — "where was
*this* shot").

**Recall (local-only embeddings):**
1. On an incoming question, embed the comment text via Ollama
   `nomic-embed-text` (`POST /api/embeddings`, ~274 MB model, fully local).
2. Cosine-similarity search across `account`-scope facts **+** this post's
   `post`-scope facts.
3. Score ≥ threshold → answer directly from the fact, `hitCount++`,
   `lastUsedAt = now`. **No clarification.** This is cross-post recall.
4. No match → clarification to the owner (§6.4).
5. Fallback if `nomic-embed-text` isn't pulled: keyword/BM25 match on
   `question + aliases`. Mira degrades, never breaks.

**Promotion:** an owner's clarification answer becomes a `Fact`. An LLM step
picks `topic` and proposes `scope` (gear/personal/shop → account; "where/when
shot" → post); the owner can override scope in one tap.

**Profile pre-load:** an owner Knowledge editor (Settings → Knowledge) where the
owner front-loads facts — jacket brand, camera, presets, bike, shop link — so
Mira answers from day one without asking.

**Decay:** `durable: false` facts ("currently travelling in Goa") carry
`expiresAt`; expired facts are skipped in recall and surfaced for refresh.

**Self-correction:** when the owner edits a drafted reply before sending, the
diff is mined — corrected facts update the KB, and the edited phrasing feeds
`styleSamples`. Mira gets better the more it's used.

### 6.2 Reply Engine — uniqueness + vibe (anti-ban)

IG flags accounts that post identical/near-identical replies. Defense, layered:

1. **Fingerprint ledger.** Every sent reply → normalized (lowercase, strip
   emoji/punctuation, collapse whitespace) → hash + word-trigram shingles,
   stored in `fingerprints` (rolling ~500).
2. **Similarity gate.** Before send, Jaccard similarity of shingles vs recent
   fingerprints of the *same intent*. Above `uniquenessThreshold` → regenerate
   at higher temperature with an explicit *"say this completely differently,
   avoid: <phrases>"* instruction. Up to 2 retries, then fall back to a
   templated variant pool.
3. **Style-seed directives.** Each generation gets randomized knobs — length
   (short/medium), emoji count (0/1/2), opener style, structure. Spreads the
   output distribution so even 50 "🔥" comments get 50 distinct acks.
4. **Vibe matching.** A classification step tags the comment's vibe — hype /
   chill / question / funny / critical / desi-hinglish / formal. The generator
   mirrors it: a hype comment gets hype energy, a chill one gets chill.
5. **Selective reply.** Replying to 100% of comments is itself a bot signal.
   `selectiveReplyRate` randomly skips a fraction of low-value acks.
6. **Human cadence.** Sends are paced through the Sender (§6.5) — never bursts,
   never robotic fixed intervals.

### 6.3 Link Vault & DM Router — the deliver loop

*"If someone asks for a link and there's no link on the post, Mira asks for it
and remembers it. Next time someone asks, Mira replies with the link in a DM —
not in a comment, because links aren't clickable there — and comments that the
link was sent."*

- **Link Vault:** links are `Fact` records with a `link` field. Scopes —
  account ("my Lightroom presets", "Amazon storefront") and post ("the jacket
  in this reel").
- **Delivery mechanism — fix from current code:** use the IG **comment private
  reply** endpoint, `POST /{ig-comment-id}/private_replies` with
  `{message:{text}}`. It sends a DM in direct response to a comment, works
  without a pre-existing conversation, valid for 7 days after the comment.
  Current `sendDM` via `/{igUserId}/messages` is replaced for this path.
- **Flow on `link_request`:**
  - Vault hit (semantic search, post-scope then account-scope) → private-reply
    the link, then post a short **unique** public comment ("just dropped it in
    your DMs 📩" — varied every time), log to `dmLog`.
  - Vault miss → clarification (`kind:"link"`) to the owner. Owner pastes the
    URL → a Link Fact is created → **retroactive fan-out**: every queued comment
    waiting on that link gets served (private reply + public comment), and all
    future askers are auto-served.
- Respect DM rate limits and the 7-day private-reply window; expired ones fall
  back to a public comment with the link's label.

### 6.4 Clarification Loop v2

- **Check before asking.** Clarify only after the Knowledge Engine misses.
- **Batch.** Similar pending questions across comments are grouped — the owner
  answers once, Mira resolves all of them (retroactive fan-out).
- **Answer anywhere.** Resolve a clarification from the master Comments page,
  from Chat ("the jacket is Rynox Air GT"), or a quick-reply prompt.
- **Beautiful UI.** Inline, calm, one-field cards in the Comments timeline —
  shown as a friendly question from Mira, not a database form.
- Every answer becomes a `Fact` (§6.1).

### 6.5 Sender — pacing & throttle gate

All outbound (comments, private replies) passes one gate:

- Daily cap (`dailySendCap`), per-recipient cooldown, quiet hours.
- Minimum spacing (`minSecondsBetweenSends`) + randomized jitter — no bursts,
  no fixed rhythm.
- Over-cap or in quiet hours → the send is parked in `sendQueue` and released
  later, not dropped.
- Every send updates `dailyStats` and the fingerprint ledger.

---

## 7. UI — Master Comments page

One page replaces **both** Auto-Reply and Comments. Auto-Reply view, its nav
item, and routing are deleted; `processInbound` and all APIs are untouched.

**Layout**

- **Top bar** — account · live indicator · mode switch
  (shadow / assisted / balanced / auto) · watcher toggle · search · test.
- **Smart tabs with live counts** — `Needs you` (clarifications + sensitive) ·
  `Drafts` (pending approval) · `Auto-replied` · `Replied` · `Skipped` ·
  `All` · `Mine`.
- **Unified timeline** — one rich card per comment, day-grouped:
  - post thumbnail, commenter with history badge ("new" / "3rd comment" /
    "superfan"), the comment text, intent + vibe chips.
  - **Action zone**, contextual:
    - clarification → inline answer field (Mira's question, friendly).
    - pending draft → editable text + **Send** · **↻ Regenerate** (fresh
      variation) · **Reject**.
    - needs link → URL paste field.
    - auto-replied → the sent reply, with a brief **Undo** window.
  - row actions — open IG thread, view commenter, trust/block.
- **Bulk bar** — "Approve all confident drafts", "Regenerate selected".
- **Right rail** — live feed + compact stats (today's numbers, anti-ban meter).
- **Keyboard** — `j/k` navigate · `a` approve · `r` regenerate · `e` edit ·
  `/` search.

`components/Comments.tsx` is rewritten as this page; `components/AutoReply.tsx`
is removed; `DraftCard`, `ClarRow`, `HistoryRow` are salvaged into it.

---

## 8. UI — Dashboard

A new default view (`components/Dashboard.tsx`) that *surprises*. Editorial,
glassy, the existing serif aesthetic, animated counters.

- **Hero** — account snapshot: handle, reply coverage %, avg response time,
  facts known.
- **Today strip** — new comments · auto-replied · pending · needs-you.
- **Charts** — comments over time (area), intent breakdown (donut), busiest
  hours (heatmap), top themes (bars). Lightweight SVG/Canvas, no heavy dep.
- **Knowledge panel** — facts known, facts reused (Σ `hitCount`), clarifications
  resolved, top reused fact.
- **Anti-ban health meter** — send rate vs safe cap, uniqueness score,
  quiet-hours state. Green/amber/red.
- **People** — top posts by engagement (Graph insights, endpoint exists),
  superfans / top commenters.
- **Mira activity feed** — narrated: *"Today Mira auto-replied 12, learned 3
  new facts, DM'd 4 links, flagged 1 for you."*

### 9. Chat v2 — the command console

Chat works (Ollama streaming, account context). v2 makes it *act*.

- **Tool calling.** A local tool-loop (`lib/ig/agent.ts`): the model emits a
  JSON tool call, the backend runs it against the store, returns the result,
  the model continues. Tools:
  - `set_fact` / `update_fact` / `delete_fact`
  - `answer_clarification`
  - `regenerate_draft` / `approve_draft` / `approve_all_confident`
  - `add_link`
  - `block_user` / `trust_user`
  - `set_mode`, `query_stats`
- So the owner can say *"the jacket is Rynox Air GT, save it"*, *"answer the
  open location question with Munnar"*, *"regenerate every pending draft"*,
  *"what's waiting on me?"* — and Mira does it.
- **Knowledge-aware** — chat reads the full KB + account snapshot.
- Markdown rendering, copy buttons, structured/tabular output, quick-action
  chips, persisted threads (localStorage, already in place).
- qwen2.5 handles constrained-JSON tool calls; every call is validated and
  retried on malformed output, exactly like `chatJSON` today.

---

## 10. Advanced features — the menu ("sky is the limit")

Roadmapped (Phase 7) and future. Pick per appetite.

- **Superfan engine** — detect recurring commenters, warmer replies for VIPs,
  owner alerts when a large/verified account comments.
- **Crisis watch** — a spike in negative sentiment → alert the owner.
- **Spam & troll shield** — auto-hide spam via the IG hide-comment API
  (`POST /{comment-id}` `hide=true`), pattern-learning blocklist.
- **Comment → content** — repeated questions auto-compile into an FAQ and
  "make a post about X" suggestions.
- **Collab / business inbox** — sensitive inquiries separated, professional
  draft tone, never auto-sent.
- **Daily digest** — a morning summary in-app (optionally emailed).
- **Auto-translate** — international comments answered in their language.
- **A/B reply tone** — test which tone earns more follow-on engagement.
- **Active-window scheduling** — Mira works owner-defined hours.
- **Webhook + poll hybrid** — webhook primary, poll as the reliability net.
- **Multi-account** — later.

---

## 11. Phased roadmap

Each implementation phase reads the relevant guide in
`node_modules/next/dist/docs/` first — this Next.js build has breaking changes
from training data (`AGENTS.md`). Every phase ends with `tsc` clean + a verify
run.

| Phase | Title | Scope | Exit criteria |
|---|---|---|---|
| **0** | Foundation | Schema v2 + migration; serialized write queue; `embed.ts`; fix DM → `private_replies` | Old data migrates clean; no write races; embeddings recall works |
| **1** | Master Comments UI | Build unified page; delete Auto-Reply page/nav/route; salvage cards | One page runs the whole workflow; Auto-Reply gone |
| **2** | Knowledge Engine | `knowledge.ts`; KB check before clarify; clarification→fact; Knowledge editor; cross-post recall | A fact answered once is reused on a different post with no owner action |
| **3** | Link Vault & DM Router | `links.ts`; private-reply delivery; retroactive fan-out; "check DM" comments | Link asked once → stored → all askers DM'd; public comment posted |
| **4** | Anti-ban / Variation | `variation.ts`; `sender.ts`; fingerprints, similarity gate, vibe, pacing, selective reply | No two sent replies near-identical; sends paced + capped |
| **5** | Dashboard | `components/Dashboard.tsx`; charts; knowledge + anti-ban panels; activity feed | Dashboard is the default view and surprises |
| **6** | Chat v2 | `agent.ts` tool-loop; chat acts on the store; markdown UI | Owner manages Mira entirely from chat |
| **7** | Advanced | Pick from §10 | Per chosen feature |

Phases 0→4 are the spine and ship in order. 5 and 6 can run in parallel after
2. 7 is optional and incremental.

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **IG ban from automation** | The whole anti-ban engine (§6.2, §6.5). Recommend running `assisted` first, graduating to `balanced` once reply quality is trusted. Owner chose mostly-auto — ship `balanced` as default with caps on. |
| **Store write races** | Serialized write queue, Phase 0. Highest-priority fix. |
| **Local model quality** | qwen2.5:7b is thin for nuanced vibe/uniqueness. Plan recommends `qwen2.5:14b-instruct`. JSON reliability handled by `format:json` + retry + fallback (existing pattern). |
| **Embedding model not pulled** | Keyword/BM25 fallback in `embed.ts`. First run prompts `ollama pull nomic-embed-text`. |
| **IG API limits** | Private-reply 7-day window respected; token-expiry surfaced; poll backoff; webhook+poll hybrid (Phase 7). |
| **`private_replies` API access** | Needs the right IG permissions/app-review state. Phase 3 verifies on a live account before relying on it; public-comment fallback if unavailable. |
| **Bigger model latency** | Pipeline already async + queued; UI is optimistic; classification can stay on a small fast model, generation on 14b. |

---

## 13. Privacy

Local-only LLM keeps the privacy/terms pages accurate — nothing about comments
or the knowledge base leaves the machine. The KB, embeddings, and fingerprints
all live in `~/.mira/ig.json` at mode `0600`. No third party sees account data.

---

## 14. Success criteria

Mira is done — for v1 — when, on a live account:

1. A generic comment gets a **unique, vibe-matched** auto-reply with no owner
   action, and no two replies are near-identical.
2. A specific question Mira can't answer produces **one** clean clarification;
   the owner's answer is reused on a **different post** automatically.
3. A link asked with none on file → owner is asked once → every asker (past and
   future) is DM'd the link with a unique public comment.
4. The owner runs the entire workflow from the **single master Comments page**.
5. The **Dashboard** makes the owner stop and look.
6. The owner can tell Mira what to do in **plain language in Chat** and it does it.
7. Send pacing + caps keep the account inside safe automation limits.

---

*Next step: review this plan, adjust priorities, then say the word to start
Phase 0.*
