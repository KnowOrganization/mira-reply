// Single Drizzle schema — the source of truth that replaces the JSON file store
// (~/.mira/ig.json), the SQLite funnel (data/shaiz.db), and the raw-SQL pg.ts.
// Every table is account-scoped via account_id -> accounts.ig_user_id.
//
// Timestamps are epoch-ms stored as bigint(mode:number) to match the existing
// code, which uses Date.now() everywhere. jsonb columns are typed against the
// existing store types (type-only import, erased at runtime — no coupling).
import {
  pgTable, text, bigint, boolean, integer, real, jsonb, vector,
  primaryKey, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  Settings, OwnerProfile, ReplyFingerprint, ScheduledSend,
  Automation, Post, PostLink, PostInsights, Fact, FactTopic,
  PendingDraft, ReplyLog, Clarification, ClarificationWaiter,
  TrainingExample, Mention, FollowerCacheEntry,
  // NOTE: relative (not @/) because the `@/` alias resolves differently per
  // consuming package (web=./src, root=./). Phase 3 relocates these store types
  // into the shared/db layer to remove this cross-package reach into lib/ig.
} from "../../../lib/ig/store";

const ms = (name: string) => bigint(name, { mode: "number" });

// ── account-level (single row per IG account; folds the JSON store's
//    account-scoped singletons + small collections into jsonb columns) ────────
export const accounts = pgTable("accounts", {
  igUserId: text("ig_user_id").primaryKey(),
  // Instagram-scoped user ID (graph.instagram.com/me's "user_id" field) — this
  // is what Meta puts in webhook entry.id, and it differs from ig_user_id (the
  // "id" field / app-scoped ID we OAuth with). Two separate ID spaces for the
  // same account; webhook resolution must match on THIS column, not the PK.
  igScopedUserId: text("ig_scoped_user_id"),
  // "Connected by" user id (audit / token-refresh). Demoted from tenant owner —
  // authorization now resolves through organizations + org_members + account_access.
  userId: text("user_id"),
  // Owning organization (team + billing root). Backfilled to a personal org per
  // legacy accounts.user_id. Tenancy + role resolution keys off this.
  orgId: text("org_id"),
  username: text("username").notNull().default(""),
  accessToken: text("access_token").notNull(),
  tokenExpiresAt: ms("token_expires_at").notNull().default(0),
  connectedAt: ms("connected_at").notNull().default(0),
  lastToken: text("last_token"),
  settings: jsonb("settings").$type<Settings>().notNull().default({} as Settings),
  ownerProfile: jsonb("owner_profile").$type<OwnerProfile>(),
  styleSamples: jsonb("style_samples").$type<string[]>().notNull().default([]),
  toneSummary: text("tone_summary").notNull().default(""),
  // Per-account AI provider + bring-your-own-key. byokKey is a secret — never
  // returned to the client (the ai-settings endpoint exposes only byokKeySet).
  aiProvider: text("ai_provider").notNull().default("claude"),
  byokKey: text("byok_key"),
  // Last time the account brain (tone/style/audience) was rebuilt.
  brainBuiltAt: ms("brain_built_at"),
  blocklist: jsonb("blocklist").$type<string[]>().notNull().default([]),
  trustedContacts: jsonb("trusted_contacts").$type<{ igUserId: string; label: string }[]>().notNull().default([]),
  fingerprints: jsonb("fingerprints").$type<ReplyFingerprint[]>().notNull().default([]),
  followerCache: jsonb("follower_cache").$type<FollowerCacheEntry[]>().notNull().default([]),
  sendQueue: jsonb("send_queue").$type<ScheduledSend[]>().notNull().default([]),
  pollWatermark: ms("poll_watermark").notNull().default(0),
  // small account-level collections folded into jsonb (the store→core dimension
  // that had no home before): DM rate ledger, per-post DM dedup, blocked DMs,
  // link-delivery waiters.
  dmLog: jsonb("dm_log").$type<{ recipientId: string; ts: number }[]>().notNull().default([]),
  postDMsSent: jsonb("post_dms_sent").$type<{ userId: string; postId: string }[]>().notNull().default([]),
  dmBlocked: jsonb("dm_blocked").$type<{ userId: string; reason: string; ts: number }[]>().notNull().default([]),
  linkPending: jsonb("link_pending").$type<unknown[]>().notNull().default([]),
  // Brain-first onboarding progress: connect -> brain -> done.
  onboardingStep: text("onboarding_step").notNull().default("connect"),
  onboardingSkippedAt: ms("onboarding_skipped_at"),
  updatedAt: ms("updated_at").notNull().default(0),
}, (t) => [
  index("idx_accounts_ig_scoped_user_id").on(t.igScopedUserId),
]);

