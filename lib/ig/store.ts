import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const DIR = path.join(os.homedir(), ".mira");
const FILE = path.join(DIR, "ig.json");

export const SCHEMA_VERSION = 2;

export type IgAccount = {
  igUserId: string;
  username: string;
  accessToken: string;
  tokenExpiresAt: number;
  connectedAt: number;
};

export type PostLink = {
  id: string;
  label: string;
  url: string;
  type: "location" | "song" | "gear" | "shop" | "other";
};

export type Post = {
  id: string;
  caption: string;
  mediaType: string;
  permalink?: string;
  thumbnailUrl?: string;
  timestamp: string;
  notes: string;
  qa: { q: string; a: string; ts: number }[];
  links: PostLink[];
  insights?: PostInsights;
  updatedAt: number;
};

export type PostInsights = {
  likes?: number;
  comments?: number;
  reach?: number;
  saved?: number;
  shares?: number;
  plays?: number;
  totalInteractions?: number;
  fetchedAt: number;
};

// A comment queued behind an already-open clarification — so the owner is
// asked once, and every comment waiting on that answer is served together.
export type ClarificationWaiter = {
  commentId: string;
  fromUserId: string;
  fromUsername?: string;
  commentText: string;
};

export type Clarification = {
  id: string;
  commentId?: string; // the IG comment that triggered it — needed to reply/DM
  postId: string;
  commentText: string;
  question: string;
  kind?: "context" | "link";
  draftAttempt?: string;
  fromUserId: string;
  fromUsername?: string;
  createdAt: number;
  status: "open" | "answered" | "skipped";
  answer?: string;
  waiters?: ClarificationWaiter[];
};

export type Commenter = {
  igUserId: string;
  username: string;
  firstSeenAt: number;
  lastSeenAt: number;
  commentCount: number;
  repliedCount: number;
  themes: string[];
};

// ── schema v2: knowledge base ──────────────────────────────────────────────
export type FactTopic = "gear" | "location" | "song" | "personal" | "shop" | "general";

/** Account-level or post-level memory. The heart of the learn loop. */
export type Fact = {
  id: string;
  question: string; // canonical phrasing
  answer: string; // owner's confirmed answer
  topic: FactTopic;
  scope: "account" | "post"; // account = recalled on every post
  postId?: string; // set when scope = "post"
  aliases: string[]; // alternate phrasings seen in the wild
  embedding?: number[]; // nomic-embed-text vector for semantic recall
  link?: { url: string; label: string }; // present → this fact is a link
  hitCount: number; // times reused to answer a comment
  confidence: number; // owner-confirmed = 1.0
  durable: boolean; // false = decays
  expiresAt?: number;
  sourceCommentId?: string;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
};

/** Reply uniqueness ledger — anti-ban. */
export type ReplyFingerprint = {
  hash: string; // normalized-text hash
  shingles: string[]; // word-trigrams for Jaccard similarity
  intent: string;
  sentAt: number;
};

/** Owner profile — pre-loaded context so Mira rarely has to ask. */
export type OwnerProfile = {
  bio: string;
  voice: string;
  defaultLanguage: "english" | "hinglish";
};

export type DailyStat = {
  date: string; // YYYY-MM-DD
  comments: number;
  autoReplied: number;
  drafted: number;
  sent: number;
  dmSent: number;
  factsLearned: number;
  clarificationsResolved: number;
};

export type ScheduledSend = {
  id: string;
  kind: "comment" | "private_reply";
  targetId: string; // commentId
  recipientId?: string;
  text: string;
  releaseAt: number;
  createdAt: number;
  retryCount?: number; // max 3, then drop
};

export type Settings = {
  // shadow   = draft only, never send
  // assisted = owner approves everything
  // balanced = mostly-auto: auto acks + confident KB answers, queue the rest
  // auto     = send everything within safety limits
  replyMode: "shadow" | "assisted" | "balanced" | "auto";
  skipOwnComments: boolean;
  autoReplySimpleAcks: boolean;
  autoDMLinks: boolean;
  cooldownMinutes: number;
  // anti-ban (schema v2)
  dailySendCap: number;
  minSecondsBetweenSends: number;
  sendJitter: boolean;
  selectiveReplyRate: number; // 0-1, fraction of low-value acks to skip
  uniquenessThreshold: number; // similarity above this → regenerate
};

