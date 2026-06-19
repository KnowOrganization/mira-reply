import IORedis from "ioredis";

// Shared Redis connection. Used for BullMQ, plus atomic cross-worker state:
// dedup (seen comments / automationFired) and resume locks — all keyed per
// account so multiple accounts and multiple workers never collide.
const URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// BullMQ bundles its own ioredis copy — sharing our instance clashes at the type
// level. Give it plain connection options instead so it builds its own.
function parseRedis(url: string) {
  const u = new globalThis.URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    ...(u.password ? { password: u.password } : {}),
    maxRetriesPerRequest: null as null,
  };
}
export const bullConnection = parseRedis(URL);

const g = globalThis as unknown as { __mira_redis?: IORedis };
export const redis: IORedis =
  g.__mira_redis ??
  new IORedis(URL, {
    // BullMQ requires this; harmless for general use.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
if (!g.__mira_redis) g.__mira_redis = redis;

/**
 * Atomic claim. Returns true exactly once for a given key until it expires —
 * the multi-worker-safe replacement for the in-memory dedup Set and the
 * resumeLock Set. Use for: seen comments, automationFired, resume locks.
 */
export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const res = await redis.set(key, "1", "EX", ttlSeconds, "NX");
  return res === "OK";
}

/** Has this key already been claimed (without claiming)? */
export async function isClaimed(key: string): Promise<boolean> {
  return (await redis.exists(key)) === 1;
}

/**
 * Owned claim — claimOnce that a retry of the SAME owner can re-enter. The
 * first claim stores `owner`; a re-claim by the same owner (a BullMQ retry of
 * the same job after a mid-processing crash) returns true, anyone else false.
 * Without this, claim-then-crash would permanently bury the event.
 */
export async function claimOwned(key: string, owner: string, ttlSeconds: number): Promise<boolean> {
  const res = await redis.set(key, owner, "EX", ttlSeconds, "NX");
  if (res === "OK") return true;
  return (await redis.get(key)) === owner;
}

/**
 * Run `fn` while holding a short-lived Redis lock — used to serialize messages
 * within one DM conversation (different conversations still run in parallel).
 * If the lock can't be acquired within `waitMs` we proceed anyway: ordering is
 * best-effort, while *correctness* (no duplicate sends) is guaranteed
 * separately by the per-target `replied:` claim. The lock is only released if we
 * still own it, so a crashed holder can't deadlock the conversation.
 */
export async function withLock<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  waitMs = 8000
): Promise<T> {
  const token = `${process.pid}_${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + waitMs;
  let held = false;
  while (Date.now() <= deadline) {
    const ok = await redis.set(key, token, "PX", ttlMs, "NX");
    if (ok === "OK") { held = true; break; }
    await new Promise((r) => setTimeout(r, 150));
  }
  try {
    return await fn();
  } finally {
    if (held) {
      const cur = await redis.get(key).catch(() => null);
      if (cur === token) await redis.del(key).catch(() => {});
    }
  }
}

// ── key builders (account-scoped) ───────────────────────────────────────────
export const k = {
  seen: (acct: string, commentId: string) => `seen:${acct}:${commentId}`,
  // Per-conversation lock so two DMs from the same person process in order.
  dmLock: (acct: string, igsid: string) => `lock:dm:${acct}:${igsid}`,
  // Outbound idempotency — claimed exactly once per reply target (comment id or
  // DM inbound mid) right before the Graph send. Survives jobId eviction,
  // worker restarts (which wipe the in-memory seen set), and reconciler
  // re-enqueues, so a single inbound can never be answered twice.
  replied: (acct: string, targetId: string) => `replied:${acct}:${targetId}`,
  fired: (acct: string, automationId: string, commentId: string) => `fired:${acct}:${automationId}:${commentId}`,
  // per-(automation, comment, node) idempotency — a node sent once for a comment never re-sends on resume/retry.
  sentNode: (acct: string, automationId: string, commentId: string, nodeId: string) => `autosent:${acct}:${automationId}:${commentId}:${nodeId}`,
  // recipient + content-hash backstop — identical text to the same recipient suppressed within TTL.
  sentHash: (acct: string, recipient: string, hash: string) => `autohash:${acct}:${recipient}:${hash}`,
  resumeLock: (acct: string, userId: string) => `lock:resume:${acct}:${userId}`,
  dmWatermark: (acct: string) => `dmwm:${acct}`,
  commentWatermark: (acct: string) => `cwm:${acct}`,
  lastWebhookAt: (acct: string) => `whlast:${acct}`,
  outboundHour: (acct: string, hourWindow: number) => `outhr:${acct}:${hourWindow}`,
  counters: (acct: string) => `ctr:${acct}`,
};

/** Bump an observability counter (hash field per metric, one hash per account). */
export function bumpCounter(acct: string, metric: string, by = 1): void {
  redis.hincrby(k.counters(acct), metric, by).catch(() => {});
}
