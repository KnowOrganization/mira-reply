// POST /api/chat — streaming chat proxy (auth-gated).
// Emits Ollama-shaped NDJSON lines ({message:{content},done}) so the
// playground/chat frontend needs no changes.
import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { nimChatStream } from "@/lib/ig/providers/nim";
import { prepareChatMessages, type ChatBody } from "../../../services/llm-service";

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};

function nimNdjsonResponse(messages: ChatBody["messages"]): Response {
  const enc = new TextEncoder();
  const line = (obj: unknown) => enc.encode(JSON.stringify(obj) + "\n");
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of nimChatStream(messages)) {
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
    const messages = await prepareChatMessages(auth.accountId, chatBody.messages ?? []);
    return nimNdjsonResponse(messages);
  },
  {
    requireRole: "agent",
    body: t.Object(
      { messages: t.Optional(t.Array(t.Unknown(), { maxItems: 200 })) },
      { additionalProperties: true }
    ),
  }
);
