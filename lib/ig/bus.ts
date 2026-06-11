import IORedis from "ioredis";
import { redis } from "./redis";

// Cross-process event bus. Was an in-process global Set — that only worked when
// the publisher (webhook/poll/watcher) and the SSE subscriber lived in the same
// Node process. Now the API/watcher run in a separate Bun process from Next, so
// the bus rides Redis pub/sub: publish() fans out to every process's subscriber.
// The publish()/subscribe() API is unchanged, so all callers work as-is.

type Listener = (event: BusEvent) => void;

export type BusEvent =
  | { type: "comment"; commentId: string; mediaId: string; fromUserId: string; fromUsername?: string; text: string; ts: number }
  | { type: "message"; messageId: string; fromUserId: string; text: string; ts: number }
  | { type: "draft"; draftId: string; ts: number }
  | { type: "sent"; replyId: string; ts: number }
  | { type: "log"; level: "info" | "warn" | "error"; msg: string; ts: number };

const CHANNEL = "mira:bus";
const URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// One subscriber connection per process (Redis requires a dedicated conn in
// subscribe mode), fanning out to all local listeners. Lazy + HMR-safe.
const g = globalThis as unknown as { __mira_bus_sub?: IORedis; __mira_bus_listeners?: Set<Listener> };
const listeners = g.__mira_bus_listeners ?? new Set<Listener>();
if (!g.__mira_bus_listeners) g.__mira_bus_listeners = listeners;

function ensureSubscriber() {
  if (g.__mira_bus_sub) return;
  const sub = new IORedis(URL, { maxRetriesPerRequest: null, enableReadyCheck: false });
  sub.subscribe(CHANNEL).catch(() => {});
  sub.on("message", (_ch, msg) => {
    let ev: BusEvent;
    try { ev = JSON.parse(msg); } catch { return; }
    for (const l of listeners) { try { l(ev); } catch {} }
  });
  g.__mira_bus_sub = sub;
}

export function publish(event: BusEvent) {
  // fire-and-forget; Redis delivers to every subscribed process (incl. this one)
  redis.publish(CHANNEL, JSON.stringify(event)).catch(() => {});
}

export function subscribe(l: Listener) {
  ensureSubscriber();
  listeners.add(l);
  return () => listeners.delete(l);
}
