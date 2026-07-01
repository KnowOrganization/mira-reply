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
  | "comment_reply"
  | "ask_follow"
  | "follow_gate"
  | "lead_form"
  | "followup_message"
  // ── Funnel Studio (Phase A) ──
  | "giveaway"        // F018/F019 — capture entrant/waitlist + confirm DM (+ entry #)
  | "discount_code"   // F021 — issue a unique single-use code from a pool
  | "quiz"            // F023 — match the comment answer → a tailored reply
  | "tag_reward"      // F022 — reward when the comment tags ≥N friends
  | "ab_split"        // F094 — split commenters across message variants, measure
  | "price_reply";    // F086 — look up a product by keyword → reply price + link

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
  // ── Funnel Studio (Phase A) — all optional, persisted in the jsonb `data` bag ──
  showEntryNumber?: boolean;                      // giveaway: append "You're entry #N"
  codePool?: string[];                            // discount_code: pool of codes to hand out
  outOfCodesText?: string;                        // discount_code: message when the pool is empty
  answers?: { match: string; reply: string }[];   // quiz: keyword → tailored reply
  minTags?: number;                               // tag_reward: minimum @mentions required (default 1)
  variants?: { label: string; text: string }[];   // ab_split: 2+ message variants
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
