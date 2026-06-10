// Packed Float32Array embedding index for KB facts.
// Build once at boot from store.knowledge[]. Cosine in tight loop.
// Sized for <10k facts; rebuild on KB write.

import type { Fact } from "../store";

let M: Float32Array | null = null;
let DIM = 0;
let IDS: string[] = [];

export function dim(): number {
  return DIM;
}

export function size(): number {
  return IDS.length;
}

export function build(facts: Fact[]): void {
  const usable = facts.filter((f) => f.embedding && f.embedding.length > 0);
  if (usable.length === 0) {
    M = null;
    DIM = 0;
    IDS = [];
    return;
  }
  DIM = usable[0].embedding!.length;
  M = new Float32Array(usable.length * DIM);
  IDS = [];
  let row = 0;
  for (let i = 0; i < usable.length; i++) {
    const e = usable[i].embedding!;
    if (e.length !== DIM) continue;
    // L2-normalize at index time so search loop skips a divide
    let n = 0;
    for (let j = 0; j < DIM; j++) n += e[j] * e[j];
    n = Math.sqrt(n) || 1;
    const off = row * DIM;
    for (let j = 0; j < DIM; j++) M[off + j] = e[j] / n;
    IDS.push(usable[i].id);
    row++;
  }
}

function l2norm(v: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += (v as Float32Array)[i] * (v as Float32Array)[i];
  return Math.sqrt(s) || 1;
}

export type ScoredId = { id: string; score: number };

export function topK(query: number[] | Float32Array, k = 8): ScoredId[] {
  if (!M || !DIM || query.length !== DIM) return [];
  const q = query instanceof Float32Array ? query : new Float32Array(query);
  const qn = l2norm(q);

  // running top-k via simple sorted-insertion; k is small so this is cheap
  const out: ScoredId[] = [];
  let worst = -Infinity;
  for (let i = 0; i < IDS.length; i++) {
    let dot = 0;
    const off = i * DIM;
    for (let j = 0; j < DIM; j++) dot += M[off + j] * q[j];
    // skip norm of row — assume facts are normalized at write; query norm only
    const score = dot / qn;
    if (out.length < k) {
      out.push({ id: IDS[i], score });
      if (out.length === k) {
        out.sort((a, b) => a.score - b.score);
        worst = out[0].score;
      }
    } else if (score > worst) {
      out[0] = { id: IDS[i], score };
      out.sort((a, b) => a.score - b.score);
      worst = out[0].score;
    }
  }
  return out.sort((a, b) => b.score - a.score);
}
