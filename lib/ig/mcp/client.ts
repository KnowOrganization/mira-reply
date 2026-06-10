// Typed client over the brain MCP. Pipeline code imports from here instead
// of brain.ts directly, so the day we move brain to a subprocess/stdio
// transport, no caller changes.

import {
  accountInfo,
  brainBundle,
  commenterProfile,
  dispatch,
  invalidateAll,
  kbSearch,
  postGet,
  postRecent,
  threadContext,
  trainingSimilar,
  warm,
  type AccountInfo,
  type CommenterProfile,
  type KbHit,
  type PostBrief,
  type ThreadContext,
  type ToolCall,
  type TrainingHit,
} from "./brain";
import { BRAIN_TOOLS, type ToolSchema } from "./brain-schema";
import { stats as brainStats, type ToolStats } from "./brain-metrics";

export type {
  AccountInfo,
  CommenterProfile,
  KbHit,
  PostBrief,
  ThreadContext,
  ToolCall,
  ToolStats,
  TrainingHit,
};

export const brain = {
  warm,
  invalidateAll,

  // typed direct accessors
  accountInfo: (): Promise<AccountInfo | null> => accountInfo(),
  postGet: (id: string): Promise<PostBrief | null> => postGet(id),
  postRecent: (n = 10): Promise<PostBrief[]> => postRecent(n),
  kbSearch: (
    query: string,
    k = 8,
    scope: "account" | "post" | "any" = "any",
    postId?: string
  ): Promise<KbHit[]> => kbSearch(query, k, scope, postId),
  commenterProfile: (igUserId: string): Promise<CommenterProfile | null> =>
    commenterProfile(igUserId),
  threadContext: (commentId: string): Promise<ThreadContext | null> =>
    threadContext(commentId),
  trainingSimilar: (text: string, k = 3): Promise<TrainingHit[]> =>
    trainingSimilar(text, k),
  bundle: (needs: ToolCall[]): Promise<Record<string, unknown>[]> =>
    brainBundle(needs),
  stats: (): ToolStats[] => brainStats(),

  // generic dispatch — same shape an LLM tool_use would invoke
  call: (toolCall: ToolCall): Promise<Record<string, unknown>> =>
    dispatch(toolCall),

  // schema for LLM tool_use parameter
  tools: (): ToolSchema[] => BRAIN_TOOLS,
};