// ── raw webhook event log (append-only, replayable) ─────────────────────────
// Every Meta webhook event lands here BEFORE any processing. The receiver
// returns 5xx to Meta unless the row + queue job are durably written, so Meta
// keeps retrying for 36h. event_key is the natural idempotency key (comment id
// / message mid / …) — duplicate deliveries hit ON CONFLICT DO NOTHING.
export const webhookEvents = pgTable("webhook_events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  accountId: text("account_id").notNull(),
  field: text("field").notNull(), // comments | messages | postback | follows | mentions
  eventKey: text("event_key").notNull(),
  payload: jsonb("payload").notNull().default({}),
  receivedAt: ms("received_at").notNull().default(0),
  processedAt: ms("processed_at"),
  error: text("error"),
}, (t) => [
  uniqueIndex("uq_webhook_events_key").on(t.eventKey),
  index("idx_webhook_events_account").on(t.accountId, t.receivedAt),
]);

// ── automations (visual node-graph flows) ───────────────────────────────────
export const automations = pgTable("automations", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => accounts.igUserId, { onDelete: "cascade" }),
  name: text("name").notNull().default("Untitled"),
  enabled: boolean("enabled").notNull().default(false),
  trigger: jsonb("trigger").$type<Automation["trigger"]>().notNull().default({} as Automation["trigger"]),
  nodes: jsonb("nodes").$type<Automation["nodes"]>().notNull().default([]),
  edges: jsonb("edges").$type<Automation["edges"]>().notNull().default([]),
  stats: jsonb("stats").$type<Automation["stats"]>().notNull().default({} as Automation["stats"]),
  createdAt: ms("created_at").notNull().default(0),
  updatedAt: ms("updated_at").notNull().default(0),
}, (t) => [index("idx_automations_account").on(t.accountId)]);

// ── parked automations waiting on button-tap / follow / rate-limit retry ─────
export const pendingResume = pgTable("pending_resume", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  accountId: text("account_id").notNull(),
  kind: text("kind").notNull(), // 'button' | 'follow' | 'retry'
  fromUserId: text("from_user_id").notNull(),
  fromUsername: text("from_username"),
  commentId: text("comment_id"),
  automationId: text("automation_id").notNull(),
  remainingNodeIds: jsonb("remaining_node_ids").$type<string[]>().notNull().default([]),
  notBefore: ms("not_before").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  ts: ms("ts").notNull().default(0),
}, (t) => [
  index("idx_pending_user").on(t.accountId, t.fromUserId),
  index("idx_pending_kind").on(t.accountId, t.kind),
]);

// ── live activity feed (UI ticker) ──────────────────────────────────────────
export const feedEvents = pgTable("feed_events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  accountId: text("account_id").notNull(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull().default({}),
  ts: ms("ts").notNull().default(0),
}, (t) => [index("idx_feed_account_ts").on(t.accountId, t.ts)]);

