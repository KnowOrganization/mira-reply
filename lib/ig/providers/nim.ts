import OpenAI from "openai";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ChatOpts = { json?: boolean; temperature?: number };

const BASE_URL = process.env.NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
const TIMEOUT  = Number(process.env.NIM_TIMEOUT_MS || 30_000);

// Priority-ordered. Largest/most-capable first; smaller models near the end
// as last resort. Override with NIM_MODELS=a,b,c (comma-separated).
const DEFAULT_MODELS: readonly string[] = [
  "meta/llama-3.1-405b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct-hf",
  "meta/llama-3.3-70b-instruct",
  "meta/llama-3.1-70b-instruct",
  "mistralai/mixtral-8x22b-instruct-v0.1",
  "mistralai/mistral-large-2-instruct",
  "nvidia/llama-3.3-nemotron-super-49b-v1",
  "qwen/qwen2.5-72b-instruct",
  "deepseek-ai/deepseek-r1-distill-llama-70b",
  "deepseek-ai/deepseek-r1-distill-qwen-32b",
  "microsoft/phi-3.5-moe-instruct",
  "google/gemma-2-27b-it",
  "mistralai/mixtral-8x7b-instruct-v0.1",
  "mistralai/mistral-nemo-12b-instruct",
  "nv-mistralai/mistral-nemo-12b-instruct",
  "microsoft/phi-3-medium-128k-instruct",
  "google/gemma-2-9b-it",
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.2-3b-instruct",
  "mistralai/mistral-7b-instruct-v0.3",
  "qwen/qwen2.5-7b-instruct",
  "microsoft/phi-3-mini-128k-instruct",
  "ibm/granite-3.0-8b-instruct",
  "ai21labs/jamba-1.5-mini-instruct",
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
