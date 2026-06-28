// Lightweight inbox comment row. NOTE: intentionally separate from the heavier
// components/comments/types.ts CommentRow (drafting workspace) — different fields
// (ts vs timestamp, draftId, skipReason). Do not merge.
export type CommentRow = {
  id: string; postId: string; postCaption: string; postThumb?: string; postPermalink?: string;
  text: string; fromUserId: string; fromUsername: string; ts: number; isOwn: boolean;
  status: "replied" | "skipped" | "pending" | "needs_info" | "none";
  skipReason?: string; draftText?: string; draftId?: string;
  ownReply?: { text: string; ts: number }; isSuperfan?: boolean;
};
