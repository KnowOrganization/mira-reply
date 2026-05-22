type Listener = (event: BusEvent) => void;

export type BusEvent =
  | { type: "comment"; commentId: string; mediaId: string; fromUserId: string; fromUsername?: string; text: string; ts: number }
  | { type: "message"; messageId: string; fromUserId: string; text: string; ts: number }
  | { type: "draft"; draftId: string; ts: number }
  | { type: "sent"; replyId: string; ts: number }
  | { type: "log"; level: "info" | "warn" | "error"; msg: string; ts: number };

const g = globalThis as unknown as { __mira_bus?: Set<Listener> };
if (!g.__mira_bus) g.__mira_bus = new Set();
const listeners = g.__mira_bus;

export function publish(event: BusEvent) {
  for (const l of listeners) {
    try {
      l(event);
    } catch {}
  }
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
