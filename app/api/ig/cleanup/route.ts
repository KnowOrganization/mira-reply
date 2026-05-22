import { NextResponse } from "next/server";
import { updateStore } from "@/lib/ig/store";

export const runtime = "nodejs";

// The live Instagram API has been blocked since early May, so nothing real
// entered the store after this date — anything newer is in-app test data.
const CUTOFF = Date.parse("2026-05-15T00:00:00Z");

const isTestUser = (id: string) =>
  id.startsWith("dev_") || id.startsWith("u_") || id.startsWith("fake_");

/** Purge in-app test data — injected comments, drafts, facts, fake users. */
export async function POST() {
  let removed = {
    comments: 0,
    drafts: 0,
    clarifications: 0,
    facts: 0,
    commenters: 0,
    history: 0,
  };

  await updateStore((s) => {
    const commentsCache = s.commentsCache.filter(
      (c) => !c.id.startsWith("fake_")
    );
    const pendingDrafts = s.pendingDrafts.filter(
      (d) => !d.threadOrMediaId.startsWith("fake_")
    );
    const clarifications = s.clarifications.filter(
      (c) => !(c.commentId || "").startsWith("fake_") && c.createdAt < CUTOFF
    );
    const knowledge = s.knowledge.filter((f) => f.createdAt < CUTOFF);
    const commenters = Object.fromEntries(
      Object.entries(s.commenters).filter(([k]) => !isTestUser(k))
    );
    const history = s.history.filter((h) => h.sentAt < CUTOFF);

    removed = {
      comments: s.commentsCache.length - commentsCache.length,
      drafts: s.pendingDrafts.length - pendingDrafts.length,
      clarifications: s.clarifications.length - clarifications.length,
      facts: s.knowledge.length - knowledge.length,
      commenters: Object.keys(s.commenters).length - Object.keys(commenters).length,
      history: s.history.length - history.length,
    };

    return {
      ...s,
      commentsCache,
      pendingDrafts,
      clarifications,
      knowledge,
      commenters,
      history,
      fingerprints: [],
      sendQueue: [],
      dailyStats: {},
    };
  });

  return NextResponse.json({ ok: true, removed });
}
