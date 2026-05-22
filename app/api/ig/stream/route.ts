import { NextRequest } from "next/server";
import { subscribe } from "@/lib/ig/bus";
import { ensureWatcher } from "@/lib/ig/watcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // ensure watcher running whenever a UI client connects
  ensureWatcher();
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "ready", ts: Date.now() });

      const unsub = subscribe((ev) => send(ev));
      const ping = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: ping\n\n`));
        } catch {}
      }, 25_000);

      const abort = () => {
        clearInterval(ping);
        unsub();
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
