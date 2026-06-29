export type MentionRow = {
  id: string; kind: "caption" | "comment" | "tag"; mediaId: string;
  permalink?: string; thumbnailUrl?: string; mediaCaption?: string;
  commentText?: string; fromUsername?: string; mediaType?: string;
  likeCount?: number; commentsCount?: number; ts: number; read: boolean;
};

export const KIND_LABEL: Record<MentionRow["kind"], { label: string; color: string }> = {
  tag: { label: "tagged you", color: "#a855f7" },
  caption: { label: "caption mention", color: "#0095f6" },
  comment: { label: "comment mention", color: "#22c55e" },
};