// ── post-config funnel (from SQLite) ─────────────────────────────────────────
export const postConfigs = pgTable("post_configs", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  igPostId: text("ig_post_id").notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  welcomeMsg: text("welcome_msg").notNull().default(""),
  buttonLabel: text("button_label").notNull().default("Send me the link 👇"),
  followGate: boolean("follow_gate").notNull().default(true),
  notFollowingMsg: text("not_following_msg").notNull().default(""),
  linkUrl: text("link_url"),
  linkMsg: text("link_msg"),
  active: boolean("active").notNull().default(true),
  createdAt: ms("created_at").notNull().default(0),
  updatedAt: ms("updated_at").notNull().default(0),
}, (t) => [uniqueIndex("uq_post_configs_post").on(t.accountId, t.igPostId)]);

// ── products (DM marketplace catalog) ────────────────────────────────────────
// Account-scoped. Checkout is link-out only (ctaUrl) — Mira never processes money.
// priceText is a free string ("Rs 1,499" / "DM for price"); never numeric.
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  description: text("description").notNull().default(""),
  priceText: text("price_text"),
  imageUrl: text("image_url"),
  ctaUrl: text("cta_url"),                       // owner-set link-out — the only checkout
  available: boolean("available").notNull().default(true),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  embedding: jsonb("embedding").$type<number[]>(), // deferred-fill (v1 lookup is keyword/alias)
  slug: text("slug"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: ms("created_at").notNull().default(0),
  updatedAt: ms("updated_at").notNull().default(0),
}, (t) => [
  index("idx_products_account").on(t.accountId, t.sortOrder),
  index("idx_products_available").on(t.accountId, t.available),
  uniqueIndex("uq_products_slug").on(t.accountId, t.slug),
]);

export const processedComments = pgTable("processed_comments", {
  commentId: text("comment_id").primaryKey(),
  accountId: text("account_id").notNull(),
  igsid: text("igsid").notNull(),
  postId: text("post_id").notNull(),
  repliedAt: ms("replied_at").notNull().default(0),
});

export const userStates = pgTable("user_states", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  igsid: text("igsid").notNull(),
  postId: text("post_id").notNull(),
  commentId: text("comment_id").notNull(),
  state: text("state").notNull(), // awaiting_tap | awaiting_follow | delivered
  payload: jsonb("payload"),
  createdAt: ms("created_at").notNull().default(0),
  updatedAt: ms("updated_at").notNull().default(0),
}, (t) => [
  uniqueIndex("uq_user_states").on(t.igsid, t.postId),
  index("idx_user_states_igsid").on(t.igsid),
]);

export const messageLog = pgTable("message_log", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  direction: text("direction").notNull(), // in | out
  eventType: text("event_type").notNull(),
  igsid: text("igsid"),
  postId: text("post_id"),
  payload: jsonb("payload").notNull().default({}),
  status: text("status"),
  error: text("error"),
  createdAt: ms("created_at").notNull().default(0),
}, (t) => [
  index("idx_message_log_created").on(t.accountId, t.createdAt),
  index("idx_message_log_igsid").on(t.igsid),
]);

// ── Mira brain: posts, knowledge, drafts, history, clarifications, training ──
export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  caption: text("caption").notNull().default(""),
  mediaType: text("media_type").notNull().default(""),
  permalink: text("permalink"),
  thumbnailUrl: text("thumbnail_url"),
  timestamp: text("timestamp").notNull().default(""),
  notes: text("notes").notNull().default(""),
  qa: jsonb("qa").$type<Post["qa"]>().notNull().default([]),
  links: jsonb("links").$type<PostLink[]>().notNull().default([]),
  insights: jsonb("insights").$type<PostInsights>(),
  // location/carousel: fetched from IG Graph API MEDIA_FIELDS once wired (lib/ig/graph.ts) —
  // nullable/additive, unpopulated until the sync path fills them in.
  location: jsonb("location").$type<{ id?: string; name?: string; lat?: number; lng?: number }>(),
  carousel: jsonb("carousel").$type<{ mediaUrl: string; mediaType: string }[]>(),
  // One vision-LLM call per post at sync time (lib/ig/vision.ts), not per-reply.
  visionDescription: text("vision_description"),
  updatedAt: ms("updated_at").notNull().default(0),
}, (t) => [index("idx_posts_account").on(t.accountId)]);

