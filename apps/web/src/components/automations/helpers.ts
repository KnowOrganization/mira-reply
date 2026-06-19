// Pure utility functions for node validation and window-open state

import type { AutomationNode, AutomationNodeType } from "@shaiz/shared";
import type { NodeValidation } from "./types";

export function getNodeValidation(type: AutomationNodeType, nodes: AutomationNode[]): NodeValidation {
  const triggerData = nodes.find((n) => n.type === "trigger")?.data.text ?? "comment_post";
  const triggerOpensWindow = triggerData === "dm" || triggerData === "story_reply";
  const isLiveTrigger = triggerData === "live_comment";

  const hasOpeningMsg = nodes.some((n) => n.type === "opening_message" && n.data.enabled !== false);
  const hasOpeningMsgNode = nodes.some((n) => n.type === "opening_message");
  const windowOpen = hasOpeningMsg || triggerOpensWindow;

  const CONTENT: AutomationNodeType[] = ["text_message", "card_message", "image_message"];
  const contentCount = nodes.filter((n) => CONTENT.includes(n.type)).length;

  switch (type) {
    case "opening_message":
      if (hasOpeningMsgNode)
        return { status: "blocked", message: "Opening Message already in this flow" };
      return { status: "available" };

    case "text_message":
    case "card_message":
    case "image_message":
      if (!windowOpen && contentCount >= 1)
        return { status: "blocked", message: "Opening Message is off — only one of Text/Card/Image allowed" };
      return { status: "available" };

    case "ask_follow":
      if (nodes.some((n) => n.type === "ask_follow"))
        return { status: "blocked", message: "Ask For Follow already in this flow" };
      if (!windowOpen)
        return { status: "blocked", message: "Requires Opening Message (or DM/Story trigger)" };
      return { status: "available" };

    case "follow_gate":
      if (nodes.some((n) => n.type === "follow_gate"))
        return { status: "blocked", message: "Follow Gate already in this flow" };
      return { status: "available" };

    case "lead_form":
      if (nodes.some((n) => n.type === "lead_form"))
        return { status: "blocked", message: "Lead Form already in this flow" };
      return { status: "available" };

    case "followup_message":
      if (nodes.some((n) => n.type === "followup_message"))
        return { status: "blocked", message: "Follow-up Message already in this flow" };
      if (isLiveTrigger)
        return { status: "blocked", message: "Not available for Live comment triggers" };
      if (!windowOpen)
        return { status: "blocked", message: "Requires Opening Message to be enabled" };
      return { status: "available" };

    case "comment_reply": {
      // Public reply under the comment — only meaningful for comment triggers,
      // unique per flow. Not a DM-window content node (excluded from CONTENT).
      if (nodes.some((n) => n.type === "comment_reply"))
        return { status: "blocked", message: "Comment Reply already in this flow" };
      const isCommentTrigger = triggerData === "comment_post" || triggerData === "live_comment";
      if (!isCommentTrigger)
        return { status: "blocked", message: "Only for comment triggers (post/reel or Live)" };
      return { status: "available" };
    }

    default:
      return { status: "available" };
  }
}

export function computeWindowOpen(nodes: AutomationNode[]): boolean {
  const triggerData = nodes.find((n) => n.type === "trigger")?.data.text ?? "comment_post";
  const triggerOpensWindow = triggerData === "dm" || triggerData === "story_reply";
  const hasOpeningMsg = nodes.some((n) => n.type === "opening_message" && n.data.enabled !== false);
  return hasOpeningMsg || triggerOpensWindow;
}
