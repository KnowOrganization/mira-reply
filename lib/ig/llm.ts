const OLLAMA = process.env.OLLAMA_HOST || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct";

export async function chat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { json?: boolean; temperature?: number } = {}
) {
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

export async function chatJSON<T>(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  fallback: T,
  temp = 0.4
): Promise<T> {
  try {
    const out = await chat(messages, { json: true, temperature: temp });
    return JSON.parse(out) as T;
  } catch {
    return fallback;
  }
}
