# MIRA OS — Build Specification & Agent Instructions

**Audience:** Claude Code (agentic / auto mode)
**Purpose:** Build the Mira OS Instagram management platform on top of an existing codebase.
**Read this entire file before writing any code.** Work top-to-bottom, phase by phase. Every task has acceptance criteria. When in doubt, consult Section 3 (Ground-Truth API Reference) — never invent API behavior.

---

## 0. HOW TO USE THIS DOCUMENT

1. Read the whole file first. Do not start coding from Section 1 onwards blindly.
2. **Detect the existing stack before doing anything** (Section 2.1). Match it. Do not introduce new frameworks, languages, ORMs, or state libraries without explicitly flagging why.
3. Build in the phase order defined in Section 7. Do not jump ahead.
4. For any Instagram/Meta API behavior, the ONLY source of truth is **Section 3**. If something you need is not in Section 3, STOP and ask — do not guess endpoints, field names, limits, or permissions.
5. After each task, self-check against its acceptance criteria before moving on.
6. Respect Section 8 (Do Not Build) and Section 9 (Stop-and-Ask conditions).

---

## 1. PROJECT CONTEXT

**Mira OS** is an AI-powered "operating system" for Instagram business/creator accounts. It turns DMs and comments into managed business conversations: triage, lead scoring, opportunity detection, CRM, and AI-assisted replies.

### Strategic pillars (these shape every technical decision)

- **Assisted mode is the wedge.** The flagship behavior is: AI drafts a reply in the creator's voice, a human reviews and sends. This is both the product differentiator AND a compliance advantage (a human sending the message is what legitimately unlocks Meta's 7-day Human Agent window). Fully-autonomous sending is a later phase, behind a flag, off by default.
- **Official Meta Graph API only.** No unofficial/private automation, no headless-browser scraping, no session-token hacks. Account safety is non-negotiable.
- **India-first.** Primary users are Indian creators/SMBs. Pricing is INR. AI disclosure is a configurable setting (see 2.6), not a hardcoded always-on banner.

### CURRENT STATE — DO NOT BREAK THIS

- **Comment-to-DM automation (non-AI) is already implemented and working in this repo.**
- Treat the existing Instagram API client / auth / webhook handling as the source of truth for "how this codebase talks to Meta." **Reuse it. Do not duplicate it. Do not rewrite it.** Extend it.
- Before building any new Meta integration, locate the existing comment-to-DM code path and the existing webhook receiver, and build on the same client, the same env-var conventions, and the same patterns.

---

## 2. NON-NEGOTIABLE ENGINEERING RULES

### 2.1 Stack discipline

- Inspect `package.json` / `requirements.txt` / lockfiles / existing folder structure FIRST. Identify language, framework, DB, ORM, auth, and styling system in use.
- **Conform to what exists.** Same framework, same patterns, same naming conventions, same folder structure.
- If a genuinely new dependency is required, add it minimally and note it in your task summary with a one-line justification.

### 2.2 Anti-hallucination rules (CRITICAL)

- **Never invent Meta API endpoints, field names, webhook field names, rate limits, or permission scopes.** Use only Section 3. If you need something not listed there, mark it `// TODO: VERIFY against developers.facebook.com` and surface it as an open question rather than fabricating a plausible-looking endpoint.
- Distinguish **Meta-doc-confirmed** facts from **third-party-reported** facts. Section 3 tags anything not directly confirmed in Meta docs with `[REPORTED — VERIFY]`. Do not hardcode `[REPORTED]` numbers as constants without a config override.
- Do not invent business logic the spec doesn't describe. If a behavior is ambiguous, implement the simplest correct version and leave a clearly-marked `// ASSUMPTION:` comment.
- Never fabricate test data that implies real users. Use obvious placeholders.

### 2.3 Code quality

- Strong typing everywhere the language supports it. No `any` unless unavoidable and commented.
- Small, single-responsibility functions. No god-files. No copy-paste; extract shared logic.
- Every external call (DB, Meta API, AI provider) wrapped in error handling with structured logging. No silent catches.
- No dead code, no commented-out blocks left behind, no console noise in committed code (use the project logger).
- Meaningful names. No `data2`, `tmp`, `handleStuff`.
- Pure/business logic separated from I/O so it can be unit-tested.

### 2.4 Security

