// Shared comment-dedup set — webhook (primary) and poll (safety net) both
// check it, so a comment is processed exactly once no matter which ingestion
// path saw it first. Kept on globalThis so dev HMR keeps one set.

const CAP = 10_000;
const g = globalThis as unknown as { __mira_seen?: Set<string> };
if (!g.__mira_seen) g.__mira_seen = new Set();
const seen = g.__mira_seen;

/** Read-only: has this comment been seen? Does NOT mark it. */
export function hasSeen(id: string): boolean {
  return seen.has(id);
}

/** Mark one comment seen. */
export function markSeen(id: string): void {
  seen.add(id);
  if (seen.size > CAP) {
    const first = seen.values().next().value;
    if (first) seen.delete(first);
  }
}

/**
 * Check-and-set: true if already seen; marks it seen. For ingestion paths
 * that act on a comment the instant they check it (e.g. the webhook). The
 * watcher must NOT use this — it has skip gates AFTER the check, so it uses
 * hasSeen() + markSeen() to avoid burying a comment it never processed.
 */
export function seenComment(id: string): boolean {
  if (hasSeen(id)) return true;
  markSeen(id);
  return false;
}

/** Mark ids seen without the check (e.g. priming from the cache on startup). */
export function primeSeen(ids: Iterable<string>): void {
  for (const id of ids) seen.add(id);
}

export function seenSize(): number {
  return seen.size;
}
