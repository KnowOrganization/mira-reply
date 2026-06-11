// Meta webhook receiver — dumb, fast, durable. No business logic here:
// verify signature → persist raw event (webhook_events) → enqueue BullMQ job
// → 200. Anything that can't be durably stored gets a 5xx so Meta retries
// (decreasing frequency, 36h window). Dedup is layered downstream:
// event_key UNIQUE in Postgres → BullMQ jobId → Redis seen-claim.
import { Elysia } from "elysia";
import crypto from "node:crypto";
import { ig } from "@/lib/ig/config";
import { query } from "@/lib/ig/pg";
import { redis, k, bumpCounter } from "@/lib/ig/redis";
import { publish } from "@/lib/ig/bus";
import { insertWebhookEvent } from "@/lib/ig/webhookEvents";
import { enqueueIngest } from "@/lib/ig/ingestQueue";
import type { IngestJob } from "@/lib/ig/ingest";

function verifySignature(raw: string, sigHeader: string | null): boolean {
  if (!sigHeader || !ig.appSecret) return false;
  const sig = sigHeader.replace(/^sha256=/, "");
  const expected = crypto.createHmac("sha256", ig.appSecret).update(raw).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  // timingSafeEqual throws RangeError on length mismatch — guard it (a short/
  // malformed signature header must return false, not crash the handler).
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const hash = (v: unknown) => crypto.createHash("sha1").update(JSON.stringify(v)).digest("hex").slice(0, 16);

type Change = {
  field: string;
  value: {
    from?: { id: string; username?: string };
    media?: { id: string; media_product_type?: string };
    id?: string;
    text?: string;
    comment_id?: string;
    media_id?: string;
  };
};
type Messaging = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: { mid: string; text?: string; is_echo?: boolean };
  postback?: { mid?: string; payload: string; title?: string };
};
type WebhookPayload = {
  object?: string;
  entry?: Array<{ id: string; time: number; changes?: Change[]; messaging?: Messaging[] }>;
};

/** Derive (field, eventKey, ingest job) triples from one webhook entry. */
function deriveEvents(accountId: string, entryTime: number | undefined, changes: Change[], messaging: Messaging[]) {
  const out: Array<{ field: string; job: IngestJob }> = [];
  const tsMs = entryTime ? (entryTime > 10_000_000_000 ? entryTime : entryTime * 1000) : Date.now();

  for (const ch of changes) {
    const v = ch.value ?? {};
    if (ch.field === "comments" || ch.field === "live_comments") {
      const cid = v.id;
      const eventKey = cid ? `c_${cid}` : `c_test_${hash(v)}`;
      out.push({
        field: ch.field,
        job: {
          accountId, kind: "comment", eventKey,
          data: { commentId: cid ?? `test_${hash(v)}`, mediaId: v.media?.id ?? v.media_id, fromId: v.from?.id, fromUsername: v.from?.username, text: v.text, tsMs },
        },
      });
    } else if (ch.field === "mentions") {
      const id = v.comment_id || v.media_id || v.media?.id;
      if (!id) continue;
      out.push({
        field: "mentions",
        job: { accountId, kind: "mention", eventKey: `mn_${id}`, data: { commentId: v.comment_id, mediaId: v.media_id || v.media?.id } },
      });
    } else if (ch.field === "follows") {
      const fid = v.from?.id;
      if (!fid) continue;
      out.push({
        field: "follows",
        job: { accountId, kind: "follow", eventKey: `f_${fid}_${entryTime ?? hash(v)}`, data: { followerId: fid, followerUsername: v.from?.username } },
      });
    }
  }

  for (const m of messaging) {
    if (m.postback) {
      const eventKey = `pb_${m.postback.mid ?? `${m.sender.id}_${m.timestamp}_${hash(m.postback.payload)}`}`;
      out.push({
        field: "postback",
        job: { accountId, kind: "postback", eventKey, data: { fromId: m.sender.id, payload: m.postback.payload, title: m.postback.title } },
      });
    } else if (m.message?.text && !m.message.is_echo) {
      out.push({
        field: "messages",
        job: { accountId, kind: "message", eventKey: `m_${m.message.mid}`, data: { mid: m.message.mid, fromId: m.sender.id, text: m.message.text, tsMs: m.timestamp || tsMs } },
      });
    }
  }
  return out;
}

async function defaultAccountId(): Promise<string | null> {
  const rows = await query<{ ig_user_id: string }>("SELECT ig_user_id FROM accounts ORDER BY connected_at DESC LIMIT 1");
  return rows[0]?.ig_user_id ?? null;
}

export const webhookRoute = new Elysia()
  // Meta subscription handshake — must stay public (no auth guard)
  .get("/api/ig/webhook", ({ query: q, set }) => {
    if (q["hub.mode"] === "subscribe" && q["hub.verify_token"] === ig.verifyToken && q["hub.challenge"]) {
      set.headers["content-type"] = "text/plain";
      return q["hub.challenge"];
    }
    set.status = 403;
    return "forbidden";
  })
  .post("/api/ig/webhook", async ({ body, request, set }) => {
    const raw = typeof body === "string" ? body : JSON.stringify(body ?? "");
    if (!verifySignature(raw, request.headers.get("x-hub-signature-256"))) {
      publish({ type: "log", level: "warn", msg: `Webhook signature invalid: ${raw.slice(0, 150)}`, ts: Date.now() });
      set.status = 403;
      return "invalid signature";
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(raw) as WebhookPayload;
    } catch {
      set.status = 400;
      return "bad json";
    }

    publish({ type: "log", level: "info", msg: `webhook received: ${raw.slice(0, 200)}`, ts: Date.now() });

    // Normalize — Meta's dashboard test button sends a bare {field, value};
    // production sends {entry:[{id, time, changes/messaging}]}.
    const entries: Array<{ id?: string; time?: number; changes: Change[]; messaging: Messaging[] }> = [];
    if (Array.isArray(payload.entry)) {
      for (const e of payload.entry) entries.push({ id: e.id, time: e.time, changes: e.changes ?? [], messaging: e.messaging ?? [] });
    } else if ((payload as unknown as Change).field) {
      entries.push({ changes: [payload as unknown as Change], messaging: [] });
    }

    let stored = 0, duplicates = 0, failed = 0;
    for (const entry of entries) {
      // entry.id = receiving IG account; test payloads have none → newest account
      const accountId = entry.id || (await defaultAccountId().catch(() => null));
      if (!accountId) continue;
      redis.set(k.lastWebhookAt(accountId), String(Date.now())).catch(() => {});

      for (const ev of deriveEvents(accountId, entry.time, entry.changes, entry.messaging)) {
        try {
          const inserted = await insertWebhookEvent(accountId, ev.field, ev.job.eventKey, ev.job);
          if (!inserted) { duplicates++; bumpCounter(accountId, "duplicate_delivery"); continue; }
          await enqueueIngest(ev.job);
          stored++;
          bumpCounter(accountId, "received");
        } catch (e) {
          failed++;
          publish({ type: "log", level: "error", msg: `webhook persist/enqueue failed (${ev.job.eventKey}): ${String(e)}`, ts: Date.now() });
        }
      }
    }

    // any persist/enqueue failure → 5xx so Meta redelivers the batch; the
    // events that DID land are idempotent (event_key conflict) on redelivery.
    if (failed > 0) {
      set.status = 500;
      return { ok: false, stored, duplicates, failed };
    }
    return { ok: true, stored, duplicates };
  }, { parse: "text" });
