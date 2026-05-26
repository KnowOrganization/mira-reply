// Clarification handler — extracted from pipeline.ts runPipeline().
// Opens a new clarification or deduplicates behind an existing one.
// When a question is already open, this comment is queued as a waiter
// and served the moment the owner answers.

import { updateStore, type IgStore, type Clarification } from "../store";
import { publish } from "../bus";
import { type DraftInput } from "../pipeline";

export type ClarifyArgs = {
  question: string;
  kind: "context" | "link";
  intent?: string;
};

export type ClarifyResult =
  | { outcome: "opened"; clarificationId: string }
  | { outcome: "queued_behind"; existingId: string };

export async function handleClarify(
  args: ClarifyArgs,
  input: DraftInput,
  store: IgStore
): Promise<ClarifyResult> {
  // Dedup — if Mira already has an open clarification of the same kind
  // on this post, never ask the owner twice.
  const dup = store.clarifications.find(
    (x) =>
      x.status === "open" &&
      (x.kind || "context") === args.kind &&
      x.postId === (input.postId || "")
  );

  if (dup) {
    // Queue this comment behind the existing clarification
    await updateStore((s) => ({
      ...s,
      clarifications: s.clarifications.map((x) =>
        x.id === dup.id
          ? {
              ...x,
              waiters: [
                ...(x.waiters || []),
                {
                  commentId: input.threadOrMediaId,
                  fromUserId: input.fromUserId,
                  fromUsername: input.fromUsername,
                  commentText: input.text,
                },
              ],
            }
          : x
      ),
    }));

    publish({
      type: "log",
      level: "info",
      msg: `Already asked — @${input.fromUsername || input.fromUserId} queued behind it`,
      ts: Date.now(),
    });

    return { outcome: "queued_behind", existingId: dup.id };
  }

  // Open a fresh clarification
  const c: Clarification = {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    commentId: input.threadOrMediaId,
    postId: input.postId || "",
    commentText: input.text,
    question: args.question,
    kind: args.kind,
    fromUserId: input.fromUserId,
    fromUsername: input.fromUsername,
    createdAt: Date.now(),
    status: "open",
  };

  await updateStore((s) => ({
    ...s,
    clarifications: [c, ...s.clarifications].slice(0, 200),
  }));

  publish({
    type: "log",
    level: "warn",
    msg: `Need input: ${args.question}`,
    ts: Date.now(),
  });
  publish({ type: "draft", draftId: c.id, ts: Date.now() });

  return { outcome: "opened", clarificationId: c.id };
}
