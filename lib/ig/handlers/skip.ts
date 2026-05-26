// Skip handler — extracted from pipeline.ts runPipeline().
// Handles: hide comment (troll/inappropriate), log to history,
// publish SSE event, notify owner on business inquiry.

import { updateStore, type IgStore } from "../store";
import { publish } from "../bus";
import { hideComment } from "../graph";
import { type DraftInput } from "../pipeline";

export type SkipArgs = {
  reason:
    | "spam"
    | "troll"
    | "inappropriate"
    | "business_inquiry"
    | "chatter"
    | "personal_relationship"
    | "low-value"
    | "cooldown"
    | "trained-skip"
    | "own-comment"
    | "blocklist"
    | "unsafe"
    | "prefilter";
  hide?: boolean; // true = also hide from public view
  intent?: string;
};

export async function handleSkip(
  args: SkipArgs,
  input: DraftInput,
  store: IgStore
): Promise<void> {
  // Hide from public view if flagged (troll, inappropriate)
  if (args.hide && input.kind === "comment" && store.account) {
    await hideComment(
      input.threadOrMediaId,
      store.account.accessToken
    ).catch(() => {});
  }

  // Record every skip in history so the Comments feed shows decisions
  if (input.kind === "comment") {
    await updateStore((s) => ({
      ...s,
      history: [
        {
          id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          kind: "comment" as const,
          commentId: input.threadOrMediaId,
          inbound: input.text,
          outbound: "",
          intent: args.intent || "unclear",
          postId: input.postId,
          toUserId: input.fromUserId,
          sentAt: Date.now(),
          status: "skipped" as const,
          reason: args.reason,
        },
        ...s.history,
      ].slice(0, 1000),
    }));
  }

  // SSE log — business inquiry gets a warn so it surfaces to the owner
  const isBusiness = args.reason === "business_inquiry";
  publish({
    type: "log",
    level: args.hide || isBusiness ? "warn" : "info",
    msg: args.hide
      ? `Hidden ${args.reason} comment from @${input.fromUsername || input.fromUserId}`
      : isBusiness
      ? `Business / collab inquiry from @${input.fromUsername || input.fromUserId} — over to you`
      : `Skipped (${args.reason}) @${input.fromUsername || input.fromUserId}`,
    ts: Date.now(),
  });
}
