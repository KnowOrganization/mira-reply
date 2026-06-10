// Local-only semantic embeddings via Ollama (nomic-embed-text).
// Used by the Knowledge Engine for cross-post fact recall. If the embedding
// model is not installed, callers fall back to keywordScore — Mira degrades,
// never breaks.

const OLLAMA = process.env.OLLAMA_HOST || "http://localhost:11434";
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";

let embedAvailable: boolean | null = null;

/** Embed a string into a vector. Returns null if the model is unavailable. */
export async function embed(text: string): Promise<number[] | null> {
  const input = text.trim();
  if (!input) return null;
  try {
    const res = await fetch(`${OLLAMA}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, prompt: input }),
      // hard cap — embed should be <100ms in steady state. 5s catches a cold
      // model load; anything longer = degrade to keyword path.
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      embedAvailable = false;
      return null;
    }
    const j = (await res.json()) as { embedding?: number[] };
    if (!j.embedding || j.embedding.length === 0) {
      embedAvailable = false;
      return null;
    }
    embedAvailable = true;
    return j.embedding;
  } catch {
    embedAvailable = false;
    return null;
  }
}

/** Whether the last embed() call succeeded. null = not yet probed. */
export function isEmbedAvailable(): boolean | null {
  return embedAvailable;
}

/** Cosine similarity of two vectors. Range roughly 0–1 for embeddings. */
export function cosine(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const STOP = new Set([
  "the", "a", "an", "is", "are", "was", "this", "that", "of", "to", "in",
  "on", "for", "and", "or", "it", "you", "your", "i", "me", "my", "do",
  "does", "what", "where", "which", "how", "can", "u", "ur", "pls", "plz",
]);

/** Lowercase word tokens, stopwords + short tokens removed. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/**
 * Keyword similarity fallback for when embeddings are unavailable.
 * Overlap coefficient over content tokens — range 0–1.
 */
export function keywordScore(query: string, doc: string): number {
  const q = new Set(tokenize(query));
  const d = new Set(tokenize(doc));
  if (q.size === 0 || d.size === 0) return 0;
  let overlap = 0;
  for (const t of q) if (d.has(t)) overlap++;
  return overlap / Math.min(q.size, d.size);
}
