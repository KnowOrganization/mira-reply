import { matchAutomations, executeAutomation, type AutomationEvent } from "./automation";
import { listAutomations } from "./accountsRepo";
import { claimOnce, k } from "./redis";
import type { IgStore } from "./store";

// One ingested event = one comment/DM/postback for one account. The webhook
// (and, later, the poll fallback) enqueue these; the worker calls
// processIngestJob to do the actual match + execute, off the request path.
export type IngestJob = {
  accountId: string;
  kind: "comment" | "dm" | "postback";
  event: AutomationEvent;
};

/**
 * Process one ingested comment event: dedup atomically in Redis (per account),
 * load that account's automations from Postgres, match, and execute.
 * Multi-account-safe at the match layer; execution still uses the connected
 * account's token until dm.ts is account-parameterised (next phase).
 */
export async function processIngestJob(job: IngestJob): Promise<void> {
  const { accountId, event } = job;
  if (event.type !== "comment_post" && event.type !== "live_comment") return;

  // atomic cross-worker dedup — replaces the in-memory `seen` Set
  const claimed = await claimOnce(k.seen(accountId, event.commentId), 24 * 3600);
  if (!claimed) return;

  const automations = await listAutomations(accountId);
  if (!automations.length) return;

  const storeLike = { automations } as unknown as IgStore;
  const matched = matchAutomations(storeLike, event);
  for (const auto of matched) {
    await executeAutomation(auto, event).catch(() => {});
  }
}
