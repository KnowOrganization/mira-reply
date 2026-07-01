import OpenAI from "openai";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ChatOpts = { json?: boolean; temperature?: number };

const BASE_URL = process.env.NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
const TIMEOUT  = Number(process.env.NIM_TIMEOUT_MS || 30_000);

// Priority-ordered. Largest/most-capable first; smaller models near the end
// as last resort. Override with NIM_MODELS=a,b,c (comma-separated).
// Verified live against GET {NIM_BASE_URL}/models — the prior list had 13/26
// dead or misnamed slots (incl. the first two, wasting 2 failed round-trips
// on every call before reaching a real model).
const DEFAULT_MODELS: readonly string[] = [
  "meta/llama-4-maverick-17b-128e-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "meta/llama-3.3-70b-instruct",
  "meta/llama-3.1-70b-instruct",
  "mistralai/mistral-large-2-instruct",
  "nvidia/llama-3.3-nemotron-super-49b-v1.5",
  "qwen/qwen3-next-80b-a3b-instruct",
  "deepseek-ai/deepseek-v4-flash",
  "openai/gpt-oss-20b",
  "microsoft/phi-3.5-moe-instruct",
  "google/gemma-4-31b-it",
  "mistralai/mixtral-8x7b-instruct-v0.1",
  "mistralai/mistral-nemotron",
  "nv-mistralai/mistral-nemo-12b-instruct",
  "microsoft/phi-4-mini-instruct",
  "google/gemma-3-12b-it",
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.2-3b-instruct",
  "mistralai/mistral-7b-instruct-v0.3",
  "ibm/granite-3.0-8b-instruct",
  "ai21labs/jamba-1.5-large-instruct",
  "google/gemma-2-2b-it",
  "meta/llama-3.2-1b-instruct",
];

function models(): readonly string[] {
  const env = process.env.NIM_MODELS;
  return env ? env.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_MODELS;
}

let _client: OpenAI | null = null;
function client(): OpenAI {
  return (_client ??= new OpenAI({
    baseURL: BASE_URL,
    apiKey: process.env.NVIDIA_API_KEY || "",
    timeout: TIMEOUT,
  }));
}

export async function nimChat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
  let lastErr: unknown;
  for (const model of models()) {
    try {
      const res = await client().chat.completions.create({
        model,
        messages,
        temperature: opts.temperature ?? 0.7,
        ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
      });
      const text = res.choices[0]?.message?.content?.trim();
      if (!text) { lastErr = new Error(`nim: ${model} returned empty response`); continue; }
      return text;
    } catch (e) {
      lastErr = e;
      console.warn(`[nim] ${model} failed: ${e instanceof Error ? e.message : e}`);
      // all errors rotate — 429, 5xx, timeouts, model-specific 4xx
    }
  }
  throw new Error(
    `nim: all ${models().length} models exhausted. Last error: ${lastErr instanceof Error ? lastErr.message : lastErr}`
  );
}

export async function* nimChatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  let lastErr: unknown;
  for (const model of models()) {
    let yielded = false;
    try {
      const stream = client().chat.completions.stream({ model, messages });
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) { yielded = true; yield delta; }
      }
      if (!yielded) { lastErr = new Error(`nim: ${model} returned empty stream`); continue; }
      return;
    } catch (e) {
      if (yielded) throw e; // already delivering — can't rotate mid-stream
      lastErr = e;
      console.warn(`[nim] stream ${model} pre-yield failure: ${e instanceof Error ? e.message : e}`);
    }
  }
  throw new Error(
    `nim: all models exhausted (stream). Last error: ${lastErr instanceof Error ? lastErr.message : lastErr}`
  );
}
