// POST /api/chat — streaming Ollama proxy (passthrough body, auth-gated)
// Streaming Response construction stays in the handler (inherently HTTP).
// prepareChatUpstream handles upstream fetch setup.
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { prepareChatUpstream, type ChatBody } from "../../../services/llm-service";

export const postChatHandler = new Elysia().use(authPlugin).post(
  "/api/chat",
  async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }

    const { upstreamUrl, upstreamInit } = await prepareChatUpstream(
      auth.accountId,
      (body ?? {}) as ChatBody
    );

    const upstream = await fetch(upstreamUrl, upstreamInit).catch(
      (e: Error) => new Response(`Ollama unreachable at ${upstreamUrl}. (${e.message})`, { status: 502 })
    );

    if (!(upstream instanceof Response)) return new Response("Bad upstream", { status: 502 });
    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => "");
      return new Response(txt || `Upstream error ${upstream.status}`, { status: upstream.status });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  },
  { auth: true }
);