export type IgStore = {
  schemaVersion: number;
  account: IgAccount | null;
  lastToken?: string; // remembered token — survives logout for one-click reconnect
  trustedContacts: { igUserId: string; label: string }[];
  blocklist: string[];
  styleSamples: string[];
  toneSummary: string;
  settings: Settings;
  pendingDrafts: PendingDraft[];
  history: ReplyLog[];
  posts: Record<string, Post>;
  clarifications: Clarification[];
  pollWatermark: number;
  commentsCache: CachedComment[];
  commenters: Record<string, Commenter>;
  dmLog: { recipientId: string; ts: number }[];
  // schema v2
  knowledge: Fact[];
  fingerprints: ReplyFingerprint[];
  ownerProfile: OwnerProfile;
  dailyStats: Record<string, DailyStat>;
  sendQueue: ScheduledSend[];
  // Playground training examples — owner-approved / corrected replies, fed
  // back into the reply prompt as few-shot guidance.
  training: TrainingExample[];
  // @-mentions of this account on others' posts/comments + photo tags.
  mentions: Mention[];
  // Followers who have followed us (populated by webhook). Used for direct link delivery.
  followerCache: FollowerCacheEntry[];
  // Track which users received a DM for a specific post — prevents re-sending across runs.
  postDMsSent: { userId: string; postId: string }[];
  // Users whose DMs are blocked/archived — never retry these.
  dmBlocked: { userId: string; reason: string; ts: number }[];
  // Comments waiting for user to follow before receiving the link.
  linkPending: LinkPending[];
  // Live activity feed events (max 500, newest first).
  feedEvents: FeedEvent[];
  // Automations — visual comment-to-DM flows.
  automations: Automation[];
  // Dedup ledger — prevents same automation firing twice for same comment (webhook retries).
  automationFired: { key: string; ts: number }[];
  // Follow gate pending — users who need to follow before automation resumes.
  automationFollowPending: AutomationFollowPending[];
  // Button pending — users who clicked a button and are waiting for follow check.
  automationButtonPending: AutomationButtonPending[];
};

export type CachedComment = {
  id: string;
  postId: string;
  postCaption: string;
  postThumb?: string;
  postPermalink?: string;
  text: string;
  fromUserId: string;
  fromUsername: string;
  timestamp: string;
  ts: number;
  isOwn: boolean;
};

export type PendingDraft = {
  id: string;
  kind: "comment" | "dm";
  threadOrMediaId: string;
  fromUserId: string;
  fromUsername?: string;
  inboundText: string;
  draftText: string;
  dmText?: string; // link to deliver via private reply when this draft is sent
  intent: string;
  postId?: string;
  createdAt: number;
};

export type ReplyLog = {
  id: string;
  kind: "comment" | "dm";
  commentId?: string; // the IG comment this reply/skip belongs to — exact join
  inbound: string;
  outbound: string;
  intent: string;
  postId?: string;
  toUserId?: string;
  sentAt: number;
  status: "sent" | "skipped" | "failed";
  reason?: string;
};

// Cached follower user IDs — populated by follow webhook events.
export type FollowerCacheEntry = {
  userId: string;
  username?: string;
  followedAt: number;
};

// Pending link deliveries — waiting for user to follow before we send the link.
export type LinkPending = {
  userId: string;
  username?: string;
  postId: string;
  commentId: string;
  ts: number;
};

// Feed event — shown in the live activity feed.
export type FeedEvent = {
  id: string;
  kind: "comment_replied" | "dm_sent" | "link_sent" | "follow_pending" | "skipped";
  username?: string;
  userId?: string;
  postTitle?: string;
  detail?: string;
  ts: number;
};

// @dstrails mentioned in someone else's caption / comment, or photo-tagged.
export type Mention = {
  id: string; // unique key — kind:mediaId[:commentId]
  kind: "caption" | "comment" | "tag";
  mediaId: string;
  permalink?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  commentId?: string;
  commentText?: string;
  fromUserId?: string;
  fromUsername?: string;
  mediaType?: string;
  likeCount?: number;
  commentsCount?: number;
  ts: number; // event/media timestamp (ms)
  seenAt: number; // when this mention first entered the store
  read: boolean;
};

