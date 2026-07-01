// Link Vault — strictly per-post. A link attached to a post serves every
// comment on THAT post still waiting on a link. No cross-post leak, no loop.

import { readStore, updateStore } from "./store";
import { reprocessClarification } from "./pipeline";
import { publish } from "./bus";

/**
 * A link just became available for a post — serve every comment on that post
 * still waiting on one. Bounded to that post's open link-clarifications.
 */
export async function serveLinkForPost(postId: string): Promise<number> {
  if (!postId) return 0;
  const s = await readStore();
  const waiting = s.clarifications.filter(
    (c) => c.status === "open" && c.kind === "link" && c.postId === postId
  );
  if (!waiting.length) return 0;

  for (const c of waiting) {
    await updateStore((st) => ({
      ...st,
      clarifications: st.clarifications.map((x) =>
        x.id === c.id ? { ...x, status: "answered" as const } : x
      ),
    }));
    // re-run the comment + everyone queued behind it — link_request now finds
    // the post's attached link
    await reprocessClarification(s.account?.igUserId ?? "", c);
  }

  publish({
    type: "log",
    level: "info",
    msg: `Link attached — served ${waiting.length} waiting comment${
      waiting.length === 1 ? "" : "s"
    } on the post`,
    ts: Date.now(),
  });
  return waiting.length;
}
