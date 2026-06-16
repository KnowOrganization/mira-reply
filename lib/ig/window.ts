// Messaging-window engine (spec §2.6 / §3.10) — pure logic, no I/O.
// Source of truth for WHEN a send is compliant:
//   • standard 24h window: opens on a user's inbound message, RESETS on every
//     new user message, closes 24h after the last one.
//   • human-agent 7-day window: 7d after the user's last message, valid ONLY
//     for messages a human actually sends — never tag automated sends.
//   • private replies: one per comment, within 7 days of the comment, and they
//     do NOT open the 24h window (only inbound user messages do — the single
//     mutator here is onUserMessage).
//   • outside all windows: only opted-in Marketing Messages.
// Conversation rows persist windowExpiresAt / humanAgentWindowExpiresAt
// (packages/db schema §4); this module computes and gates against them.

export const STANDARD_WINDOW_MS = 24 * 3600_000;
export const HUMAN_AGENT_WINDOW_MS = 7 * 24 * 3600_000;
export const PRIVATE_REPLY_WINDOW_MS = 7 * 24 * 3600_000;

export type WindowState = {
  /** ts of the user's last inbound message; null = user never messaged */
  lastUserMessageAt: number | null;
};

export type SendKind = "standard" | "human_agent" | "private_reply" | "marketing";

export type SendContext = {
  sentBy: "ai" | "human" | "system";
  /** private_reply: when the comment was created */
  commentCreatedAt?: number;
  /** private_reply: a reply was already sent for this comment (hard 1-per-comment) */
  privateReplyAlreadySent?: boolean;
  /** marketing: contact has a stored opt-in for the topic */
  hasOptIn?: boolean;
};

export type SendDecision = { allowed: boolean; reason: string };

export function windowExpiresAt(state: WindowState): number | null {
  return state.lastUserMessageAt == null ? null : state.lastUserMessageAt + STANDARD_WINDOW_MS;
}

export function humanAgentExpiresAt(state: WindowState): number | null {
  return state.lastUserMessageAt == null ? null : state.lastUserMessageAt + HUMAN_AGENT_WINDOW_MS;
}

/** The ONLY thing that opens/resets windows: an inbound user message. */
export function onUserMessage(state: WindowState, ts: number): WindowState {
  // out-of-order webhook delivery: never move the window backwards
  if (state.lastUserMessageAt != null && ts <= state.lastUserMessageAt) return state;
  return { lastUserMessageAt: ts };
}

export function isStandardOpen(state: WindowState, now: number): boolean {
  const exp = windowExpiresAt(state);
  return exp != null && now < exp;
}

export function isHumanAgentOpen(state: WindowState, now: number): boolean {
  const exp = humanAgentExpiresAt(state);
  return exp != null && now < exp;
}

export function canSend(
  kind: SendKind,
  state: WindowState,
  ctx: SendContext,
  now: number
): SendDecision {
  switch (kind) {
    case "standard": {
      if (!isStandardOpen(state, now)) {
        return { allowed: false, reason: "standard 24h window closed (no inbound user message in the last 24h)" };
      }
      return { allowed: true, reason: "standard window open" };
    }

    case "human_agent": {
      // policy hard line: the tag is for human-sent messages ONLY — an
      // automated send must never be granted the 7-day window.
      if (ctx.sentBy !== "human") {
        return { allowed: false, reason: "HUMAN_AGENT tag is human-sent only — automated sends are prohibited" };
      }
      if (!isHumanAgentOpen(state, now)) {
        return { allowed: false, reason: "human-agent 7-day window closed" };
      }
      return { allowed: true, reason: "human-agent window open (human sender)" };
    }

    case "private_reply": {
      if (ctx.commentCreatedAt == null) {
        return { allowed: false, reason: "private reply requires the source comment timestamp" };
      }
      if (ctx.privateReplyAlreadySent) {
        return { allowed: false, reason: "private reply already sent for this comment (limit: 1 per comment)" };
      }
      if (now >= ctx.commentCreatedAt + PRIVATE_REPLY_WINDOW_MS) {
        return { allowed: false, reason: "private-reply window closed (comment older than 7 days)" };
      }
      return { allowed: true, reason: "private reply within 7 days of comment" };
    }

    case "marketing": {
      if (!ctx.hasOptIn) {
        return { allowed: false, reason: "marketing message requires a stored opt-in" };
      }
      return { allowed: true, reason: "opted-in marketing message (window-independent)" };
    }
  }
}
