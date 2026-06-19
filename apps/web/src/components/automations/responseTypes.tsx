"use client";

// RESPONSE_TYPES array — contains JSX icons, must live in a .tsx file

import {
  MessageSquare,
  LayoutGrid,
  Image as ImageIcon,
  UserPlus,
  ClipboardList,
  Clock,
  Reply,
} from "lucide-react";
import type { AutomationNodeType } from "@shaiz/shared";
import type React from "react";

export const RESPONSE_TYPES: {
  type: AutomationNodeType;
  label: string;
  desc: string;
  color: string;
  icon: React.ReactElement;
  badge?: string;
}[] = [
  {
    type: "opening_message",
    label: "Opening Message",
    desc: "First DM — send before anything else",
    color: "#7c3aed",
    icon: <MessageSquare size={16} />,
  },
  {
    type: "follow_gate",
    label: "Follow Gate",
    desc: "Skip if following · ask if not · resume on follow",
    color: "#22c55e",
    icon: <UserPlus size={16} />,
    badge: "Smart",
  },
  {
    type: "text_message",
    label: "Text Message",
    desc: "Send a link, info, or any text message",
    color: "#6366f1",
    icon: <MessageSquare size={16} />,
  },
  {
    type: "card_message",
    label: "Card Message",
    desc: "Rich card with image, title and button",
    color: "#ec4899",
    icon: <LayoutGrid size={16} />,
  },
  {
    type: "image_message",
    label: "Image Message",
    desc: "Send an image via DM attachment",
    color: "#14b8a6",
    icon: <ImageIcon size={16} />,
  },
  {
    type: "ask_follow",
    label: "Ask For Follow",
    desc: "Simple follow request — always sends, no check",
    color: "#f59e0b",
    icon: <UserPlus size={16} />,
  },
  {
    type: "lead_form",
    label: "Lead Form",
    desc: "Ask user to input text (email, name, etc.)",
    color: "#a855f7",
    icon: <ClipboardList size={16} />,
  },
  {
    type: "followup_message",
    label: "Follow-up Message",
    desc: "Send a delayed follow-up after the flow",
    color: "#f97316",
    icon: <Clock size={16} />,
  },
  {
    type: "comment_reply",
    label: "Comment Reply",
    desc: "Publicly reply under the user's comment (e.g. 'Check your DMs!')",
    color: "#0ea5e9",
    icon: <Reply size={16} />,
  },
];