- **No secrets in code.** All tokens, app secrets, and AI keys come from environment variables / secret store. Never commit `.env`.
- **Encrypt user access tokens at rest** (long-lived IG tokens, BYOK AI keys). Tokens are the keys to a user's account.
- **Validate every webhook** with the `X-Hub-Signature-256` SHA256 HMAC using the app secret (Section 3.8). Reject unsigned/invalid payloads.
- Validate and sanitize all inbound webhook and user input. Never trust payload shape.

### 2.5 Meta API integration rules

- All Meta calls go through **one abstraction layer / client module** (reuse the existing one). UI and business logic never call `fetch` to graph.instagram.com directly.
- The client must support a **mock/stub mode** behind a config flag, so the entire app (inbox, CRM, flows, UI) can be built and tested WITHOUT Advanced Access / App Review approval. Real calls are gated behind a `META_LIVE` flag and a permission check.
- **Respect rate limits and messaging windows in code** (Section 3.9, 3.10). The sender must refuse to send outside an open window unless a valid Human Agent context applies, and must never apply the `HUMAN_AGENT` tag to an automated (non-human-initiated) send.
- **Webhook handlers must be idempotent and deduplicated** (Meta retries for up to 36h). Respond `200` fast; process async.
- **Persist every webhook payload** to an event log. Meta does not let you query historical webhook data — your datastore is the only memory (Section 3.7).

### 2.6 Compliance rules (build these as real logic, not comments)

- **Messaging window engine:** track per-conversation `window_expires_at`. Standard window = 24h from the user's last inbound message; it RESETS on every new user message. Block standard sends after expiry.
- **Human Agent (7-day) window:** only for messages a human actually sends from the inbox. Never for automated sends.
- **Private replies:** one per comment, within 7 days, and they do NOT open the 24h standard window — model this correctly.
- **AI disclosure setting:** a per-account toggle, default OFF but recommended, with editable disclosure text. Force-ON (locked) only when the account self-declares California or Germany market. Manual and Assisted modes do not trigger a disclosure requirement; only Autonomous mode does (and only for flagged markets). Do not show disclosure banners globally.
- **Marketing Messages / broadcasts:** only to users who opted in inside an open window. Store consent with timestamp and source.

### 2.7 Design

- Match Mira's existing brand assets if present in the repo. If none, build a clean, premium, editorial UI — not a generic admin template. Consistent spacing scale, one type system, restrained color, real empty/loading/error states for every screen.
- Every list/feed needs: loading state, empty state, error state. No blank screens.

### 2.8 Testing & hygiene

- Unit tests for: window/rate-limit logic, lead scoring, webhook signature validation, the Meta client's request builders.
- Integration test the webhook receiver against sample payloads (Section 3.7 shapes).
- Small, focused commits with clear messages. One feature/page per logical change.

---

## 3. GROUND-TRUTH API REFERENCE (USE ONLY THIS — DO NOT INVENT)

> Source: Meta "Instagram Platform" developer docs (Instagram API with Instagram Login), verified. Items not directly in Meta docs are tagged `[REPORTED — VERIFY]`.

### 3.1 API config & auth