// A training example from the Playground — the owner approving or correcting
// a reply Mira produced. Approved/corrected examples are fed back into every
// reply prompt as few-shot guidance, so Mira learns the owner's preferences.
export type TrainingExample = {
  id: string;
  comment: string; // the test comment
  caption: string; // post caption used as context
  notes: string; // owner notes used as context
  miraAction: string; // send / draft / clarify / skip
  miraReply: string; // what Mira produced (reply text, question, or reason)
  intent: string;
  verdict: "good" | "bad";
  // correction — only set when verdict === "bad"
  correctAction?: "reply" | "ask_owner" | "skip"; // what Mira SHOULD do
  idealReply?: string; // the exact follower-facing reply (correctAction "reply")
  askQuestion?: string; // what Mira should ask the owner (correctAction "ask_owner")
  note?: string; // owner's reasoning / rule — guidance only, NEVER sent
  embedding?: number[]; // semantic vector of `comment` — for paraphrase match
  createdAt: number;
};

// ── Automation types ───────────────────────────────────────────────────────

export type AutomationTriggerType = "comment_post" | "dm" | "live_comment" | "story_reply";

export type AutomationTrigger = {
  type: AutomationTriggerType;
  keywords?: string[]; // empty = match all
  postIds?: string[];  // empty = all posts
};

export type AutomationNodeType =
  | "trigger"
  | "post_filter"
  | "opening_message"
  | "text_message"
  | "card_message"
  | "image_message"
  | "ask_follow"
  | "follow_gate"
  | "lead_form"
  | "followup_message";

export type AutomationFollowPending = {
  automationId: string;
  commentId: string;
  fromUserId: string;
  fromUsername?: string;
  remainingNodeIds: string[];
  ts: number;
};

export type AutomationButtonPending = {
  automationId: string;
  commentId: string;
  fromUserId: string;
  fromUsername?: string;
  remainingNodeIds: string[]; // nodes after the button-gated message
  ts: number;
};

export type AutomationNodeData = {
  text?: string;
  buttons?: { label: string; payload: string }[];
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  delayMinutes?: number;
  question?: string;
  enabled?: boolean;
  postIds?: string[]; // trigger node: restrict to specific post IDs
};

export type AutomationNode = {
  id: string;
  type: AutomationNodeType;
  position: { x: number; y: number };
  data: AutomationNodeData;
};

export type AutomationEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
  stats: { triggered: number; completed: number; failed: number; lastTriggered?: number };
  createdAt: number;
  updatedAt: number;
};

// ── defaults ───────────────────────────────────────────────────────────────
const defaultSettings: Settings = {
  replyMode: (process.env.MIRA_REPLY_MODE as Settings["replyMode"]) || "balanced",
  skipOwnComments: true,
  autoReplySimpleAcks: true,
  autoDMLinks: true,
  cooldownMinutes: 60,
  dailySendCap: 1000,
  minSecondsBetweenSends: 45,
  sendJitter: true,
  selectiveReplyRate: 0,
  uniquenessThreshold: 0.55,
};

const defaultOwnerProfile: OwnerProfile = {
  bio: "",
  voice: "",
  defaultLanguage: "english",
};

function freshStore(): IgStore {
  return {
    schemaVersion: SCHEMA_VERSION,
    account: null,
    trustedContacts: [],
    blocklist: [],
    styleSamples: [],
    toneSummary: "",
    settings: { ...defaultSettings },
    pendingDrafts: [],
    history: [],
    posts: {},
    clarifications: [],
    pollWatermark: 0,
    commentsCache: [],
    commenters: {},
    dmLog: [],
    knowledge: [],
    fingerprints: [],
    ownerProfile: { ...defaultOwnerProfile },
    dailyStats: {},
    sendQueue: [],
    training: [],
    mentions: [],
    followerCache: [],
    postDMsSent: [],
    dmBlocked: [],
    linkPending: [],
    feedEvents: [],
    automations: [],
    automationFired: [],
    automationFollowPending: [],
    automationButtonPending: [],
  };
}

