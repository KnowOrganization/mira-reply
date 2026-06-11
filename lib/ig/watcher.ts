// RETIRED — the polling watcher (7s tick + 1s realtime loop + 1s DM poll) is
// replaced by the webhook-first pipeline:
//   • apps/api/src/routes/webhook.ts — durable receiver (persist + enqueue)
//   • lib/ig/ingest.ts               — worker-side processors (all event kinds)
//   • lib/ig/reconcile.ts            — 60s per-account safety-net sweep
//   • lib/ig/maintenance.ts          — token refresh + follower sync (30m jobs)
//   • lib/ig/outbound.ts             — durable send queue (replaces MessageQueue
//                                      + the file-store sendQueue drain)
// These stubs keep the old control-route API shape alive; nothing polls.
import { seenSize } from "./seen";

export function ensureWatcher() {
  return { running: false, mode: "webhook-first", intervalMs: 0, startedAt: 0 };
}

export function stopWatcher() {
  return { running: false, mode: "webhook-first" };
}

export function watcherStatus() {
  return { running: false, mode: "webhook-first", intervalMs: 0, startedAt: 0, seenCount: seenSize() };
}
