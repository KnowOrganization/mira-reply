import { nimChat, nimChatVision, AiKeyMissingError, type ChatMessage, type ChatOpts } from "./providers/nim";
import { query } from "@shaiz/db";

export type { ChatMessage, ChatOpts };
export { AiKeyMissingError };

export type LlmOpts = ChatOpts & {
  /** Resolve this account's BYOK key (saved via PATCH /api/ig/ai-settings)
   *  and use it for the call. Falls back to the NVIDIA_API_KEY env. */
  accountId?: string;
};

// BYOK lookup, 60s-cached — generation is called per message, the key changes
// ~never. Cache stores "" for accounts without a key so misses are cached too.
const keyCache = new Map<string, { key: string; at: number }>();
const KEY_TTL = 60_000;
async function byokKeyFor(accountId: string): Promise<string> {
  const hit = keyCache.get(accountId);
  if (hit && Date.now() - hit.at < KEY_TTL) return hit.key;
  let key = "";
  try {
    const rows = await query<{ byok_key: string | null }>(
      `select byok_key from accounts where ig_user_id = $1`,
      [accountId]
    );
    key = rows[0]?.byok_key ?? "";
  } catch {
    // DB hiccup — fall through to the env key
  }
  keyCache.set(accountId, { key, at: Date.now() });
  return key;
}

async function resolve(opts: LlmOpts): Promise<ChatOpts> {
  if (opts.apiKey || !opts.accountId) return opts;
  const byok = await byokKeyFor(opts.accountId);
  return byok ? { ...opts, apiKey: byok } : opts;
}

export async function chat(messages: ChatMessage[], opts: LlmOpts = {}): Promise<string> {
  return nimChat(messages, await resolve(opts));
}

/** Vision-capable chat — isolated model list, see providers/nim.ts. Use for
 *  image-content messages; never falls through to the text-only cascade. */
export async function chatVision(messages: ChatMessage[], opts: LlmOpts = {}): Promise<string> {
  return nimChatVision(messages, await resolve(opts));
}

export async function chatJSON<T>(messages: ChatMessage[], fallback: T, temp = 0.4, opts: LlmOpts = {}): Promise<T> {
  try {
    const out = await chat(messages, { ...opts, json: true, temperature: temp });
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
