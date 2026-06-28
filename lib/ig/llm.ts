// LLM chokepoint — every Mira brain call (reply gen, perception, planning,
// intent, KB verify, agent, brain loop) goes through chat()/chatJSON().
// Provider is selected by MIRA_AI_PROVIDER:
//   "claude" (default) — user's Claude subscription via the Agent SDK
//   "ollama"           — local Ollama fallback (the original implementation)
import { ollamaChat, type ChatMessage, type ChatOpts } from "./providers/ollama";
import { claudeChat } from "./providers/claude";

export type { ChatMessage, ChatOpts };

export function aiProvider(): "claude" | "ollama" {
  // ponytail: env governs actual routing. Per-account provider/byokKey is stored
  // and surfaced (accounts.ai_provider, ai-settings endpoint) but not yet applied
  // here — chat() is a sync global chokepoint; threading async account context
  // through every caller is the upgrade path when per-account routing is needed.
  return (process.env.MIRA_AI_PROVIDER || "claude").toLowerCase() === "ollama"
    ? "ollama"
    : "claude";
}

export async function chat(messages: ChatMessage[], opts: ChatOpts = {}) {
  return aiProvider() === "ollama" ? ollamaChat(messages, opts) : claudeChat(messages, opts);
}

export async function chatJSON<T>(
  messages: ChatMessage[],
  fallback: T,
  temp = 0.4
): Promise<T> {
  try {
    const out = await chat(messages, { json: true, temperature: temp });
    // Claude may wrap JSON in markdown fences despite instructions; strip them.
    const cleaned = out
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}
