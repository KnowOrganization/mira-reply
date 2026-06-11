// Automation graph contracts — canonical source, shared by the web canvas
// (components/AutomationsView) and the backend engine (lib/ig/store, automation,
// graph). lib/ig/store.ts re-exports these so existing `@/lib/ig/store` imports
// keep resolving. TYPES ONLY — no runtime code.

export type AutomationTriggerType = "comment_post" | "dm" | "live_comment" | "story_reply";

export type AutomationTrigger = {
  type: AutomationTriggerType;
  keywords?: string[]; // empty = match all
  postIds?: string[]; // empty = all posts
};

export type AutomationNodeType =
  | "trigger"
  | "post_filter"
  | "opening_message"
  | "text_message"
  | "card_message"
  | "image_message"
  | "ask_follow"
  | "follow_gate"
  | "lead_form"
  | "followup_message";

export type AutomationFollowPending = {
  automationId: string;
  commentId: string;
  fromUserId: string;
  fromUsername?: string;
  remainingNodeIds: string[];
  ts: number;
};

export type AutomationButtonPending = {
  automationId: string;
  commentId: string;
  fromUserId: string;
  fromUsername?: string;
  remainingNodeIds: string[]; // nodes after the button-gated message
  ts: number;
};

export type AutomationRetryPending = {
  automationId: string;
  commentId: string;
  fromUserId: string;
  fromUsername?: string;
  postId?: string;
  remainingNodeIds: string[]; // nodes still to run (current node included) when rate-limited
  notBefore: number; // don't retry before this ts (backoff)
  attempts: number;
  ts: number;
};

export type AutomationNodeData = {
  text?: string;
  buttons?: { label: string; payload: string }[];
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  delayMinutes?: number;
  question?: string;
  enabled?: boolean;
  postIds?: string[]; // trigger node: restrict to specific post IDs
};

export type AutomationNode = {
  id: string;
  type: AutomationNodeType;
  position: { x: number; y: number };
  data: AutomationNodeData;
};

export type AutomationEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
  stats: { triggered: number; completed: number; failed: number; lastTriggered?: number };
  createdAt: number;
  updatedAt: number;
};
