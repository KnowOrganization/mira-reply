import type { CommentRow } from "./types";

export const COMMENT_FILTERS = [
  { id: "all", label: "all" },
  { id: "open", label: "needs reply" },
  { id: "replied", label: "replied" },
  { id: "skipped", label: "skipped" },
] as const;

export const STATUS_BADGE: Record<CommentRow["status"], { label: string; color: string }> = {
  replied: { label: "replied", color: "#22c55e" },
  pending: { label: "draft ready", color: "#0095f6" },
  needs_info: { label: "needs info", color: "#f59e0b" },
  skipped: { label: "skipped", color: "#64748b" },
  none: { label: "open", color: "#a855f7" },
};
