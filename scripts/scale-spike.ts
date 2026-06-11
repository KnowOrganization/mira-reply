import { ingestQueue } from "@/lib/ig/ingestQueue";
import { redis } from "@/lib/ig/redis";
import { pool } from "@/lib/ig/pg";
import type { IngestJob } from "@/lib/ig/ingest";

// Spike test: enqueue N synthetic comments across M fake accounts and measure
// drain time + that the worker processes them. Fake accounts have no automations
// → no sends, pure throughput/plumbing test.
const N = Number(process.argv[2] || 2000);
const M = Number(process.argv[3] || 3);

async function main() {
  const t0 = Date.now();
  const jobs = Array.from({ length: N }, (_, i) => {
    const acct = `spike_acct_${i % M}`;
    const job: IngestJob = {
      accountId: acct,
      kind: "comment",
      event: { type: "comment_post", commentId: `spk_${Date.now()}_${i}`, fromUserId: `u_${i}`, text: "link", postId: "p1" },
    };
    return { name: "event", data: job, opts: { jobId: `${job.accountId}__${job.event.commentId}` } };
  });
  // chunked bulk add
  for (let i = 0; i < jobs.length; i += 500) await ingestQueue.addBulk(jobs.slice(i, i + 500));
  const enqMs = Date.now() - t0;
  console.log(`enqueued ${N} jobs across ${M} accounts in ${enqMs}ms (${Math.round(N / (enqMs / 1000))}/s)`);

  const t1 = Date.now();
  let waited = 0;
  while (waited < 120000) {
    const c = await ingestQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    if (c.waiting === 0 && c.active === 0 && c.delayed === 0) {
      console.log(`drained in ${Date.now() - t1}ms — completed=${c.completed} failed=${c.failed}`);
      console.log(`end-to-end throughput: ${Math.round(N / ((Date.now() - t0) / 1000))} jobs/s`);
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
    waited += 250;
  }
  await redis.quit();
  await pool.end();
}
main().catch((e) => { console.error("FAIL", e); process.exit(1); });