// ── Fact helpers ───────────────────────────────────────────────────────────
let factSeq = 0;
function factId(): string {
  return `f_${Date.now().toString(36)}_${(factSeq++).toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function makeFact(
  input: Partial<Fact> & { question: string; answer: string }
): Fact {
  const now = Date.now();
  return {
    id: input.id ?? factId(),
    question: input.question,
    answer: input.answer,
    topic: input.topic ?? "general",
    scope: input.scope ?? "account",
    postId: input.postId,
    aliases: input.aliases ?? [],
    embedding: input.embedding,
    link: input.link,
    hitCount: input.hitCount ?? 0,
    confidence: input.confidence ?? 1,
    durable: input.durable ?? true,
    expiresAt: input.expiresAt,
    sourceCommentId: input.sourceCommentId,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    lastUsedAt: input.lastUsedAt,
  };
}

function linkTypeToTopic(t: PostLink["type"]): FactTopic {
  if (t === "location" || t === "song" || t === "gear" || t === "shop") return t;
  return "general";
}

// ── migration ──────────────────────────────────────────────────────────────
/** Normalize any persisted store into the current schema. Idempotent. */
function migrate(parsedIn: unknown): IgStore {
  const parsed = (parsedIn ?? {}) as Record<string, unknown> & {
    replyMode?: Settings["replyMode"];
    settings?: Partial<Settings>;
    schemaVersion?: number;
  };

  // back-compat: replyMode once lived at the top level
  if (parsed.replyMode && (!parsed.settings || !parsed.settings.replyMode)) {
    parsed.settings = { ...defaultSettings, replyMode: parsed.replyMode };
    delete parsed.replyMode;
  }

  const base: IgStore = {
    ...freshStore(),
    ...(parsed as Partial<IgStore>),
    settings: { ...defaultSettings, ...(parsed.settings || {}) },
    ownerProfile: {
      ...defaultOwnerProfile,
      ...((parsed.ownerProfile as Partial<OwnerProfile>) || {}),
    },
  };

  const prevVersion = parsed.schemaVersion ?? 1;
  if (prevVersion < 2) {
    // v1 → v2: fold per-post Q&A and links into the knowledge base
    const facts: Fact[] = [...(base.knowledge || [])];
    for (const post of Object.values(base.posts)) {
      for (const qa of post.qa || []) {
        facts.push(
          makeFact({
            question: qa.q,
            answer: qa.a,
            topic: "general",
            scope: "post",
            postId: post.id,
            createdAt: qa.ts,
            updatedAt: qa.ts,
          })
        );
      }
      for (const ln of post.links || []) {
        facts.push(
          makeFact({
            question: ln.label,
            answer: ln.url,
            topic: linkTypeToTopic(ln.type),
            scope: "post",
            postId: post.id,
            link: { url: ln.url, label: ln.label },
          })
        );
      }
    }
    base.knowledge = facts;
  }

  base.schemaVersion = SCHEMA_VERSION;
  return base;
}

async function loadAndMigrate(): Promise<IgStore> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return migrate(JSON.parse(raw));
  } catch {
    return freshStore();
  }
}

async function ensureDir() {
  await fs.mkdir(DIR, { recursive: true, mode: 0o700 });
}

async function writeFile(s: IgStore) {
  await ensureDir();
  // write to a temp file then atomically rename — a concurrent reader sees
  // either the whole old file or the whole new one, never a partial write.
  const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(s, null, 2), { mode: 0o600 });
  await fs.rename(tmp, FILE);
}

// ── serialized write queue ─────────────────────────────────────────────────
// patchStore is read-modify-write; the watcher fires processInbound for many
// comments concurrently. Without serialization, concurrent patches lose data.
// All writes run strictly in series through this chain (kept on globalThis so
// HMR in dev does not spawn parallel chains).
const gq = globalThis as unknown as { __mira_write_chain?: Promise<unknown> };
if (!gq.__mira_write_chain) gq.__mira_write_chain = Promise.resolve();

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const prev = gq.__mira_write_chain as Promise<unknown>;
  const run = prev.then(task, task);
  gq.__mira_write_chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/** Read the current store (migrated to the current schema). */
export async function readStore(): Promise<IgStore> {
  return loadAndMigrate();
}

/** Overwrite the whole store. Serialized. */
export async function writeStore(s: IgStore): Promise<void> {
  await enqueueWrite(() => writeFile(s));
}

/** Read-modify-write a shallow patch. Serialized — safe under concurrency. */
export async function patchStore(patch: Partial<IgStore>): Promise<IgStore> {
  return enqueueWrite(async () => {
    const cur = await loadAndMigrate();
    const next = { ...cur, ...patch };
    await writeFile(next);
    return next;
  });
}

/** Apply a function to the store atomically (read + transform + write). */
export async function updateStore(
  fn: (s: IgStore) => IgStore | Promise<IgStore>
): Promise<IgStore> {
  return enqueueWrite(async () => {
    const cur = await loadAndMigrate();
    const next = await fn(cur);
    await writeFile(next);
    return next;
  });
}
