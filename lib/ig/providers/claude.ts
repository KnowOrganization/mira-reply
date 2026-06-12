// Claude provider — runs Mira's brain on the user's Claude subscription via the
// Agent SDK (claude setup-token → CLAUDE_CODE_OAUTH_TOKEN in env; the spawned
// subprocess inherits process.env). A consumer subscription token is NOT
// accepted by the raw /v1/messages API, so the Agent SDK is the sanctioned
// programmatic path. Each call is a single-turn, tool-less, isolated query.
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { ChatMessage, ChatOpts } from "./ollama";

const MODEL = process.env.MIRA_CLAUDE_MODEL || "claude-sonnet-4-6";
const TIMEOUT_MS = Number(process.env.MIRA_CLAUDE_TIMEOUT_MS || 120_000);

const JSON_INSTRUCTION =
  "Respond with ONLY valid JSON. No prose, no markdown fences, no explanation.";

/** Split Mira's chat-shaped messages into Agent SDK systemPrompt + prompt.
 *  Call sites only ever send system + user turns; assistant turns are
 *  flattened defensively so nothing is silently dropped. */
function toQueryInput(messages: ChatMessage[], json: boolean | undefined) {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
  if (json) systemParts.push(JSON_INSTRUCTION);
  const prompt = messages
    .filter((m) => m.role !== "system")
    .map((m) => (m.role === "assistant" ? `(your previous reply) ${m.content}` : m.content))
    .join("\n\n");
  return { systemPrompt: systemParts.join("\n\n"), prompt };
}

function baseOptions(systemPrompt: string, abortController: AbortController) {
  return {
    model: MODEL,
    systemPrompt,
    maxTurns: 1,
    tools: [] as string[], // no built-in tools — pure text generation
    settingSources: [], // SDK isolation: no user/project settings, no CLAUDE.md
    abortController,
  };
}

// `opts.temperature` is accepted for signature parity but unsupported by the
// Agent SDK — reply variety comes from the prompt-side style seeds in
// handlers/reply.ts, not sampling params.
export async function claudeChat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
  const { systemPrompt, prompt } = toQueryInput(messages, opts.json);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    let result: string | null = null;
    for await (const msg of query({ prompt, options: baseOptions(systemPrompt, ac) })) {
      if (msg.type === "result") {
        if (msg.subtype === "success") result = msg.result;
        else throw new Error(`claude: ${msg.subtype}: ${msg.errors?.join("; ") || "unknown"}`);
      }
    }
    if (result == null) throw new Error("claude: stream ended without a result message");
    return result.trim();
  } finally {
    clearTimeout(timer);
  }
}

/** Streaming variant for the /api/chat proxy — yields text deltas. */
export async function* claudeChatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const { systemPrompt, prompt } = toQueryInput(messages, false);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    for await (const msg of query({
      prompt,
      options: { ...baseOptions(systemPrompt, ac), includePartialMessages: true },
    })) {
      if (msg.type === "stream_event") {
        const ev = msg.event;
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
          yield ev.delta.text;
        }
      } else if (msg.type === "result" && msg.subtype !== "success") {
        throw new Error(`claude: ${msg.subtype}: ${msg.errors?.join("; ") || "unknown"}`);
      }
    }
  } finally {
    clearTimeout(timer);
  }
}
