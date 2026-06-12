// Ollama provider — the original lib/ig/llm.ts fetch implementation, moved
// verbatim. Kept as the fallback provider behind MIRA_AI_PROVIDER=ollama.
const OLLAMA = process.env.OLLAMA_HOST || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ChatOpts = { json?: boolean; temperature?: number };

export async function ollamaChat(messages: ChatMessage[], opts: ChatOpts = {}) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      format: opts.json ? "json" : undefined,
      options: { temperature: opts.temperature ?? 0.7, top_p: 0.9 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { message: { content: string } };
  return j.message.content;
}
