// Shared comment-dedup set — webhook (primary) and poll (safety net) both
// check it, so a comment is processed exactly once no matter which ingestion
// path saw it first. Kept on globalThis so dev HMR keeps one set.

const CAP = 10_000;
const g = globalThis as unknown as { __mira_seen?: Set<string> };
if (!g.__mira_seen) g.__mira_seen = new Set();
const seen = g.__mira_seen;

/** Check-and-set: true if this comment was already seen; marks it seen. */
export function seenComment(id: string): boolean {
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > CAP) {
    const first = seen.values().next().value;
    if (first) seen.delete(first);
  }
  return false;
}

/** Mark ids seen without the check (e.g. priming from the cache on startup). */
export function primeSeen(ids: Iterable<string>): void {
  for (const id of ids) seen.add(id);
}

export function seenSize(): number {
  return seen.size;
}
