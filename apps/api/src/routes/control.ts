// Manual reconcile trigger + ingest pipeline observability. The old watcher
// loops are retired — /poll now runs the same one-shot safety-net sweep the
// worker runs every 60s, and /watcher reports webhook-first pipeline status.
import { Elysia } from "elysia";
import { requireUser } from "../lib/auth";
import { reconcileAccount } from "@/lib/ig/reconcile";
import { watcherStatus } from "@/lib/ig/watcher";
import { redis, k } from "@/lib/ig/redis";
import { ingestQueue, ingestDLQ, outboundQueue, outboundDLQ } from "@/lib/ig/ingestQueue";

export const controlRoute = new Elysia()
  .get("/api/ig/poll", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 400; return { error: "not connected" }; }
    try {
      const r = await reconcileAccount(a.ctx.accountId);
      return { ok: true, enqueued: r.enqueued };
    } catch (e) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : "reconcile failed" };
    }
  })
  .get("/api/ig/watcher", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    return watcherStatus();
  })
  .post("/api/ig/watcher", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    return watcherStatus(); // loops retired — nothing to start or stop
  })
  .get("/api/ig/ingest-stats", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 400; return { error: "not connected" }; }
    const acct = a.ctx.accountId;
    const [counters, lastWebhookAt, ingestCounts, ingestDlqCount, outboundCounts, outboundDlqCount] = await Promise.all([
      redis.hgetall(k.counters(acct)),
      redis.get(k.lastWebhookAt(acct)),
      ingestQueue.getJobCounts("waiting", "active", "delayed", "failed"),
      ingestDLQ.count(),
      outboundQueue.getJobCounts("waiting", "active", "delayed", "failed"),
      outboundDLQ.count(),
    ]);
    return {
      counters,
      lastWebhookAt: lastWebhookAt ? Number(lastWebhookAt) : null,
      queues: {
        ingest: ingestCounts,
        ingestDLQ: ingestDlqCount,
        outbound: outboundCounts,
        outboundDLQ: outboundDlqCount,
      },
    };
  });
