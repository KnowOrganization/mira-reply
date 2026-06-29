import { readStore } from "./store";
import { listAutomations } from "./accountsRepo";
import { drainAutomationRetries } from "./automation";
import { getAllMedia, getMediaComments, getRecentDMMessages, isRateLimitError } from "./graph";
import { redis, isClaimed, k, bumpCounter } from "./redis";
import { enqueueIngest } from "./ingestQueue";
import { getPostConfigs } from "./db";
import { publish } from "./bus";

// 60s per-account reconciliation sweep — the safety net behind the webhook.
// Anything Meta failed to deliver (outage, deploy gap, gif/sticker DMs that
// never trigger webhooks) gets found here and enqueued as a NORMAL ingest job:
// same eventKey ⇒ same BullMQ jobId + same Redis seen-claim ⇒ a comment that
// DID arrive via webhook is never double-processed.

const HOT_MEDIA = 12;
// never auto-act past this — same guard the processors apply
const CATCHUP_WINDOW_MS = 48 * 60 * 60 * 1000;
// re-scan slightly behind the watermark so a comment that landed while we were
// reading is not skipped forever (dedup makes the overlap free)
const OVERLAP_MS = 2 * 60_000;

type RawComment = {
  id: string;
  text: string;
  from?: { id: string; username?: string };
  timestamp: string;
  replies?: { data?: RawComment[] };
};

export async function reconcileAccount(accountId: string): Promise<{ enqueued: number }> {
  // safe-mode kill switch (same env the old watcher honoured) — no live IG
  // sweeps, no enqueues from polling. Webhook-delivered events still process.
  if (process.env.MIRA_WATCHER_DISABLED === "1") return { enqueued: 0 };
  const store = await readStore(accountId);
  if (!store.account) return { enqueued: 0 };
  const token = store.account.accessToken;
  const ownId = store.account.igUserId;
  const ownName = (store.account.username ?? "").toLowerCase();
  let enqueued = 0;

  // ── comments on automation targets + hottest recent posts ─────────────────
  const wmRaw = await redis.get(k.commentWatermark(accountId));
  const watermark = wmRaw ? Number(wmRaw) : Date.now() - 5 * 60_000;
  let newest = watermark;

  const targeted = new Set<string>();
  try {
    const autos = (await listAutomations(accountId)).filter(
      (a) => a.enabled && (a.trigger.type === "comment_post" || a.trigger.type === "live_comment")
    );
    for (const a of autos) {
      const tNode = a.nodes.find((n) => n.type === "trigger");
      const ids = a.trigger.postIds?.length ? a.trigger.postIds : (tNode?.data.postIds ?? []);
      ids.forEach((id: string) => targeted.add(id));
    }
    for (const pc of await getPostConfigs(accountId)) if (pc.active) targeted.add(pc.ig_post_id);
  } catch (e) {
    publish({ type: "log", level: "warn", msg: `reconcile: target load failed: ${String(e)}`, ts: Date.now() });
  }

  try {
    const media = (await getAllMedia(token)) as { data?: Array<{ id: string }> };
    (media.data ?? []).slice(0, HOT_MEDIA).forEach((m) => targeted.add(m.id));
  } catch (e) {
    if (isRateLimitError(e)) return { enqueued };
  }

  for (const mid of targeted) {
    let res: { data?: RawComment[] };
    try {
      res = (await getMediaComments(mid, token)) as { data?: RawComment[] };
    } catch (e) {
      if (isRateLimitError(e)) break;
      continue;
    }
    const flat: RawComment[] = [];
    for (const c of res.data ?? []) { flat.push(c); for (const r of c.replies?.data ?? []) flat.push(r); }

    for (const c of flat) {
      if (!c.from) continue;
      const ts = new Date(c.timestamp).getTime();
      if (Number.isNaN(ts)) continue;
      if (ts > newest) newest = ts;
      if (ts <= watermark - OVERLAP_MS) continue;
      if (Date.now() - ts > CATCHUP_WINDOW_MS) continue;
      const isOwn = c.from.id === ownId || (!!ownName && c.from.username?.toLowerCase() === ownName);
      if (isOwn) continue;
      if (await isClaimed(k.seen(accountId, c.id))) continue; // webhook already got it

      await enqueueIngest({
        accountId,
        kind: "comment",
        eventKey: `c_${c.id}`,
        data: { commentId: c.id, mediaId: mid, fromId: c.from.id, fromUsername: c.from.username, text: c.text, tsMs: ts },
      });
      enqueued++;
    }
  }
  await redis.set(k.commentWatermark(accountId), String(newest));

  // ── DMs (covers gif/sticker gap + any missed messages webhook) ────────────
  try {
    const dmRaw = await redis.get(k.dmWatermark(accountId));
    const dmSince = dmRaw ? Number(dmRaw) : Date.now() - 5 * 60_000;
    let latest = dmSince;
    const dms = await getRecentDMMessages(ownId, token, dmSince);
    for (const dm of dms) {
      if (dm.ts > latest) latest = dm.ts;
      if (await isClaimed(k.seen(accountId, dm.id))) continue;
      await enqueueIngest({
        accountId,
        kind: "message",
        eventKey: `m_${dm.id}`,
        data: { mid: dm.id, fromId: dm.fromUserId, text: dm.text, tsMs: dm.ts },
      });
      enqueued++;
    }
    await redis.set(k.dmWatermark(accountId), String(latest));
  } catch (e) {
    publish({ type: "log", level: "warn", msg: `reconcile: DM sweep failed: ${String(e)}`, ts: Date.now() });
  }

  // retry automations parked by a rate-limit (613) once their backoff clears
  // (used to run in the watcher's 7s tick)
  await drainAutomationRetries(accountId).catch((e) =>
    publish({ type: "log", level: "warn", msg: `reconcile: retry drain failed: ${String(e)}`, ts: Date.now() })
  );

  if (enqueued > 0) {
    bumpCounter(accountId, "reconciler_caught", enqueued);
    publish({ type: "log", level: "info", msg: `reconcile: caught ${enqueued} event(s) the webhook missed`, ts: Date.now() });
  }

  // webhook liveness — observability only; the sweep above already covers gaps
  const last = await redis.get(k.lastWebhookAt(accountId));
  if (last && Date.now() - Number(last) > 10 * 60_000 && enqueued > 0) {
    publish({ type: "log", level: "warn", msg: `reconcile: no webhook in ${Math.round((Date.now() - Number(last)) / 60000)}m but events exist — check Meta subscription`, ts: Date.now() });
  }

  return { enqueued };
}
