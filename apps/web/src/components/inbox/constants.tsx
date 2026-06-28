import { MessagesSquare, MessageCircle, AtSign } from "lucide-react";

export const FOLDERS = ["all", "primary", "general"] as const;

export const TABS = [
  { id: "dms", label: "DMs", icon: <MessagesSquare size={12} /> },
  { id: "comments", label: "Comments", icon: <MessageCircle size={12} /> },
  { id: "mentions", label: "Mentions", icon: <AtSign size={12} /> },
] as const;

export type InboxTab = (typeof TABS)[number]["id"];
