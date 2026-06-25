// Sender — paces outbound replies so Mira never bursts or hits a robotic
// rhythm, and never exceeds a safe daily volume. Anti-ban, the timing half.

import { readStore, updateStore, updateStoreFor, type Settings, type DailyStat } from "./store";

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// Module-global next-slot clock — shared across concurrent sends (and HMR).
const g = globalThis as unknown as { __mira_next_send?: number };

/**
 * Wait for this send's paced slot. Concurrent auto-sends (a batch of new
 * comments) get spread out — each claims the next slot, min-spacing apart,
 * with jitter so the rhythm is not robotic.
 */
export async function awaitSendSlot(settings: Settings): Promise<void> {
  const now = Date.now();
  const spacing = Math.max(0, settings.minSecondsBetweenSends) * 1000;
  if (spacing === 0) return;
  const jitter = settings.sendJitter ? Math.random() * spacing * 0.6 : 0;
  let slot = Math.max(now, g.__mira_next_send || 0);
  // cap — a send never waits more than 90s, even under a big backlog, so the
  // queue can't crawl indefinitely
  const MAX_WAIT = 90_000;
  if (slot - now > MAX_WAIT) slot = now + MAX_WAIT;
  g.__mira_next_send = slot + spacing + jitter;
  const wait = slot - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

/** Replies sent today. */
export async function sentToday(): Promise<number> {
  const s = await readStore();
  return s.dailyStats[todayKey()]?.sent ?? 0;
}

/** Is there still room under today's send cap? */
export async function withinDailyCap(settings: Settings): Promise<boolean> {
  if (settings.dailySendCap <= 0) return true;
  return (await sentToday()) < settings.dailySendCap;
}

/** Atomically bump today's counters. */
export async function recordDailyStat(
  patch: Partial<Omit<DailyStat, "date">>,
  accountId?: string | null
): Promise<void> {
  const key = todayKey();
  await updateStoreFor(accountId, (s) => {
    const cur: DailyStat = s.dailyStats[key] || {
      date: key,
      comments: 0,
      autoReplied: 0,
      drafted: 0,
      sent: 0,
      dmSent: 0,
      factsLearned: 0,
      clarificationsResolved: 0,
    };
    return {
      ...s,
      dailyStats: {
        ...s.dailyStats,
        [key]: {
          date: key,
          comments: cur.comments + (patch.comments ?? 0),
          autoReplied: cur.autoReplied + (patch.autoReplied ?? 0),
          drafted: cur.drafted + (patch.drafted ?? 0),
          sent: cur.sent + (patch.sent ?? 0),
          dmSent: cur.dmSent + (patch.dmSent ?? 0),
          factsLearned: cur.factsLearned + (patch.factsLearned ?? 0),
          clarificationsResolved:
            cur.clarificationsResolved + (patch.clarificationsResolved ?? 0),
        },
      },
    };
  });
}

/**
 * Selective reply — randomly skip a fraction of low-value acks. Replying to
 * 100% of comments is itself a bot signal; a real person misses some.
 */
export function shouldSkipForVariety(
  intent: string,
  settings: Settings
): boolean {
  // alwaysReply (Grok-style) wins — never randomly drop a reply.
  if (settings.alwaysReply) return false;
  if (settings.selectiveReplyRate <= 0) return false;
  if (intent !== "simple_acknowledgement") return false;
  return Math.random() < settings.selectiveReplyRate;
}
