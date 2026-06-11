import { query } from "./pg";
import { redis, k, bumpCounter } from "./redis";
import { insertLog } from "./db";
import { publish } from "./bus";
import { isRateLimitError } from "./graph";

// Durable outbound send tier — replaces the in-memory MessageQueue (lost on
// restart) and the file-store sendQueue. Jobs live in the BullMQ "outbound"
// queue; this is the processor. Rate limiting:
//   • self-imposed 190 sends/hour per account (same budget as the old queue)
//   • Instagram 613/429 → pause sends 15 min, job preserved, no retry burned
// Both signal via RateLimitedError — the worker translates it into
// worker.rateLimit() + Worker.RateLimitError() so BullMQ re-queues the job
// without consuming an attempt.

export type OutboundJob = {
  accountId: string;
  id: string; // logical send id — doubles as the idempotency key
  type: "private_reply" | "dm";
  recipient: { comment_id: string } | { id: string };
  message: Record<string, unknown>;
  igsid?: string;
  postId?: string;
};

export class RateLimitedError extends Error {
  constructor(public retryInMs: number, msg: string) { super(msg); }
}

const BASE = "https://graph.instagram.com/v23.0";
const MAX_PER_HOUR = 190;
const RATE_LIMIT_BACKOFF_MS = 15 * 60_000;

export async function processOutboundJob(job: OutboundJob): Promise<void> {
  // safe-mode kill switch — log + drop instead of sending real DMs. Used while
  // testing the pipeline against a live account without messaging anyone.
  if (process.env.MIRA_OUTBOUND_DISABLED === "1") {
    publish({ type: "log", level: "warn", msg: `outbound DISABLED — dropped ${job.type} (${job.id})`, ts: Date.now() });
    return;
  }

  // Instagram said stop (613/429 earlier) — whole endpoint paused
  const pauseTtl = await redis.pttl(`outpause:${job.accountId}`);
  if (pauseTtl > 0) throw new RateLimitedError(pauseTtl, "outbound paused (previous 613/429)");

  // self-imposed hourly budget
  const hourWindow = Math.floor(Date.now() / 3_600_000);
  const key = k.outboundHour(job.accountId, hourWindow);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 3700);
  if (count > MAX_PER_HOUR) {
    const msToNextWindow = (hourWindow + 1) * 3_600_000 - Date.now();
    throw new RateLimitedError(msToNextWindow, `hourly send budget (${MAX_PER_HOUR}) exhausted`);
  }

  const rows = await query<{ ig_user_id: string; access_token: string }>(
    "SELECT ig_user_id, access_token FROM accounts WHERE ig_user_id=$1",
    [job.accountId]
  );
  const acct = rows[0];
  if (!acct) throw new Error(`outbound: unknown account ${job.accountId}`);

  const body = { recipient: job.recipient, message: job.message };
  try {
    const res = await fetch(`${BASE}/${acct.ig_user_id}/messages?access_token=${acct.access_token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new Error(JSON.stringify(json));
  } catch (e) {
    if (isRateLimitError(e)) {
      await redis.set(`outpause:${job.accountId}`, "1", "PX", RATE_LIMIT_BACKOFF_MS);
      publish({ type: "log", level: "warn", msg: `outbound: rate-limited — pausing ${Math.round(RATE_LIMIT_BACKOFF_MS / 60000)}m (${job.id})`, ts: Date.now() });
      throw new RateLimitedError(RATE_LIMIT_BACKOFF_MS, "instagram 613/429");
    }
    throw e; // BullMQ retries (3 exp), then DLQ
  }

  bumpCounter(job.accountId, "sent");
  await insertLog({ direction: "out", event_type: job.type, igsid: job.igsid ?? null, post_id: job.postId ?? null, payload: JSON.stringify(body), status: "ok", error: null });
  publish({ type: "log", level: "info", msg: `outbound: sent ${job.type} (${job.id})`, ts: Date.now() });
}

/** Final-failure bookkeeping (called by the worker when attempts are exhausted). */
export async function recordOutboundFailure(job: OutboundJob, err: string): Promise<void> {
  bumpCounter(job.accountId, "send_failed");
  await insertLog({ direction: "out", event_type: job.type, igsid: job.igsid ?? null, post_id: job.postId ?? null, payload: JSON.stringify(job.message), status: "error", error: err }).catch(() => {});
  publish({ type: "log", level: "error", msg: `outbound: gave up on ${job.id}: ${err}`, ts: Date.now() });
}