export const knowledge = pgTable("knowledge", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  topic: text("topic").$type<FactTopic>().notNull().default("general"),
  scope: text("scope").notNull().default("account"), // account | post
  postId: text("post_id"),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  embedding: jsonb("embedding").$type<number[]>(), // pgvector deferred until measured
  link: jsonb("link").$type<Fact["link"]>(),
  hitCount: integer("hit_count").notNull().default(0),
  confidence: real("confidence").notNull().default(1),
  durable: boolean("durable").notNull().default(true),
  expiresAt: ms("expires_at"),
  sourceCommentId: text("source_comment_id"),
  createdAt: ms("created_at").notNull().default(0),
  updatedAt: ms("updated_at").notNull().default(0),
  lastUsedAt: ms("last_used_at"),
}, (t) => [
  index("idx_knowledge_account").on(t.accountId),
  index("idx_knowledge_scope_post").on(t.accountId, t.scope, t.postId),
]);

// ── Brain v2: graph knowledge base ──────────────────────────────────────────
// Additive layer on top of knowledge/posts/commenters — those stay
// system-of-record. graph_nodes mirrors fact/post/commenter rows (refTable/
// refId) plus genuinely new entity/topic nodes that don't exist elsewhere.
// graph_edges are typed, weighted, sourced relationships between nodes.
// See lib/ig/graph/ for the retrieval/generation code that populates and
// reads these.

export const graphNodeType = ["fact", "post", "entity", "topic", "commenter"] as const;
export type GraphNodeType = (typeof graphNodeType)[number];

export const graphNodes = pgTable("graph_nodes", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  type: text("type").$type<GraphNodeType>().notNull(),
  refTable: text("ref_table"), // "knowledge" | "posts" | "commenters" | null (entity/topic nodes)
  refId: text("ref_id"),
  label: text("label").notNull(),
  subtype: text("subtype"), // entity subtype: product | person | place | song | brand
  summary: text("summary").notNull().default(""),
  embedding: vector("embedding", { dimensions: 768 }), // nomic-embed-text, pinned
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ms("created_at").notNull().default(0),
  updatedAt: ms("updated_at").notNull().default(0),
}, (t) => [
  index("idx_graph_nodes_account_type").on(t.accountId, t.type),
  index("idx_graph_nodes_ref").on(t.refTable, t.refId),
  // no vector (HNSW) index yet — near-empty table at introduction; add once
  // populated (Phase 3 backfill), sequential scan is fine at current row counts.
]);

export const graphEdgeType = [
  "mentions", "relates_to", "answers", "contradicts", "part_of", "tagged_in", "similar_to",
] as const;
export type GraphEdgeType = (typeof graphEdgeType)[number];

export const graphEdgeSource = ["manual", "embedding_similarity", "llm_extraction", "co_occurrence"] as const;
export type GraphEdgeSource = (typeof graphEdgeSource)[number];

export const graphEdges = pgTable("graph_edges", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  srcNodeId: text("src_node_id").notNull().references(() => graphNodes.id, { onDelete: "cascade" }),
  dstNodeId: text("dst_node_id").notNull().references(() => graphNodes.id, { onDelete: "cascade" }),
  type: text("type").$type<GraphEdgeType>().notNull(),
  directed: boolean("directed").notNull().default(true),
  weight: real("weight").notNull().default(1), // similarity score or LLM confidence
  source: text("source").$type<GraphEdgeSource>().notNull(),
  confidence: real("confidence").notNull().default(1),
  hitCount: integer("hit_count").notNull().default(0), // reinforced on retrieval use, mirrors Fact.hitCount
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ms("created_at").notNull().default(0),
  lastReinforcedAt: ms("last_reinforced_at"),
}, (t) => [
  index("idx_graph_edges_src").on(t.accountId, t.srcNodeId),
  index("idx_graph_edges_dst").on(t.accountId, t.dstNodeId),
  uniqueIndex("uq_graph_edge").on(t.accountId, t.srcNodeId, t.dstNodeId, t.type),
]);

