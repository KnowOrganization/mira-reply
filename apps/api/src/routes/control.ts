// Manual reconcile trigger + ingest pipeline observability. The old watcher
// loops are retired — /poll now runs the same one-shot safety-net sweep the
// worker runs every 60s, and /watcher reports webhook-first pipeline status.
import { Elysia } from "elysia";
import { authPlugin } from "../plugins/auth";
import { reconcileAccount } from "@/lib/ig/reconcile";
import { watcherStatus } from "@/lib/ig/watcher";
import { redis, k } from "@/lib/ig/redis";
import { ingestQueue, ingestDLQ, outboundQueue, outboundDLQ } from "@/lib/ig/ingestQueue";

export const controlRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/poll", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 400; return { error: "not connected" }; }
    try {
      const r = await reconcileAccount(auth.accountId);
      return { ok: true, enqueued: r.enqueued };
    } catch (e) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : "reconcile failed" };
    }
  }, { auth: true })
  .get("/api/ig/watcher", async () => {
    return watcherStatus();
  }, { auth: true })
  .post("/api/ig/watcher", async () => {
    return watcherStatus(); // loops retired — nothing to start or stop
  }, { auth: true })
  .get("/api/ig/ingest-stats", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 400; return { error: "not connected" }; }
    const acct = auth.accountId;
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
  }, { auth: true });
