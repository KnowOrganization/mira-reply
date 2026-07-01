import { Worker, type Job } from "bullmq";
import { bullConnection } from "@/lib/ig/redis";
import { query } from "@shaiz/db";
import { processIngestJob, type IngestJob } from "@/lib/ig/ingest";
import { processOutboundJob, recordOutboundFailure, RateLimitedError, type OutboundJob } from "@/lib/ig/outbound";
import { reconcileAccount } from "@/lib/ig/reconcile";
import { publishDuePosts } from "@/lib/ig/publish";
import { syncFollowers, refreshTokenIfNeeded } from "@/lib/ig/maintenance";
import { ingestDLQ, outboundDLQ, reconcileQueue, COMMENTS_QUEUE, DM_QUEUE } from "@/lib/ig/ingestQueue";
import { initObservability, captureError } from "@shaiz/shared";

// Long-running worker tier — the ONLY place events are processed and messages
// are sent. Drains:
//   ingest    — every inbound event (webhook receiver + reconciler enqueue)
//   outbound  — every send (durable; survives restarts; rate-limit aware)
//   reconcile — per-account repeatable jobs: 60s safety-net sweep + maintenance
// Scale by running more of these processes; BullMQ load-balances.

const RECONCILE_EVERY_MS = 60_000;
const MAINTENANCE_EVERY_MS = 30 * 60_000;
const SCHEDULER_REFRESH_MS = 5 * 60_000;

async function main() {
  await initObservability("mira-worker");
  const commentConcurrency = Number(
    process.env.WORKER_CONCURRENCY_COMMENTS || process.env.WORKER_CONCURRENCY || 10
  );
  const dmConcurrency = Number(process.env.WORKER_CONCURRENCY_DM || 10);

  // Comment lane — public comments / mentions / follows.
  const ingestWorker = new Worker<IngestJob>(
    COMMENTS_QUEUE,
    async (job) => { await processIngestJob(job.data); },
    { connection: bullConnection, concurrency: commentConcurrency }
  );

  // DM lane — 1:1 conversations + postbacks, isolated so comment bursts can't
  // stall it. Per-conversation ordering is enforced inside processMessage.
  const ingestDMWorker = new Worker<IngestJob>(
    DM_QUEUE,
    async (job) => { await processIngestJob(job.data); },
    { connection: bullConnection, concurrency: dmConcurrency }
  );

  const outboundWorker = new Worker<OutboundJob>(
    "outbound",
    async (job: Job<OutboundJob>) => {
      try {
        await processOutboundJob(job.data);
      } catch (e) {
        if (e instanceof RateLimitedError) {
          // pause the queue for the backoff window; the job re-queues WITHOUT
          // burning a retry attempt (mirrors the old in-memory queue semantics)
          await outboundWorker.rateLimit(Math.max(1000, e.retryInMs));
          throw Worker.RateLimitError();
        }
        throw e;
      }
    },
    { connection: bullConnection, concurrency: 5 }
  );

  const reconcileWorker = new Worker<{ accountId: string; task: string }>(
    "reconcile",
    async (job) => {
      const { accountId, task } = job.data;
      if (task === "sweep") { await reconcileAccount(accountId); await publishDuePosts(accountId).catch(() => {}); }
      else if (task === "followers") await syncFollowers(accountId);
      else if (task === "token") await refreshTokenIfNeeded(accountId);
    },
    { connection: bullConnection, concurrency: 2 }
  );

  // exhausted retries → explicit DLQ (replayable after a fix)
  const onIngestFailed = async (job: Job<IngestJob> | undefined, err: Error | undefined) => {
    console.error("[worker] ingest job failed", job?.id, err?.message);
    captureError(err ?? new Error("ingest job failed"), { lane: "ingest", jobId: job?.id });
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await ingestDLQ.add(job.name, job.data, { jobId: `dlq_${job.id}_${Date.now()}` }).catch(() => {});
    }
  };
  ingestWorker.on("failed", onIngestFailed);
  ingestDMWorker.on("failed", onIngestFailed);
  outboundWorker.on("failed", async (job, err) => {
    console.error("[worker] outbound job failed", job?.id, err?.message);
    captureError(err ?? new Error("outbound job failed"), { lane: "outbound", jobId: job?.id });
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await recordOutboundFailure(job.data, err?.message ?? "unknown").catch(() => {});
      await outboundDLQ.add(job.name, job.data, { jobId: `dlq_${job.id}_${Date.now()}` }).catch(() => {});
    }
  });
  for (const w of [ingestWorker, ingestDMWorker, outboundWorker, reconcileWorker]) {
    w.on("error", (err) => { console.error(`[worker] ${w.name} error`, err.message); captureError(err, { lane: w.name }); });
  }
  ingestWorker.on("ready", () => console.log(`[worker] ingest-comments ready, concurrency=${commentConcurrency}`));
  ingestDMWorker.on("ready", () => console.log(`[worker] ingest-dm ready, concurrency=${dmConcurrency}`));
  outboundWorker.on("ready", () => console.log("[worker] outbound ready"));
  reconcileWorker.on("ready", () => console.log("[worker] reconcile ready"));

  // ── per-account repeatable schedulers ──────────────────────────────────────
  // Upserted for every connected account; refreshed every 5 min so newly
  // connected accounts get their sweep without a restart.
  async function syncSchedulers() {
    try {
      const accounts = await query<{ ig_user_id: string }>("SELECT ig_user_id FROM accounts");
      for (const a of accounts) {
        const acct = a.ig_user_id;
        await reconcileQueue.upsertJobScheduler(`sweep_${acct}`, { every: RECONCILE_EVERY_MS }, {
          name: "sweep", data: { accountId: acct, task: "sweep" },
        });
        await reconcileQueue.upsertJobScheduler(`followers_${acct}`, { every: MAINTENANCE_EVERY_MS }, {
          name: "followers", data: { accountId: acct, task: "followers" },
        });
        await reconcileQueue.upsertJobScheduler(`token_${acct}`, { every: MAINTENANCE_EVERY_MS }, {
          name: "token", data: { accountId: acct, task: "token" },
        });
      }
    } catch (e) {
      console.error("[worker] scheduler sync failed", e);
    }
  }
  await syncSchedulers();
  const schedTimer = setInterval(() => { void syncSchedulers(); }, SCHEDULER_REFRESH_MS);

  const shutdown = async () => {
    clearInterval(schedTimer);
    await Promise.all([ingestWorker.close(), ingestDMWorker.close(), outboundWorker.close(), reconcileWorker.close()]);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => { console.error("[worker] fatal", e); captureError(e, { fatal: true }); process.exit(1); });
