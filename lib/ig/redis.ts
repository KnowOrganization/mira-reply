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

// ── key builders (account-scoped) ───────────────────────────────────────────
export const k = {
  seen: (acct: string, commentId: string) => `seen:${acct}:${commentId}`,
  fired: (acct: string, automationId: string, commentId: string) => `fired:${acct}:${automationId}:${commentId}`,
  resumeLock: (acct: string, userId: string) => `lock:resume:${acct}:${userId}`,
  dmWatermark: (acct: string) => `dmwm:${acct}`,
};
