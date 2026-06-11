import { Queue } from "bullmq";
import { bullConnection } from "./redis";
import type { IngestJob } from "./ingest";

// Durable ingest queue. The webhook adds a job per incoming comment and returns
// 200 immediately — a 1000-comment burst becomes 1000 fast enqueues that the
// worker pool drains. Jobs survive restarts (Redis-backed).
const g = globalThis as unknown as { __mira_ingest_q?: Queue<IngestJob> };
export const ingestQueue: Queue<IngestJob> =
  g.__mira_ingest_q ??
  new Queue<IngestJob>("ingest", {
    connection: bullConnection,
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    },
  });
if (!g.__mira_ingest_q) g.__mira_ingest_q = ingestQueue;

export async function enqueueIngest(job: IngestJob): Promise<void> {
  // jobId = account+comment → BullMQ drops exact duplicate enqueues for free
  // jobId can't contain ':' (BullMQ) — use '__' so exact duplicate enqueues drop
  await ingestQueue.add("event", job, { jobId: `${job.accountId}__${job.event.commentId}` });
}
