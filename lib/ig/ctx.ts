// Context Assembly — Layer 1 of the Mira v2 pipeline.
//
// Assembles everything Mira needs to understand a comment into one rich object.
// Uses in-memory caches so a burst of comments on the same post never
// re-builds the post context or re-scans the KB more than once.
//
// The store is read ONCE in runPipeline() and passed in — this module never
// calls readStore() itself, keeping the read count at exactly one per comment.

import {
  type IgStore,
  type Post,
  type Fact,
  type Commenter,
  type Settings,
  type IgAccount,
} from "./store";
import { embed } from "./embed";
import { buildTrainingBlock, matchTraining, type TrainedMatch } from "./training";
import { tooSimilar } from "./variation";

// ── Types ──────────────────────────────────────────────────────────────────

export type RelationshipDepth = "new" | "regular" | "superfan";

/** Everything Mira needs to perceive and act on a single comment. */
export type AssembledContext = {
  // Post DNA — text only, no thumbnails
  post: Post | undefined;
  postContext: string; // pre-built string ready for LLM prompt injection

  // Owner brain
  personaContext: string; // account-scope personal/general facts as a string
  kb: Fact[]; // all non-expired facts for recall

  // Training
  trainingContext: string; // few-shot block matched to this comment
  trainedMatch: TrainedMatch | null; // hard override if found

  // Commenter
  commenter: Commenter | undefined;
  superfanNote: string; // empty or "loyal regular (N comments) — be extra warm"
  relationshipDepth: RelationshipDepth;

  // Account state passed through
  settings: Settings;
  toneSummary: string;
  styleSamples: string[];
  account: IgAccount;

  // Dedup — recent sent/pending replies for the same comment kind
  recentReplies: string[]; // text of up to 40 recent replies

  // Comment embedding — computed once, reused by perception + training recall
  commentEmbedding: number[] | null;
};

// ── Module-level caches (HMR-safe via globalThis) ──────────────────────────

type AccountCacheEntry = {
  personaContext: string;
  kb: Fact[];
  version: string; // `${knowledge.length}:${ownerProfile.voice}`
};

type PostCacheEntry = {
  postContext: string;
  version: string; // `${updatedAt}:${notes.length}:${qa.length}:${links.length}`
};

type CommenterCacheEntry = {
  commenter: Commenter;
  superfanNote: string;
  depth: RelationshipDepth;
  version: string; // `${commentCount}:${lastSeenAt}`
};

// All three caches are keyed by accountId (account cache) or `${accountId}:${id}`
// (post/commenter). Before this they were process-global and unkeyed — under
// multi-account in one process, account A's persona/KB could be served to
// account B on a version-hash collision. Keying by account makes them
// tenant-safe by construction. See memory: "ctx.ts caches not keyed by account".
const g = globalThis as unknown as {
  __mira_account_cache?: Map<string, AccountCacheEntry>;
  __mira_post_cache?: Map<string, PostCacheEntry>;
  __mira_commenter_cache?: Map<string, CommenterCacheEntry>;
};

if (!g.__mira_account_cache) g.__mira_account_cache = new Map();
if (!g.__mira_post_cache) g.__mira_post_cache = new Map();
if (!g.__mira_commenter_cache) g.__mira_commenter_cache = new Map();

// ── Cache builders ─────────────────────────────────────────────────────────

function buildAccountVersion(s: IgStore): string {
  return `${s.knowledge.length}:${s.ownerProfile.voice}:${s.ownerProfile.bio}`;
}

function buildAccountCache(s: IgStore): AccountCacheEntry {
  const now = Date.now();
  const kb = s.knowledge.filter(
    (f) => !(f.expiresAt && f.expiresAt < now)
  );
  const personaContext = kb
    .filter(
      (f) =>
        f.scope === "account" &&
        (f.topic === "personal" || f.topic === "general")
    )
    .slice(0, 12)
    .map((f) => `- ${f.question} — ${f.answer}`)
    .join("\n");

  return {
    personaContext,
    kb,
    version: buildAccountVersion(s),
  };
}

function buildPostVersion(post: Post): string {
  return `${post.updatedAt}:${post.notes.length}:${post.qa.length}:${post.links.length}`;
}

