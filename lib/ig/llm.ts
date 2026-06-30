import { nimChat, type ChatMessage, type ChatOpts } from "./providers/nim";

export type { ChatMessage, ChatOpts };

export async function chat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
  return nimChat(messages, opts);
}

export async function chatJSON<T>(messages: ChatMessage[], fallback: T, temp = 0.4): Promise<T> {
  try {
    const out = await chat(messages, { json: true, temperature: temp });
    // Strip markdown fences some models emit despite instructions.
    const cleaned = out
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}
