import { NextResponse } from "next/server";
import { readStore } from "@/lib/ig/store";
import { tick } from "@/lib/ig/watcher";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";

  // refresh pulls live from Instagram — capped at 25s so it can never hang
  // the response. Cached rows are returned regardless.
  let live: { ok: boolean; newCount: number; error?: string } | null = null;
  if (refresh) {
    const r = (await Promise.race([
      tick(),
      new Promise((res) =>
        setTimeout(() => res({ newCount: 0, error: "timed out" }), 25_000)
      ),
    ])) as { newCount: number; error?: string };
    live = { ok: !r.error, newCount: r.newCount ?? 0, error: r.error };
  }

  const store = await readStore();
  if (!store.account) return NextResponse.json({ error: "not connected" }, { status: 400 });

  // Instagram returns an inconsistent from.id for the owner's own comments —
  // match on username too so the owner's replies are reliably flagged.
  const ownName = store.account.username.toLowerCase();
  const ownId = store.account.igUserId;

  const rows = store.commentsCache.map((c) => {
    const draft = store.pendingDrafts.find((d) => d.threadOrMediaId === c.id);
    // exact join by comment id — never by text (two people saying "Hi" must
    // not share a reply). Old logs with no commentId fall back to text + user.
    const log = store.history.find(
      (h) =>
        h.kind === "comment" &&
        (h.status === "sent" || h.status === "skipped") &&
        (h.commentId
          ? h.commentId === c.id
          : h.inbound === c.text && h.toUserId === c.fromUserId)
    );
    const clar = store.clarifications.find(
      (x) => x.commentText === c.text && x.fromUserId === c.fromUserId && x.status === "open"
    );
    const status: "replied" | "skipped" | "pending" | "needs_info" | "none" =
      log?.status === "sent"
        ? "replied"
        : log?.status === "skipped"
        ? "skipped"
        : clar
        ? "needs_info"
        : draft
        ? "pending"
        : "none";
    const isOwn =
      c.isOwn ||
      c.fromUserId === ownId ||
      (!!c.fromUsername && c.fromUsername.toLowerCase() === ownName);
    return {
      ...c,
      isOwn,
      status,
      skipReason: log?.status === "skipped" ? log.reason : undefined,
      draftText: draft?.draftText,
      ownReply:
        log?.status === "sent"
          ? { text: log.outbound, ts: log.sentAt }
          : undefined,
      isSuperfan: (store.commenters[c.fromUserId]?.commentCount ?? 0) >= 4,
    };
  });

  return NextResponse.json({ rows, count: rows.length, live });
}
