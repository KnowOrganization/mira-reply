import { NextResponse } from "next/server";
import { readStore, patchStore } from "@/lib/ig/store";
import { getAllMedia, getMediaComments } from "@/lib/ig/graph";
import { processInbound } from "@/lib/ig/pipeline";
import { publish } from "@/lib/ig/bus";
import { matchAutomations, executeAutomation, type AutomationEvent } from "@/lib/ig/automation";
import { ensureWatcher } from "@/lib/ig/watcher";

export const runtime = "nodejs";

const g = globalThis as unknown as { __mira_seen?: Set<string> };
if (!g.__mira_seen) g.__mira_seen = new Set();
const seen = g.__mira_seen;

export async function GET(req: Request) {
  ensureWatcher(); // restart watcher if it died on server restart
  const store = await readStore();
  if (!store.account) return NextResponse.json({ error: "not connected" }, { status: 400 });
  const token = store.account.accessToken;

  const url = new URL(req.url);
  const initFlag = url.searchParams.get("init") === "1";
  const watermark = store.pollWatermark || 0;

  let scanned = 0;
  let queued = 0;
  let newest = watermark;
  try {
    const media = (await getAllMedia(token)) as { data?: Array<{ id: string }> };
    for (const m of media.data ?? []) {
      const cm = (await getMediaComments(m.id, token)) as {
        data?: Array<{
          id: string;
          text: string;
          from?: { id: string; username?: string };
          timestamp: string;
        }>;
      };
      for (const c of cm.data ?? []) {
        scanned++;
        const ts = new Date(c.timestamp).getTime();
        if (ts > newest) newest = ts;
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        if (!c.from) continue;
        if (c.from.id === store.account.igUserId) continue;
        if (initFlag) continue;
        if (ts <= watermark) continue;
        queued++;

        publish({
          type: "comment",
          commentId: c.id,
          mediaId: m.id,
          fromUserId: c.from.id,
          fromUsername: c.from.username,
          text: c.text,
          ts,
        });

        const freshStore = await readStore();
        const evt: AutomationEvent = {
          type: "comment_post",
          commentId: c.id,
          fromUserId: c.from.id,
          fromUsername: c.from.username ?? "",
          text: c.text,
          postId: m.id,
        };

        publish({ type: "log", level: "info", msg: `poll: comment ${c.id} on post ${m.id} from @${c.from.username ?? c.from.id} — checking automations`, ts: Date.now() });

        const matched = matchAutomations(freshStore, evt);
        if (matched.length > 0) {
          publish({ type: "log", level: "info", msg: `poll: ${matched.length} automation(s) matched for comment ${c.id}`, ts: Date.now() });
          for (const auto of matched) {
            await executeAutomation(auto, evt).catch((e) =>
              publish({ type: "log", level: "error", msg: `poll automation [${auto.id}]: ${String(e)}`, ts: Date.now() })
            );
          }
        } else {
          publish({ type: "log", level: "info", msg: `poll: no automations matched — sending to pipeline`, ts: Date.now() });
          processInbound({
            kind: "comment",
            threadOrMediaId: c.id,
            fromUserId: c.from.id,
            fromUsername: c.from.username,
            text: c.text,
            postId: m.id,
          }).catch((e) =>
            publish({ type: "log", level: "error", msg: `pipeline: ${String(e)}`, ts: Date.now() })
          );
        }
      }
    }
    await patchStore({ pollWatermark: newest || Date.now() });
    return NextResponse.json({ ok: true, scanned, queued, watermark: newest, init: initFlag });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "poll failed" },
      { status: 500 }
    );
  }
}
