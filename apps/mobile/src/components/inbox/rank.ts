import type { CrmConversationListItem } from '../../api/hooks';

// The queue IS the product: closing windows dominate, then things needing a
// decision (draft/disambiguation), then money, then unanswered. A conversation
// whose windows are both dead with no draft can't be acted on — sink it.

function bestWindow(c: CrmConversationListItem): number {
  return Math.max(c.window_expires_at ?? 0, c.human_agent_window_expires_at ?? 0);
}

export function needsYou(c: CrmConversationListItem): boolean {
  const windowOpen = bestWindow(c) > Date.now();
  return !!c.ai_draft || !!c.pending_slot || (c.last_direction === 'in' && windowOpen);
}

export function rankScore(c: CrmConversationListItem, now = Date.now()): number {
  const w = bestWindow(c);
  const windowOpen = w > now;
  const msLeft = w - now;
  let score = 0;
  if (windowOpen && msLeft < 2 * 3_600_000) score += 1000 - msLeft / 3_600_000; // closing soon dominates
  if (c.ai_draft) score += 500;
  if (c.pending_slot) score += 450;
  if (c.lead_status === 'hot' || c.lead_status === 'qualified' || c.lead_status === 'opportunity') score += 200;
  if (c.last_direction === 'in') score += 100;
  if (w > 0 && !windowOpen && !c.ai_draft) score -= 5000; // dead thread — nothing actionable
  return score;
}

export function sortNeedsYou(list: CrmConversationListItem[]): CrmConversationListItem[] {
  return [...list].sort((a, b) => rankScore(b) - rankScore(a) || b.updated_at - a.updated_at);
}
