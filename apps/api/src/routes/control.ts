// Manual poll + watcher control. Scoped to the authed user's account.
import { Elysia } from "elysia";
import { requireUser } from "../lib/auth";
import { readStore, patchStoreFor } from "@/lib/ig/store";
import { getAllMedia, getMediaComments } from "@/lib/ig/graph";
import { processInbound } from "@/lib/ig/pipeline";
import { publish } from "@/lib/ig/bus";
import { matchAutomations, executeAutomation, type AutomationEvent } from "@/lib/ig/automation";
import { ensureWatcher, stopWatcher, watcherStatus } from "@/lib/ig/watcher";

const g = globalThis as unknown as { __mira_seen?: Set<string> };
if (!g.__mira_seen) g.__mira_seen = new Set();
const seen = g.__mira_seen;

export const controlRoute = new Elysia()
  .get("/api/ig/poll", async ({ request, query, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 400; return { error: "not connected" }; }
    const acct = a.ctx.accountId;
    ensureWatcher(); // self-heal (no-op in safe mode)
    const store = await readStore(acct);
    if (!store.account) { set.status = 400; return { error: "not connected" }; }
    const token = store.account.accessToken;
    const initFlag = (query as { init?: string }).init === "1";
    const watermark = store.pollWatermark || 0;

    let scanned = 0, queued = 0, newest = watermark;
    try {
      const media = (await getAllMedia(token)) as { data?: Array<{ id: string }> };
      for (const m of media.data ?? []) {
        const cm = (await getMediaComments(m.id, token)) as {
          data?: Array<{ id: string; text: string; from?: { id: string; username?: string }; timestamp: string }>;
        };
        for (const c of cm.data ?? []) {
          scanned++;
          const ts = new Date(c.timestamp).getTime();
          if (ts > newest) newest = ts;
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          if (!c.from || c.from.id === store.account.igUserId) continue;
          if (initFlag || ts <= watermark) continue;
          queued++;

          publish({ type: "comment", commentId: c.id, mediaId: m.id, fromUserId: c.from.id, fromUsername: c.from.username, text: c.text, ts });
          const freshStore = await readStore(acct);
          const evt: AutomationEvent = { type: "comment_post", commentId: c.id, fromUserId: c.from.id, fromUsername: c.from.username ?? "", text: c.text, postId: m.id };
          const matched = matchAutomations(freshStore, evt);
          if (matched.length > 0) {
            for (const auto of matched) {
              await executeAutomation(auto, evt, { accountId: acct }).catch((e) =>
                publish({ type: "log", level: "error", msg: `poll automation [${auto.id}]: ${String(e)}`, ts: Date.now() }));
            }
          } else {
            processInbound({ kind: "comment", threadOrMediaId: c.id, fromUserId: c.from.id, fromUsername: c.from.username, text: c.text, postId: m.id }).catch((e) =>
              publish({ type: "log", level: "error", msg: `pipeline: ${String(e)}`, ts: Date.now() }));
          }
        }
      }
      await patchStoreFor(acct, { pollWatermark: newest || Date.now() });
      return { ok: true, scanned, queued, watermark: newest, init: initFlag };
    } catch (e) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : "poll failed" };
    }
  })
  .get("/api/ig/watcher", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    return watcherStatus();
  })
  .post("/api/ig/watcher", async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    const action = ((body ?? {}) as { action?: "start" | "stop" }).action;
    return action === "stop" ? stopWatcher() : ensureWatcher();
  });