function buildPostContext(post: Post): string {
  const parts: string[] = [];
  if (post.caption) {
    parts.push(`Caption: "${post.caption}"`);
    const tags = post.caption.match(/#[\p{L}\d_]+/gu);
    if (tags?.length)
      parts.push(`Caption hashtags (treat as facts): ${tags.join(", ")}`);
  }
  if (post.notes) parts.push(`Owner notes: ${post.notes}`);
  if (post.qa.length) {
    parts.push(
      "Owner Q&A:\n" +
        post.qa
          .slice(-10)
          .map((x) => `Q: ${x.q}\nA: ${x.a}`)
          .join("\n")
    );
  }
  if (post.links?.length) {
    parts.push(
      "Saved links: " +
        post.links.map((l) => `${l.label} (${l.type})`).join(", ")
    );
  }
  return parts.join("\n\n");
}

function buildCommenterVersion(c: Commenter): string {
  return `${c.commentCount}:${c.lastSeenAt}`;
}

function buildCommenterEntry(c: Commenter): CommenterCacheEntry {
  const depth: RelationshipDepth =
    c.commentCount >= 8
      ? "superfan"
      : c.commentCount >= 3
      ? "regular"
      : "new";
  const superfanNote =
    c.commentCount >= 4
      ? ` This commenter is a loyal regular (${c.commentCount} comments) — be extra warm and familiar.`
      : "";
  return {
    commenter: c,
    superfanNote,
    depth,
    version: buildCommenterVersion(c),
  };
}

// ── Recent replies for dedup ───────────────────────────────────────────────

function buildRecentReplies(s: IgStore, intent?: string): string[] {
  // pull recent sent replies (optionally filtered by intent) + pending drafts
  const sent = s.history
    .filter(
      (h) =>
        h.status === "sent" &&
        h.kind === "comment" &&
        !!h.outbound &&
        (!intent || h.intent === intent)
    )
    .slice(0, 25)
    .map((h) => h.outbound);
  const pending = s.pendingDrafts
    .filter((d) => d.kind === "comment" && !!d.draftText)
    .map((d) => d.draftText);
  return [...pending, ...sent].slice(0, 40);
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Assemble the full context for one incoming comment.
 *
 * The store is passed in (already read by the caller) — never re-read here.
 * Caches are reused across concurrent comment bursts on the same post.
 */
export async function assembleContext(
  commentText: string,
  postId: string | undefined,
  fromUserId: string,
  s: IgStore
): Promise<AssembledContext> {
  if (!s.account) throw new Error("assembleContext: no account in store");
  const acct = s.account.igUserId; // tenant key for every cache below

  // ① Account cache — keyed by account, invalidated when KB or voice changes
  const accountVersion = buildAccountVersion(s);
  let accountEntry = g.__mira_account_cache!.get(acct);
  if (!accountEntry || accountEntry.version !== accountVersion) {
    accountEntry = buildAccountCache(s);
    g.__mira_account_cache!.set(acct, accountEntry);
  }
  const { personaContext, kb } = accountEntry;

  // ② Post cache — keyed by (account, post), invalidated when post content changes
  const post = postId ? s.posts[postId] : undefined;
  let postContext = "";
  if (post) {
    const postKey = `${acct}:${postId}`;
    const postVersion = buildPostVersion(post);
    const cached = g.__mira_post_cache!.get(postKey);
    if (!cached || cached.version !== postVersion) {
      const entry: PostCacheEntry = {
        postContext: buildPostContext(post),
        version: postVersion,
      };
      g.__mira_post_cache!.set(postKey, entry);
      postContext = entry.postContext;
    } else {
      postContext = cached.postContext;
    }
  }

  // ③ Commenter cache — keyed by (account, commenter), invalidated on count/lastSeen
  const rawCommenter = s.commenters[fromUserId];
  let commenter: Commenter | undefined;
  let superfanNote = "";
  let relationshipDepth: RelationshipDepth = "new";
  if (rawCommenter) {
    const commKey = `${acct}:${fromUserId}`;
    const commVersion = buildCommenterVersion(rawCommenter);
    const cached = g.__mira_commenter_cache!.get(commKey);
    if (!cached || cached.version !== commVersion) {
      const entry = buildCommenterEntry(rawCommenter);
      g.__mira_commenter_cache!.set(commKey, entry);
      commenter = entry.commenter;
      superfanNote = entry.superfanNote;
      relationshipDepth = entry.depth;
    } else {
      commenter = cached.commenter;
      superfanNote = cached.superfanNote;
      relationshipDepth = cached.depth;
    }
  }

  // ④ Comment embedding — computed once, reused by training recall + perception
  const commentEmbedding = s.training?.length ? await embed(commentText) : null;

  // ⑤ Training — few-shot block + hard override check
  const trainingContext = buildTrainingBlock(
    commentText,
    commentEmbedding,
    s.training || []
  );
  const trainedMatch = matchTraining(
    commentText,
    commentEmbedding,
    s.training || []
  );

  // ⑥ Recent replies for dedup (pulled from store snapshot — no extra read)
  const recentReplies = buildRecentReplies(s);

  return {
    post,
    postContext,
    personaContext,
    kb,
    trainingContext,
    trainedMatch,
    commenter,
    superfanNote,
    relationshipDepth,
    settings: s.settings,
    toneSummary: s.toneSummary,
    styleSamples: s.styleSamples,
    account: s.account,
    recentReplies,
    commentEmbedding,
  };
}

/**
 * Evict the post cache entry for a given post (call after owner edits
 * notes/QA/links so the next comment sees fresh context). Pass accountId to
 * scope the eviction; without it, drops the post for every account.
 */
export function invalidatePostCache(postId: string, accountId?: string): void {
  if (accountId) {
    g.__mira_post_cache?.delete(`${accountId}:${postId}`);
    return;
  }
  for (const key of g.__mira_post_cache?.keys() ?? []) {
    if (key.endsWith(`:${postId}`)) g.__mira_post_cache!.delete(key);
  }
}

/**
 * Evict the account cache (call after KB changes). Pass accountId to evict just
 * that tenant; without it, clears every account (safe — forces a rebuild).
 */
export function invalidateAccountCache(accountId?: string): void {
  if (accountId) g.__mira_account_cache?.delete(accountId);
  else g.__mira_account_cache?.clear();
}