- This project uses **Instagram API with Instagram Login**. Base URL: `https://graph.instagram.com`. Account login is via Business Login for Instagram (no Facebook Page required for this config).
- Account must be an **Instagram professional account** (Business or Creator). Personal accounts cannot use messaging/comment automation.
- Token flow: authorization code (valid 1h) → short-lived token (1h) → **long-lived token (60 days, refreshable)**. App-scoped, OAuth 2.0.
- **Access levels:** Standard Access (only accounts you own/added in dashboard) vs **Advanced Access** (serving accounts you don't own — requires **App Review + Business Verification**). Build for Standard first; design so Advanced unlocks features via flags.

### 3.2 Permissions (Instagram Login)

- `instagram_business_basic`
- `instagram_business_content_publish`
- `instagram_business_manage_comments`
- `instagram_business_manage_messages`
- **Human Agent** feature (for the 7-day human-sent window)
- Each is reviewed individually in App Review. Tag every feature in Section 6 with the permission it needs.

### 3.3 Identity

- Every interacting user is identified by an **Instagram-scoped ID (IGSID)** — unique per person per account. This is your CRM primary key for a contact.
- Profile data is limited. You generally do NOT get email/phone automatically. You DO get them only if the user taps a **prefilled email/phone Quick Reply** (Section 3.5). Capture + store consent when that happens.

### 3.4 Message types you can SEND (only inside an open window)

Per `POST /<IG_ID>/messages` with `recipient.id = <IGSID>`:

- **Text / links** — UTF-8, max 1000 bytes.
- **Images / GIFs** — up to 10 attachments per message. png/jpeg, max 8MB.
- **Audio** — aac/m4a/wav/mp4, max 25MB.
- **Video** — mp4/ogg/avi/mov/webm, max 25MB.
- **File** — pdf, max 25MB.
- **Sticker** — heart sticker via `attachment.type = like_heart`.
- **Reaction** — `sender_action: react` / `unreact` with `payload.message_id` + `reaction` (any emoji). Re-react to edit.
- **Shared post** — `attachment.type = MEDIA_SHARE`, `payload.id = <POST_ID>`; the post must be owned by the app user.
- **Attachment Upload API** — upload media once, get an `attachment_id`, reuse across many recipients (avoids re-uploading lead magnets). Can mix `url` and `attachment_id`.

### 3.5 Interactive primitives

- **Quick Replies** — max **13** buttons; titles up to **20 chars** (truncated beyond). `content_type: text | user_phone_number | user_email`. Phone/email buttons prefill from the user's profile; if user has none, that button is hidden. Selection fires a `messages` webhook with the button `payload`. **Not available on desktop.**
- **Generic Template** — structured card: title (required) + at least one of {subtitle, image, up to **3** buttons}. Buttons can open a URL or fire a postback. **Carousel** = 2–10 cards scrolled horizontally; put cards with image + button first/second.
- **Button Template** — text + buttons (URL / postback).
- **Ice Breakers** — up to **4** FAQ-style starter questions shown when a user opens the DM for the first time.
- **Persistent Menu** — always-available menu of core actions in the thread.
- **Marketing Messages** — opt-in, recurring, free notifications on an opted-in topic. The only compliant way to re-engage outside the window at scale.
- **One-Time Notification** `[REPORTED — VERIFY]` — single follow-up after the window, requires in-window opt-in.

### 3.6 Webhook fields (subscribe via `POST /me/subscribed_apps?subscribed_fields=...`)

Full subscribable set for messaging/comments:
| Field | Fires when |
|---|---|
| `messages` | User sends a DM (this is your main inbound) |
| `message_echoes` | A message is sent from the account (incl. by you) |
| `message_reactions` | User reacts/unreacts to a message |
| `messaging_seen` | User READ your message (silent re-engagement trigger) |
| `messaging_postbacks` | User taps a postback button (quick reply / template) |
| `messaging_optins` | User opts in (e.g. marketing messages) |
| `messaging_referral` | Conversation started from an ad / `ig.me` ref link / post — tells you the SOURCE |
| `messaging_handover` | Thread control passed between apps (handover protocol) |
| `standby` | Messages while your app is secondary receiver (handover) |
| `messaging_policy_enforcement` | Policy action notice |
| `response_feedback` | Feedback on a response |
| `comments` | New comment on a post/reel (your existing comment-to-DM uses this) |
| `live_comments` | Comment during a live broadcast (only while live) |
| `mentions` | Account @mentioned (included in the `comments` notification for IG Login) |
| `story_insights` | Story metrics — **only available via Facebook Login config, not Instagram Login.** Do not promise this on IG Login. |

### 3.7 Webhook handling rules

- App must be set to **Live** to receive webhooks. Advanced Access needed for `comments`/`live_comments`. Account must be public for comment/mention notifications.
- **You cannot query historical webhook data — store every payload yourself.**
- Notifications batch up to 1000 updates; batching not guaranteed — handle each individually.
- Retries: failures retried with decreasing frequency over **36h**; dropped after. **Dedupe** on message/event ID.
- Respond `200 OK` to all notifications.
- Sample `messages` shape (quick-reply selection):

```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "<IGID>",
      "time": 0,
      "messaging": [
        {
          "sender": { "id": "<IGSID>" },
          "recipient": { "id": "<IGID>" },
          "message": {
            "quick_reply": { "payload": "<PAYLOAD>" },
            "mid": "<MID>",
            "text": "<TEXT>"
          }
        }
      ]
    }
  ]
}
```

### 3.8 Webhook security

- Validate `X-Hub-Signature-256` header: `sha256=` + HMAC-SHA256(payload, APP_SECRET). Reject mismatches. HTTPS only (no self-signed). mTLS optionally supported.

### 3.9 Rate limits

- **Send API:** 100 calls/sec/account for text/links/reactions/stickers; 10 calls/sec/account for audio/video.
- **Conversations API:** 2 calls/sec/account.
- **Private Replies:** 100/sec/account for IG Live comments; **750/hour/account** for comments on posts/reels.
- General (non-messaging) endpoints: `4800 × impressions` calls per rolling 24h.
- Discovery & Hashtag Search use a separate **platform** rate-limit bucket.
- `[REPORTED — VERIFY]` Additional 2026 caps reported by third parties: ~200 automated DMs/hour/account, and a 1-DM-per-user-per-24h cap on comment & story triggers. Implement as configurable throttles; verify exact numbers against Meta before treating as hard limits.

### 3.10 Messaging windows & tags

- **24h standard window:** opens on user's inbound message, RESETS on each new user message. Promotional content allowed in-window.
- **Human Agent tag (`HUMAN_AGENT`):** extends to **7 days** after the user's last message, **for human-sent messages only**. Using it for automated/bot sends is prohibited and detectable — never do it programmatically for automated flows.
- **Private replies:** 1 per comment, within 7 days; do NOT open the 24h window.
- **Outside all windows:** only Marketing Messages (opted-in) or approved tags.

### 3.11 Comment moderation

- Get comments, reply to comments, hide/unhide, delete, enable/disable comments on owned media. Detect @mentions.

### 3.12 Content publishing

- Publish single image, video, reel, or carousel on the user's behalf. (Product tagging / collaborator tags exist mainly on the Facebook Login config.)

### 3.13 Insights

- Account metrics (e.g. impressions, reach, profile_views, follower metrics) and media metrics (engagement, impressions, reach, likes, comments, saves, video views).
- **User metrics stored only 90 days.** Some metrics need **100+ followers**. One account at a time.

### 3.14 Discovery

- **Hashtag Search:** find public media for a hashtag (campaign/opportunity sourcing).
- **Business Discovery:** read another public business/creator account's public metrics and media (competitor intel).

---

## 4. DATA MODEL (core entities)

Implement using the existing ORM/patterns. Field lists are the minimum; extend as needed.

- **Account** — connected IG professional account: `ig_id`, `username`, `access_token (encrypted)`, `token_expires_at`, `market` (for disclosure rules), `plan`, `ai_provider`, `byok_key (encrypted, nullable)`.
- **Contact** — a person: `igsid` (unique per account), `account_id`, `display_name?`, `phone?`, `email?` (only if captured via quick reply, with `consent_at`), `tags[]`, `lead_status` (cold/warm/hot/vip/returning/customer), `lead_score`, `owner_id?`, `first_seen_at`, `last_interaction_at`.
- **Conversation** — `contact_id`, `account_id`, `folder` (primary/general/requests), `window_expires_at`, `human_agent_window_expires_at`, `status`, `assigned_to?`, `ai_mode` (manual/assisted/autonomous).
- **Message** — `conversation_id`, `mid`, `direction` (in/out), `type`, `body/attachments`, `is_echo`, `sent_by` (user/ai/human), `seen_at?`, `created_at`.
- **WebhookEvent** — raw audit log: `field`, `payload (jsonb)`, `dedupe_key`, `received_at`, `processed_at?`. (Never deleted lightly — this is system memory.)
- **Automation / Flow** — `name`, `trigger_type` (comment/keyword/story_mention/dm_keyword/ice_breaker/referral), `trigger_config`, `steps[]`, `enabled`, `account_id`.
- **Trigger keyword/config** — keyword(s), matched post(s), reply action.
- **Product / InventoryItem** — `account_id`, `title`, `description`, `price`, `currency`, `image_url`, `attachment_id?` (cached IG upload), `sku?`, `stock_status`, `tags[]`, `cta_url?`. (Powers in-DM catalog carousels.)
- **Catalog** — grouping of products.
- **Opportunity** — `conversation_id`, `type` (sponsorship/brand_deal/collab/podcast/investor/partnership/media), `confidence`, `value_estimate?`, `status`, `detected_at`.
- **BrandVoiceProfile** — `account_id`, training samples, learned tone/vocabulary/emoji config, `version`.
- **KnowledgeBaseEntry** — `account_id`, `question`, `answer`, `tags[]` (source for AI replies / FAQ).
- **Broadcast / Campaign** — `account_id`, `audience_filter`, `message`, `opt_in_topic`, `status`, `scheduled_at`.
- **OptIn** — `contact_id`, `topic`, `source`, `consented_at`.
- **TeamMember / Role** — `account_id`, `user_id`, `role` (owner/admin/agent/viewer), permissions (who can enable autonomous, who sees revenue).
- **AuditLog** — every AI/automated action: `actor` (ai/human/system), `action`, `conversation_id?`, `reason`, `created_at` (explainability for autonomous mode).
- **DecisionLog** — per inbound: `decision` (reply/draft/ignore/escalate/notify/wait/assign), `confidence`, `risk_level`.

---

## 5. INFORMATION ARCHITECTURE / NAVBAR

Every primary nav item below maps to features it serves. **Note the supporting pages** — e.g. in-DM product catalogs require an Inventory page to manage the products first.

### Primary navigation

1. **Dashboard** — new leads, hot leads, opportunities, revenue pipeline, AI insights, window/quota health. _(Serves: overview of all engines.)_
2. **Inbox** — unified conversations; AI draft shown inline (Assisted mode); edit & send; AI summaries; tags; notes; assign; window countdown per thread; "seen but unreplied" filter. _(Serves: AI Conversation Engine, Decision Engine, Voice Engine.)_
3. **Contacts / CRM** — contact profiles, timeline, tags, lead score & status, owner, relationship history, captured phone/email. _(Serves: CRM Engine, Lead Intelligence, Memory.)_
4. **Opportunities** — feed of detected high-value threads (sponsorships, collabs, deals) with confidence + estimated value; convert to CRM. _(Serves: Opportunity Engine.)_
5. **Automations / Flows** — visual builder for triggers → actions: comment-to-DM (already built; surface it here), keyword DM, story-mention reply, referral-aware openers, quick-reply funnels, ice-breaker config, persistent-menu config. _(Serves: Automation Engine.)_
6. **Catalog / Inventory** — manage products (title, price, image, stock, CTA) used to build in-DM Generic Template carousels. **This page exists BECAUSE the "send product catalog in DM" feature needs a product source.** Caches `attachment_id` for fast sends. _(Serves: in-DM catalog / FindMySpare crossover.)_
7. **Broadcasts / Campaigns** — build & send Marketing Messages to opted-in audiences; manage opt-in topics; see consent records. _(Serves: compliant re-engagement.)_
8. **Analytics** — lead metrics, conversion rates, response times, opportunity metrics, revenue pipeline, account/media insights (respect 90-day storage — store rollups yourself). _(Serves: Analytics.)_

### Settings (sub-pages)

9a. **Account & Connections** — connect IG account, token status/refresh, permission & access-level status, webhook subscription status, public-account check.
9b. **AI & Brand Voice** — choose provider, **BYOK keys (encrypted)**, train/edit Brand Voice from captions/DMs, manage Knowledge Base entries, set per-account default AI mode (manual/assisted/autonomous).
9c. **Compliance & Disclosure** — AI disclosure toggle + editable text + market declaration (CA/DE lock logic), window/rate-limit dashboards, opt-in/consent log.
9d. **Team & Roles** — invite members, assign roles (owner/admin/agent/viewer), gate who can enable Autonomous and who sees revenue.
9e. **Billing & Plan** — INR plans (Creator ₹2,999 / Growth ₹7,999 / Elite ₹24,999 / Enterprise), connected accounts per plan.

---

## 6. FEATURE CATALOG

Format per feature: **what it does → API primitive → webhook → permission → UI page → phase.** Build the abstraction so each is independently toggleable.

### Automation Engine

- **Comment-to-DM (ALREADY BUILT)** — keyword comment → private reply DM. Primitive: Private Replies. Webhook: `comments`. Perm: `manage_comments`+`manage_messages`. Page: Automations. **Phase 0 (exists — integrate, don't rebuild).**
- **Keyword DM auto-reply** — inbound DM keyword → templated reply. Primitive: Send API. Webhook: `messages`. Page: Automations. Phase 1.
- **Story-mention auto-reply** — user @mentions account in story → thank-you DM + tag as advocate. Webhook: `mentions`(via comments). Page: Automations. Phase 2.
- **Ice Breakers config** — up to 4 FAQ starters. Primitive: Ice Breakers. Page: Automations. Phase 1.
- **Persistent Menu config** — core actions menu. Primitive: Persistent Menu. Page: Automations. Phase 2.
- **Quick-reply funnels** — 13-button branching flows with phone/email capture. Primitive: Quick Replies. Webhook: `messaging_postbacks`. Page: Automations. Phase 1.

### AI Conversation + Voice Engine (the wedge)

- **Assisted draft on every inbound** — AI drafts a reply in brand voice; human edits & sends. Primitive: Send API (human-sent). Webhook: `messages`. Page: Inbox. **Phase 2 — flagship.**
- **Brand Voice training** — learn tone/vocab/emoji from samples. Page: AI & Brand Voice. Phase 2.
- **Knowledge-base grounded answers** — AI answers FAQs from KB to avoid hallucination. Page: AI & Brand Voice + Inbox. Phase 2.
- **Autonomous mode** — AI sends directly. Gated by flag, confidence threshold, role permission, disclosure rules. Page: Inbox/Settings. **Phase 4, off by default.**

### Decision Engine

- **Triage / routing** — classify each inbound → reply/draft/ignore/escalate/notify/assign with confidence + risk level; log to DecisionLog. Page: Inbox (behind the scenes) + Dashboard. Phase 2–3.
- **Confidence gating** — >90% auto (autonomous only), 70–90% draft, <70% human review, critical → always escalate. Phase 3.

### Lead Intelligence + CRM + Memory

- **Auto contact creation** — every IGSID → Contact. Webhook: `messages`/`comments`. Page: Contacts. Phase 1.
- **Lead scoring & status** — score from intent/keywords/frequency/recency. Page: Contacts. Phase 3.
- **Captured contact details** — phone/email from prefilled quick replies, consent logged. Page: Contacts. Phase 1–2.
- **Conversation memory / timeline** — full history + interests/objections/milestones feeding AI context. Page: Contacts. Phase 3.

### Opportunity Engine

- **Opportunity detection** — classify inbound for sponsorship/brand-deal/collab/podcast/investor/partnership/media. Webhook: `messages`. Page: Opportunities. Phase 3.
- **Source attribution** — `messaging_referral` records which ad/ref-link/post started the thread → revenue attribution + tailored openers. Webhook: `messaging_referral`. Page: Contacts/Analytics. Phase 2.

### In-DM Commerce (FindMySpare crossover)

- **Product catalog carousel in DM** — answer a product query with a Generic Template carousel from Inventory. Primitive: Generic Template + Attachment Upload. Page: needs **Catalog/Inventory** page first. Phase 3.

### Re-engagement (compliant)

- **Seen-but-ghosted nudge** — `messaging_seen` fires without a reply → draft a human nudge. Webhook: `messaging_seen`. Page: Inbox. Phase 2.
- **Marketing Message broadcasts** — opt-in recurring sends. Primitive: Marketing Messages. Webhook: `messaging_optins`. Page: Broadcasts. Phase 3–4.

### Moderation & Reputation

- **Comment sentiment firewall** — auto-hide toxic/spam comments, route buying-intent to private reply. Primitive: comment moderation (hide/unhide). Webhook: `comments`. Page: Automations/Inbox. Phase 3.

### Analytics & Intel

- **Account/media insights dashboards** — store rollups (90-day limit). Primitive: Insights. Page: Analytics. Phase 2–3.
- **Competitor radar** — Business Discovery + Hashtag Search trends → opportunity cards. Primitive: Discovery. Page: Analytics/Opportunities. Phase 4.

### Handover

- **AI→human baton** — `standby` + `messaging_handover`: AI handles routine, passes hot threads to human inbox with summary. Webhooks: `standby`, `messaging_handover`. Page: Inbox. Phase 3–4.

---

## 7. BUILD PHASES & TASK CHECKLIST (auto-mode execution order)

> Do phases in order. Each task: implement → meet acceptance criteria → commit.

### Phase 0 — Foundation & integration with existing code

- [ ] Detect stack; document it in a short `STACK_NOTES.md`.
- [ ] Locate existing comment-to-DM + webhook receiver + Meta client. Write a one-paragraph summary of how they work. **Do not modify their behavior.**
- [ ] Stand up data model (Section 4) via existing ORM/migrations.
- [ ] Implement the Meta client abstraction with **mock mode** + `META_LIVE` flag (wrap existing client; don't replace).
- [ ] Implement webhook signature validation, dedupe, async processing, and **WebhookEvent persistence** for all fields in 3.6.
- [ ] Implement the **messaging window engine** (24h reset, 7-day human-agent, private-reply nuance) with unit tests.
- **Acceptance:** existing comment-to-DM still works unchanged; all webhooks are persisted; window logic unit-tested; app runs fully in mock mode with no live Meta calls.

### Phase 1 — CRM + Inbox shell + basic automation UI

- [ ] Auto-create Contact + Conversation on inbound.
- [ ] Inbox UI: thread list, message view, send (window-aware), folders, assign, notes, tags. Loading/empty/error states.
- [ ] Contacts UI: profile, timeline, tags, status.
- [ ] Automations UI: list existing comment-to-DM flow + create keyword-DM, quick-reply funnel, ice breakers.
- [ ] Quick-reply phone/email capture → Contact with consent.
- **Acceptance:** a human can read and reply to DMs in-window; contacts populate automatically; a keyword flow can be created and runs in mock mode.

### Phase 2 — The AI wedge (Assisted mode) + voice + attribution

- [ ] AI & Brand Voice settings: provider config, BYOK (encrypted), voice training, knowledge base.
- [ ] Assisted draft generated for each inbound, shown in Inbox, editable, human-sent.
- [ ] `messaging_seen` + `messaging_referral` wired; seen-but-ghosted filter; source-aware openers.
- [ ] Basic analytics: response time, leads captured.
- **Acceptance:** every inbound shows an editable voice-matched draft; sending is human-gated; referral source recorded per conversation; AI grounded in KB (no fabricated facts).

### Phase 3 — Intelligence + commerce

- [ ] Lead scoring + status; Opportunity detection + Opportunities feed.
- [ ] Catalog/Inventory page; in-DM Generic Template carousel from inventory (with attachment caching).
- [ ] Decision Engine triage + DecisionLog + risk levels.
- [ ] Comment sentiment firewall.
- [ ] Memory feeding AI context.
- **Acceptance:** opportunities surface with confidence; a product query returns a real carousel from inventory in mock mode; decisions are logged with reasons.

### Phase 4 — Autonomy, broadcasts, handover, intel

- [ ] Autonomous mode behind flag + confidence + role + disclosure logic; full AuditLog.
- [ ] Marketing Message broadcasts + opt-in management.
- [ ] Handover protocol (standby/messaging_handover).
- [ ] Competitor radar (Business Discovery + Hashtag Search).
- [ ] Team & Roles, Billing.
- **Acceptance:** autonomous sends only fire when all gates pass and are fully audit-logged; broadcasts only reach opted-in users; disclosure rules enforced for CA/DE.

---

## 8. OUT OF SCOPE / DO NOT BUILD

- Any unofficial/private Instagram API, scraping, or session-token automation.
- Sending messages outside an open window via any path other than compliant Marketing Messages / approved tags.
- Applying `HUMAN_AGENT` tag to automated sends.
- Group messaging (not supported by the API).
- `story_insights` on the Instagram Login config (FB Login only — do not promise it).
- Storing secrets in code or committing `.env`.
- Rewriting the working comment-to-DM path.

## 9. STOP-AND-ASK CONDITIONS

Pause and surface a question instead of guessing if:

- You need a Meta endpoint, field, limit, or permission not in Section 3.
- A change would alter the existing comment-to-DM behavior.
- A feature seems to require Advanced Access / App Review you can't confirm is granted (build it behind the flag instead, and note it).
- The existing stack conflicts with something the spec implies.
- Any compliance rule in 2.6 / 3.10 would be violated to satisfy a feature.

---

**End of spec. Build in mock mode first, keep comment-to-DM intact, never invent API behavior, and gate everything risky behind flags.**
