// Guard: evaluates an inbound comment against the account's moderation rules
// (auto-flag categories + keyword blocklist) and crisis kill-switch, logging
// a decision the owner reviews in the Flagged queue.
//
// HOOK POINT: not yet wired into the live comment ingest pipeline
// (lib/ig/ingest.ts) — call `evaluateComment` there per inbound comment to
// auto-flag at ingest time. Today this is invoked directly by the Guard route
// for manual flagging and is ready to be wired in without changing its shape.
import { listModerationRules, getCrisisMode, insertModerationLog, type ModLogEntryApi } from "@shaiz/db";

export type IncomingComment = {
  commentId: string;
  text: string;
  fromUserId: string;
  fromUsername?: string | null;
};

/** Crisis mode armed → every new comment is flagged, no rule matching needed. */
export async function evaluateComment(accountId: string, c: IncomingComment): Promise<ModLogEntryApi | null> {
  const crisis = await getCrisisMode(accountId);
  if (crisis) {
    return insertModerationLog(accountId, {
      commentId: c.commentId, text: c.text, fromUserId: c.fromUserId, fromUsername: c.fromUsername,
      ruleType: "crisis", action: "flag",
    });
  }

  const rules = await listModerationRules(accountId, true);
  for (const rule of rules) {
    if (rule.type === "keyword" && rule.pattern) {
      const re = new RegExp(rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (re.test(c.text)) {
        return insertModerationLog(accountId, {
          commentId: c.commentId, text: c.text, fromUserId: c.fromUserId, fromUsername: c.fromUsername,
          ruleType: rule.pattern, action: rule.action,
        });
      }
    }
    // category rules (spam/scam/hate/nsfw/...) need a classifier — deferred;
    // keyword rules cover the v1 Guard surface end to end.
  }
  return null;
}
