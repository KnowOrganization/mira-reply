// ── shared types for the Workspace component tree ────────────────────────

export type Draft = {
  id: string;
  kind: string;
  threadOrMediaId: string;
  fromUserId: string;
  fromUsername?: string;
  inboundText: string;
  draftText: string;
  intent: string;
  postId?: string;
  createdAt: number;
};

export type Clar = {
  id: string;
  commentId?: string;
  postId: string;
  commentText: string;
  question: string;
  kind?: "context" | "link";
  fromUserId: string;
  fromUsername?: string;
  createdAt: number;
};

export type Log = {
  id: string;
  inbound: string;
  outbound: string;
  intent: string;
  postId?: string;
  toUserId: string;
  sentAt: number;
  status: string;
};

export type Row = {
  id: string;
  postId: string;
  postCaption: string;
  postThumb?: string;
  postPermalink?: string;
  text: string;
  fromUserId: string;
  fromUsername?: string;
  ts: number;
  timestamp: string;
  isOwn?: boolean;
  status?: "replied" | "skipped" | "pending" | "needs_info" | "none";
  skipReason?: string;
  draftText?: string;
  ownReply?: { text: string; ts: number };
  isSuperfan?: boolean;
};

export type PostLink = {
  id: string;
  label: string;
  url: string;
  type: "location" | "song" | "gear" | "shop" | "other";
};

export type Insights = {
  likes?: number;
  comments?: number;
  reach?: number;
  saved?: number;
  shares?: number;
  plays?: number;
  totalInteractions?: number;
  fetchedAt: number;
};

export type Post = {
  id: string;
  caption: string;
  mediaType: string;
  permalink?: string;
  thumbnailUrl?: string;
  timestamp: string;
  notes: string;
  qa: { q: string; a: string; ts: number }[];
  links: PostLink[];
  insights?: Insights;
  updatedAt: number;
};

export type QItem =
  | { type: "draft"; id: string; at: number; draft: Draft }
  | { type: "clar"; id: string; at: number; clar: Clar };

export type Mention = {
  id: string;
  kind: "caption" | "comment" | "tag";
  mediaId: string;
  permalink?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  commentId?: string;
  commentText?: string;
  fromUserId?: string;
  fromUsername?: string;
  mediaType?: string;
  likeCount?: number;
  commentsCount?: number;
  ts: number;
  seenAt: number;
  read: boolean;
};

export type PostInfoT = {
  caption: string;
  thumb?: string;
  permalink?: string;
  comments: number;
};

export type DashResp = {
  today?: { comments?: number; autoReplied?: number };
  knowledge?: { top?: { q?: string } };
  themes?: Record<string, number>;
};

export type BrainStats = {
  stats: { tool: string; count: number; errorRate: number; p50: number; p95: number; open: boolean }[];
  tools: { name: string; description: string }[];
};