// One row per account. Only the one-liner tier is materialized — brief/full
// are always computed live from ranked retrieval (see plan: a static "full"
// blob recreates the same unscoped-context bug this redesign fixes).
export const personas = pgTable("personas", {
  accountId: text("account_id").primaryKey().references(() => accounts.igUserId, { onDelete: "cascade" }),
  oneLiner: text("one_liner").notNull().default(""),
  graphVersion: text("graph_version").notNull().default(""), // hash(nodeCount,edgeCount,maxUpdatedAt) — invalidation watermark
  generatedAt: ms("generated_at"),
  model: text("model"),
});

export const drafts = pgTable("drafts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  kind: text("kind").notNull(), // comment | dm
  threadOrMediaId: text("thread_or_media_id").notNull(),
  fromUserId: text("from_user_id").notNull(),
  fromUsername: text("from_username"),
  inboundText: text("inbound_text").notNull().default(""),
  draftText: text("draft_text").notNull().default(""),
  dmText: text("dm_text"),
  intent: text("intent").notNull().default(""),
  postId: text("post_id"),
  createdAt: ms("created_at").notNull().default(0),
}, (t) => [index("idx_drafts_account").on(t.accountId)]);

export const history = pgTable("history", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  kind: text("kind").notNull(), // comment | dm
  commentId: text("comment_id"),
  inbound: text("inbound").notNull().default(""),
  outbound: text("outbound").notNull().default(""),
  intent: text("intent").notNull().default(""),
  postId: text("post_id"),
  toUserId: text("to_user_id"),
  sentAt: ms("sent_at").notNull().default(0),
  status: text("status").notNull(), // sent | skipped | failed
  reason: text("reason"),
}, (t) => [
  index("idx_history_account_sent").on(t.accountId, t.sentAt),
  index("idx_history_comment").on(t.commentId),
]);

export const clarifications = pgTable("clarifications", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  commentId: text("comment_id"),
  postId: text("post_id").notNull().default(""),
  commentText: text("comment_text").notNull().default(""),
  question: text("question").notNull().default(""),
  kind: text("kind"), // context | link
  draftAttempt: text("draft_attempt"),
  fromUserId: text("from_user_id").notNull().default(""),
  fromUsername: text("from_username"),
  status: text("status").notNull().default("open"), // open | answered | skipped
  answer: text("answer"),
  waiters: jsonb("waiters").$type<ClarificationWaiter[]>().notNull().default([]),
  createdAt: ms("created_at").notNull().default(0),
}, (t) => [index("idx_clarifications_account").on(t.accountId, t.status)]);

export const training = pgTable("training", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  comment: text("comment").notNull().default(""),
  caption: text("caption").notNull().default(""),
  notes: text("notes").notNull().default(""),
  miraAction: text("mira_action").notNull().default(""),
  miraReply: text("mira_reply").notNull().default(""),
  intent: text("intent").notNull().default(""),
  verdict: text("verdict").notNull().default("good"), // good | bad
  correctAction: text("correct_action"), // reply | ask_owner | skip
  idealReply: text("ideal_reply"),
  askQuestion: text("ask_question"),
  note: text("note"),
  embedding: jsonb("embedding").$type<number[]>(),
  createdAt: ms("created_at").notNull().default(0),
}, (t) => [index("idx_training_account").on(t.accountId)]);

