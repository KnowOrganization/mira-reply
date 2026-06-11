// Shared local types for the Automations feature

import type { AutomationNodeData, AutomationNodeType } from "@shaiz/shared";

export type NodeCardProps = {
  data: AutomationNodeData;
  onUpdate: (patch: Partial<AutomationNodeData>) => void;
  onDelete?: () => void;
  canDelete?: boolean;
  dragMode?: boolean;
  windowOpen?: boolean;
};

export type NodeValidation = {
  status: "available" | "blocked";
  message?: string;
};

export type PostSummary = {
  id: string;
  caption: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  timestamp: string;
  mediaType?: string;
};

export type Pos = { x: number; y: number };

export interface SGPos {
  x: number;
  y: number;
  row: number;
  xCol: number;
}
