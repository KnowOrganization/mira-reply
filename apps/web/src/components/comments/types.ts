// ── shared types for the Comments feature ────────────────────────────────

export type CommentRow = {
  id: string;
  postId: string;
  postCaption: string;
  postThumb?: string;
  postPermalink?: string;
  text: string;
  fromUserId: string;
  fromUsername: string;
  timestamp: string;
  ts: number;
  isOwn: boolean;
  status: "replied" | "pending" | "needs_info" | "skipped" | "none";
  draftText?: string;
  ownReply?: { text: string; ts: number };
  isSuperfan?: boolean;
};

export type PendingDraft = {
  id: string;
  kind: "comment" | "dm";
  threadOrMediaId: string;
  fromUserId: string;
  fromUsername?: string;
  inboundText: string;
  draftText: string;
  intent: string;
  postId?: string;
  createdAt: number;
};

export type Clarification = {
  id: string;
  postId: string;
  commentText: string;
  question: string;
  kind?: "context" | "link";
  fromUserId: string;
  fromUsername?: string;
  status: "open" | "answered" | "skipped";
  createdAt: number;
};

export type Status = {
  configured: boolean;
  connected: boolean;
  account: { username: string } | null;
  replyMode: ReplyMode;
};

export type ReplyMode = "shadow" | "assisted" | "balanced" | "auto";

export type ItemState = "needs_you" | "draft" | "replied" | "open" | "mine";

export type Item = {
  key: string;
  ts: number;
  state: ItemState;
  commentId?: string;
  text: string;
  fromUserId: string;
  fromUsername: string;
  isOwn: boolean;
  postId: string;
  postCaption: string;
  postThumb?: string;
  postPermalink?: string;
  intent?: string;
  isSuperfan?: boolean;
  draft?: PendingDraft;
  clar?: Clarification;
  ownReply?: { text: string; ts: number };
};

export type Tab = "all" | "needs_you" | "draft" | "replied";

export type PostLink = {
  id: string;
  label: string;
  url: string;
  type: "location" | "song" | "gear" | "shop" | "other";
};

export const LINK_TYPES: PostLink["type"][] = ["gear", "location", "song", "shop", "other"];

export type Digest = {
  inbox: number;
  repliedAuto: number;
  pending: number;
  needsInput: number;
};

export const MODES: { id: ReplyMode; hint: string }[] = [
  { id: "shadow", hint: "Draft only — never sends" },
  { id: "assisted", hint: "You approve every reply" },
  { id: "balanced", hint: "Auto acks + confident answers, queue the rest" },
  { id: "auto", hint: "Sends everything within safety limits" },
];

export type PostGroup = {
  postId: string;
  caption: string;
  thumb?: string;
  permalink?: string;
  items: Item[];
  latest: number;
};

export type FeedEntry = { id: string; ts: number; who: string; text: string };
