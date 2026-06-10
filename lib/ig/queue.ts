import { readStore } from "./store";
import { insertLog } from "./db";
import { publish } from "./bus";

export type QueueItem = {
  id: string;
  type: "private_reply" | "dm";
  recipient: { comment_id: string } | { id: string };
  message: Record<string, unknown>;
  retries: number;
  notBefore: number;
  igsid?: string;
  postId?: string;
};

const BASE = "https://graph.instagram.com/v23.0";
const MAX_PER_HOUR = 190;
const DRAIN_INTERVAL_MS = 500;

class MessageQueue {
  private items: QueueItem[] = [];
  private sentThisHour = 0;
  private hourStart = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.drain(); }, DRAIN_INTERVAL_MS);
  }

  enqueue(item: Omit<QueueItem, "retries" | "notBefore">) {
    this.items.push({ ...item, retries: 0, notBefore: Date.now() });
    this.start();
    publish({ type: "log", level: "info", msg: `queue: enqueued ${item.type} (${item.id})`, ts: Date.now() });
  }

  size() { return this.items.length; }

  private async drain() {
    const now = Date.now();
    if (now - this.hourStart > 3_600_000) { this.sentThisHour = 0; this.hourStart = now; }
    if (this.sentThisHour >= MAX_PER_HOUR) return;

    const idx = this.items.findIndex((i) => i.notBefore <= now);
    if (idx === -1) return;
    const [item] = this.items.splice(idx, 1);

    try {
      const store = await readStore();
      if (!store.account) { this.items.push(item); return; }

      const body = {
        recipient: item.recipient,
        message: item.message,
      };
      const res = await fetch(`${BASE}/${store.account.igUserId}/messages?access_token=${store.account.accessToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error(JSON.stringify(json));

      this.sentThisHour++;
      insertLog({ direction: "out", event_type: item.type, igsid: item.igsid ?? null, post_id: item.postId ?? null, payload: JSON.stringify(body), status: "ok", error: null });
      publish({ type: "log", level: "info", msg: `queue: sent ${item.type} (${item.id})`, ts: Date.now() });
    } catch (e) {
      const err = String(e);
      if (item.retries < 3) {
        item.retries++;
        item.notBefore = Date.now() + Math.pow(5, item.retries) * 1000;
        this.items.push(item);
        publish({ type: "log", level: "warn", msg: `queue: retry ${item.retries}/3 for ${item.id}: ${err}`, ts: Date.now() });
      } else {
        insertLog({ direction: "out", event_type: item.type, igsid: item.igsid ?? null, post_id: item.postId ?? null, payload: JSON.stringify(item.message), status: "error", error: err });
        publish({ type: "log", level: "error", msg: `queue: gave up on ${item.id}: ${err}`, ts: Date.now() });
      }
    }
  }
}

// Singleton on globalThis — survives Next.js HMR
const g = globalThis as unknown as { __shaiz_queue?: MessageQueue };
if (!g.__shaiz_queue) g.__shaiz_queue = new MessageQueue();
export const messageQueue = g.__shaiz_queue;
messageQueue.start();
