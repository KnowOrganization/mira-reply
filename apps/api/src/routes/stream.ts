// GET /api/ig/stream — Server-Sent Events. Subscribes to the Redis-backed bus
// (lib/ig/bus) and streams comment/draft/sent/log events to the UI. Replaces the
// Next route; events published from any process (webhook, watcher, worker) arrive.
import { Elysia } from "elysia";
import { subscribe, type BusEvent } from "@/lib/ig/bus";

export const streamRoute = new Elysia().get("/api/ig/stream", ({ request }) => {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (data: unknown) => {
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
      };

      send({ type: "ready", ts: Date.now() });
      const unsub = subscribe((ev: BusEvent) => send(ev));
      const ping = setInterval(() => {
        try { controller.enqueue(enc.encode(`: ping\n\n`)); } catch {}
      }, 25_000);

      const abort = () => {
        clearInterval(ping);
        unsub();
        try { controller.close(); } catch {}
      };
      request.signal.addEventListener("abort", abort);
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
});