export const mentions = pgTable("mentions", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  kind: text("kind").notNull(), // caption | comment | tag
  mediaId: text("media_id").notNull(),
  permalink: text("permalink"),
  thumbnailUrl: text("thumbnail_url"),
  mediaUrl: text("media_url"),
  mediaCaption: text("media_caption"),
  commentId: text("comment_id"),
  commentText: text("comment_text"),
  fromUserId: text("from_user_id"),
  fromUsername: text("from_username"),
  mediaType: text("media_type"),
  likeCount: integer("like_count"),
  commentsCount: integer("comments_count"),
  ts: ms("ts").notNull().default(0),
  seenAt: ms("seen_at").notNull().default(0),
  read: boolean("read").notNull().default(false),
}, (t) => [index("idx_mentions_account_ts").on(t.accountId, t.ts)]);

export const commenters = pgTable("commenters", {
  accountId: text("account_id").notNull(),
  igUserId: text("ig_user_id").notNull(),
  username: text("username").notNull().default(""),
  firstSeenAt: ms("first_seen_at").notNull().default(0),
  lastSeenAt: ms("last_seen_at").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  repliedCount: integer("replied_count").notNull().default(0),
  themes: jsonb("themes").$type<string[]>().notNull().default([]),
}, (t) => [primaryKey({ columns: [t.accountId, t.igUserId] })]);

export const dailyStats = pgTable("daily_stats", {
  accountId: text("account_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  comments: integer("comments").notNull().default(0),
  autoReplied: integer("auto_replied").notNull().default(0),
  drafted: integer("drafted").notNull().default(0),
  sent: integer("sent").notNull().default(0),
  dmSent: integer("dm_sent").notNull().default(0),
  factsLearned: integer("facts_learned").notNull().default(0),
  clarificationsResolved: integer("clarifications_resolved").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.accountId, t.date] })]);

export const commentsCache = pgTable("comments_cache", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  postId: text("post_id").notNull(),
  postCaption: text("post_caption").notNull().default(""),
  postThumb: text("post_thumb"),
  postPermalink: text("post_permalink"),
  text: text("text").notNull().default(""),
  fromUserId: text("from_user_id").notNull().default(""),
  fromUsername: text("from_username").notNull().default(""),
  timestamp: text("timestamp").notNull().default(""),
  ts: ms("ts").notNull().default(0),
  isOwn: boolean("is_own").notNull().default(false),
}, (t) => [index("idx_comments_cache_account_ts").on(t.accountId, t.ts)]);

// ── DM conversation threads ────────────────────────────────────────────────
// One row per (account, person). Gives DMs real thread memory so a follow-up
// ("what do you sell?") is answered in the context of the prior turns instead
// of being judged in isolation. Replaces running DMs through the comment
// pipeline, which had zero conversation history.
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(), // conv_{accountId}_{igsid}
  accountId: text("account_id").notNull(),
  igsid: text("igsid").notNull(), // the other person's IG-scoped id
  username: text("username"),
  lastInboundAt: ms("last_inbound_at").notNull().default(0),
  lastOutboundAt: ms("last_outbound_at").notNull().default(0),
  // 24h standard messaging window — resets on each inbound user message.
  windowExpiresAt: ms("window_expires_at").notNull().default(0),
  summary: text("summary").notNull().default(""), // rolling context summary
  status: text("status").notNull().default("open"), // open | needs_human | closed
  createdAt: ms("created_at").notNull().default(0),
  updatedAt: ms("updated_at").notNull().default(0),
}, (t) => [
  uniqueIndex("uq_conversations_acct_igsid").on(t.accountId, t.igsid),
  index("idx_conversations_account").on(t.accountId, t.updatedAt),
]);

export const messages = pgTable("messages", {
  id: text("id").primaryKey(), // IG mid for inbound; generated for outbound
  conversationId: text("conversation_id").notNull(),
  accountId: text("account_id").notNull(),
  direction: text("direction").notNull(), // in | out
  text: text("text").notNull().default(""),
  sentBy: text("sent_by").notNull().default("user"), // user | ai | human
  createdAt: ms("created_at").notNull().default(0),
}, (t) => [
  index("idx_messages_conversation").on(t.conversationId, t.createdAt),
]);

