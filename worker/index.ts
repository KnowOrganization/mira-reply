import { Worker } from "bullmq";
import { bullConnection } from "@/lib/ig/redis";
import { initSchema } from "@/lib/ig/pg";
import { processIngestJob, type IngestJob } from "@/lib/ig/ingest";

// Long-running worker tier. Drains the durable ingest queue and runs the
// automation match+execute off the webhook request path. Scale by running
// more of these (each a separate process); BullMQ load-balances across them.
async function main() {
  await initSchema();
  const concurrency = Number(process.env.WORKER_CONCURRENCY || 10);

  const worker = new Worker<IngestJob>(
    "ingest",
    async (job) => { await processIngestJob(job.data); },
    { connection: bullConnection, concurrency }
  );

  worker.on("failed", (job, err) => console.error("[worker] job failed", job?.id, err?.message));
  worker.on("error", (err) => console.error("[worker] error", err.message));
  worker.on("ready", () => console.log(`[worker] ingest worker ready, concurrency=${concurrency}`));

  const shutdown = async () => { await worker.close(); process.exit(0); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => { console.error("[worker] fatal", e); process.exit(1); });
