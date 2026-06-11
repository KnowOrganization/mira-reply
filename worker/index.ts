import { Worker, type Job } from "bullmq";
import { bullConnection } from "@/lib/ig/redis";
import { initSchema, query } from "@/lib/ig/pg";
import { processIngestJob, type IngestJob } from "@/lib/ig/ingest";
import { processOutboundJob, recordOutboundFailure, RateLimitedError, type OutboundJob } from "@/lib/ig/outbound";
import { reconcileAccount } from "@/lib/ig/reconcile";
import { syncFollowers, refreshTokenIfNeeded } from "@/lib/ig/maintenance";
import { ingestDLQ, outboundDLQ, reconcileQueue } from "@/lib/ig/ingestQueue";

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
  await initSchema();
  const concurrency = Number(process.env.WORKER_CONCURRENCY || 10);

  const ingestWorker = new Worker<IngestJob>(
    "ingest",
    async (job) => { await processIngestJob(job.data); },
    { connection: bullConnection, concurrency }
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
      if (task === "sweep") await reconcileAccount(accountId);
      else if (task === "followers") await syncFollowers(accountId);
      else if (task === "token") await refreshTokenIfNeeded(accountId);
    },
    { connection: bullConnection, concurrency: 2 }
  );

  // exhausted retries → explicit DLQ (replayable after a fix)
  ingestWorker.on("failed", async (job, err) => {
    console.error("[worker] ingest job failed", job?.id, err?.message);
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await ingestDLQ.add(job.name, job.data, { jobId: `dlq_${job.id}_${Date.now()}` }).catch(() => {});
    }
  });
  outboundWorker.on("failed", async (job, err) => {
    console.error("[worker] outbound job failed", job?.id, err?.message);
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await recordOutboundFailure(job.data, err?.message ?? "unknown").catch(() => {});
      await outboundDLQ.add(job.name, job.data, { jobId: `dlq_${job.id}_${Date.now()}` }).catch(() => {});
    }
  });
  for (const w of [ingestWorker, outboundWorker, reconcileWorker]) {
    w.on("error", (err) => console.error(`[worker] ${w.name} error`, err.message));
  }
  ingestWorker.on("ready", () => console.log(`[worker] ingest ready, concurrency=${concurrency}`));
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
    await Promise.all([ingestWorker.close(), outboundWorker.close(), reconcileWorker.close()]);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => { console.error("[worker] fatal", e); process.exit(1); });