// ── multitenancy: orgs, members, per-account grants, invitations ─────────────
// An organization is the team + (future) billing root. Every IG account is
// owned by exactly one org (accounts.org_id); access is resolved as:
//   org owner/admin  -> all accounts the org owns (no per-account row needed)
//   org agent/viewer + cross-org users -> only accounts in account_access.
// user_id columns are plain text (no FK), matching accounts.user_id — auth
// lives in the same db but we avoid hard cross-table coupling.
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  type: text("type").notNull().default("individual"), // individual | agency
  plan: text("plan").notNull().default("free"),       // billing hook (unenforced)
  createdBy: text("created_by"),                       // user id
  createdAt: ms("created_at").notNull().default(0),
});

export const orgMembers = pgTable("org_members", {
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("viewer"), // owner | admin | agent | viewer
  invitedBy: text("invited_by"),
  createdAt: ms("created_at").notNull().default(0),
}, (t) => [
  primaryKey({ columns: [t.orgId, t.userId] }),
  index("idx_org_members_user").on(t.userId), // "my orgs"
]);

// Per-account grant: scopes org agents/viewers to specific accounts AND carries
// cross-org shares (influencer shares an IG account with their agency).
export const accountAccess = pgTable("account_access", {
  accountId: text("account_id").notNull().references(() => accounts.igUserId, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("viewer"),
  grantedBy: text("granted_by"),
  createdAt: ms("created_at").notNull().default(0),
}, (t) => [
  primaryKey({ columns: [t.accountId, t.userId] }),
  index("idx_account_access_user").on(t.userId), // "accounts shared with me"
]);

// Unified invite: join an org (kind='org') or get access to one account
// (kind='account'). Accepted on first Google sign-in of the invited email.
export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  kind: text("kind").notNull(),                 // org | account
  orgId: text("org_id"),                        // set when kind='org'
  accountId: text("account_id"),                // set when kind='account'
  role: text("role").notNull().default("viewer"),
  invitedBy: text("invited_by"),
  status: text("status").notNull().default("pending"), // pending|accepted|revoked|expired
  acceptedUserId: text("accepted_user_id"),
  expiresAt: ms("expires_at").notNull().default(0),
  createdAt: ms("created_at").notNull().default(0),
}, (t) => [
  index("idx_invitations_email").on(t.email, t.status),
]);

// Expo push tokens — one row per device. Keyed by the Expo token (unique per
// install). userId scopes "my devices"; accountId optional (active account at
// register time) so we can target an account's owner.
export const deviceTokens = pgTable("device_tokens", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  accountId: text("account_id"),
  platform: text("platform").notNull().default("ios"), // ios | android
  createdAt: ms("created_at").notNull().default(0),
}, (t) => [
  index("idx_device_tokens_user").on(t.userId),
]);

export type Schema = {
  accounts: typeof accounts; automations: typeof automations;
  organizations: typeof organizations; orgMembers: typeof orgMembers;
  accountAccess: typeof accountAccess; invitations: typeof invitations;
  webhookEvents: typeof webhookEvents;
  pendingResume: typeof pendingResume; feedEvents: typeof feedEvents;
  postConfigs: typeof postConfigs; products: typeof products;
  processedComments: typeof processedComments;
  userStates: typeof userStates; messageLog: typeof messageLog;
  posts: typeof posts; knowledge: typeof knowledge; drafts: typeof drafts;
  history: typeof history; clarifications: typeof clarifications;
  training: typeof training; mentions: typeof mentions;
  commenters: typeof commenters; dailyStats: typeof dailyStats;
  commentsCache: typeof commentsCache;
  conversations: typeof conversations; messages: typeof messages;
  deviceTokens: typeof deviceTokens;
};
