// POST /api/chat — streaming chat proxy (auth-gated). Provider-aware:
//   claude (default) — Agent SDK stream on the user's subscription
//   ollama           — passthrough to the local Ollama upstream (original path)
// Both emit Ollama-shaped NDJSON lines ({message:{content},done}) so the
// playground/chat frontend needs no changes.
import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { aiProvider } from "@/lib/ig/llm";
import { claudeChatStream } from "@/lib/ig/providers/claude";
import {
  prepareChatMessages,
  prepareChatUpstream,
  type ChatBody,
} from "../../../services/llm-service";

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};

function claudeNdjsonResponse(messages: ChatBody["messages"]): Response {
  const enc = new TextEncoder();
  const line = (obj: unknown) => enc.encode(JSON.stringify(obj) + "\n");
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of claudeChatStream(messages)) {
          controller.enqueue(line({ message: { role: "assistant", content: delta }, done: false }));
        }
        controller.enqueue(line({ message: { role: "assistant", content: "" }, done: true }));
      } catch (e) {
        controller.enqueue(line({ error: String(e), done: true }));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: NDJSON_HEADERS });
}

export const postChatHandler = new Elysia().use(authPlugin).post(
  "/api/chat",
  async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }

    const chatBody = (body ?? {}) as ChatBody;

    if (aiProvider() === "claude") {
      const messages = await prepareChatMessages(auth.accountId, chatBody.messages ?? []);
      return claudeNdjsonResponse(messages);
    }

    const { upstreamUrl, upstreamInit } = await prepareChatUpstream(auth.accountId, chatBody);

    const upstream = await fetch(upstreamUrl, upstreamInit).catch(
      (e: Error) => new Response(`Ollama unreachable at ${upstreamUrl}. (${e.message})`, { status: 502 })
    );

    if (!(upstream instanceof Response)) return new Response("Bad upstream", { status: 502 });
    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => "");
      return new Response(txt || `Upstream error ${upstream.status}`, { status: upstream.status });
    }

    return new Response(upstream.body, { headers: NDJSON_HEADERS });
  },
  {
    requireRole: "agent",
    // Cap message count (cost/memory); leave other fields open for the
    // provider-specific options the chat frontend sends.
    body: t.Object(
      { messages: t.Optional(t.Array(t.Unknown(), { maxItems: 200 })) },
      { additionalProperties: true }
    ),
  }
);
