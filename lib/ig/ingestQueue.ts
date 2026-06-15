import { Queue } from "bullmq";
import { bullConnection } from "./redis";
import type { IngestJob } from "./ingest";
import type { OutboundJob } from "./outbound";

// Durable queue tier (Redis-backed, survives restarts):
//   ingest       — every inbound event (webhook receiver + reconciler enqueue)
//   ingest-dlq   — ingest jobs that exhausted retries (replayable)
//   outbound     — every message we send (replaces the in-memory MessageQueue
//                  and the file-store sendQueue)
//   outbound-dlq — sends that exhausted retries
//   reconcile    — per-account repeatable safety-net sweep (60s) + maintenance
//
// jobId doubles as the idempotency key: BullMQ drops duplicate enqueues with
// the same id, so the webhook and the reconciler can both enqueue the same
// event without double-processing. jobId can't contain ':' — use '__'.

const defaultJobOptions = {
  removeOnComplete: 1000,
  removeOnFail: 5000,
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
};

type G = {
  __mira_ingest_q?: Queue<IngestJob>;
  __mira_ingest_dm_q?: Queue<IngestJob>;
  __mira_ingest_dlq?: Queue<IngestJob>;
  __mira_outbound_q?: Queue<OutboundJob>;
  __mira_outbound_dlq?: Queue<OutboundJob>;
  __mira_reconcile_q?: Queue<{ accountId: string; task: string }>;
};
const g = globalThis as unknown as G;

function makeQueue<T>(slot: keyof G, name: string): Queue<T> {
  if (!g[slot]) {
    (g as Record<string, unknown>)[slot] = new Queue<T>(name, {
      connection: bullConnection,
      defaultJobOptions,
    });
  }
  return g[slot] as unknown as Queue<T>;
}

// Two inbound lanes so a burst of comments can never block DMs (and vice-versa):
//   ingest-comments — comments, mentions, follows (public, batchy)
//   ingest-dm       — DMs, postbacks (1:1 conversations, latency-sensitive)
export const COMMENTS_QUEUE = "ingest-comments";
export const DM_QUEUE = "ingest-dm";

export const ingestQueue = makeQueue<IngestJob>("__mira_ingest_q", COMMENTS_QUEUE);
export const ingestDMQueue = makeQueue<IngestJob>("__mira_ingest_dm_q", DM_QUEUE);
export const ingestDLQ = makeQueue<IngestJob>("__mira_ingest_dlq", "ingest-dlq");
export const outboundQueue = makeQueue<OutboundJob>("__mira_outbound_q", "outbound");
export const outboundDLQ = makeQueue<OutboundJob>("__mira_outbound_dlq", "outbound-dlq");
export const reconcileQueue = makeQueue<{ accountId: string; task: string }>("__mira_reconcile_q", "reconcile");

const safeId = (s: string) => s.replace(/[:]/g, "_");

/** DMs and button postbacks ride the DM lane; everything else the comment lane. */
function laneFor(kind: IngestJob["kind"]): Queue<IngestJob> {
  return kind === "message" || kind === "postback" ? ingestDMQueue : ingestQueue;
}

/** Enqueue an inbound event. jobId = account + eventKey → exact dupes drop. */
export async function enqueueIngest(job: IngestJob): Promise<void> {
  await laneFor(job.kind).add(job.kind, job, { jobId: safeId(`${job.accountId}__${job.eventKey}`) });
}

/**
 * Enqueue an outbound send. `delayMs` schedules it (followup_message). jobId
 * dedupes — the same logical send enqueued twice (webhook + reconciler both
 * processing a duplicate-delivered event) sends once.
 */
export async function enqueueOutbound(job: OutboundJob, delayMs = 0): Promise<void> {
  await outboundQueue.add(job.type, job, {
    jobId: safeId(`${job.accountId}__${job.id}`),
    ...(delayMs > 0 ? { delay: delayMs } : {}),
  });
}
