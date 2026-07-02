import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { readStore } from "@/lib/ig/store";
import { assembleContext } from "@/lib/ig/ctx";
import { generateAutomationMessage } from "@/lib/ig/automationReply";
import { AiKeyMissingError } from "@/lib/ig/llm";

// Generate a suggested public reply for one cached comment — request/response
// only (no parked-draft column for comments). The client reviews the text and
// sends it via the existing POST /api/ig/comments/:id/reply. Same generator
// chain as the automation engine and DM drafts: one voice everywhere.
export const postCommentIdGenerateHandler = new Elysia().use(authPlugin).post(
  "/api/ig/comments/:id/generate",
  async ({ params, auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const store = await readStore(auth.accountId);
    if (!store.account) { set.status = 400; return { error: "not connected" }; }
    const c = store.commentsCache.find((x) => x.id === params.id);
    if (!c) { set.status = 404; return { error: "comment not found" }; }
    try {
      const ctx = await assembleContext(c.text, c.postId, c.fromUserId, store);
      const reply = await generateAutomationMessage("comment_reply", ctx, c.text);
      if (!reply.trim()) { set.status = 502; return { error: "generation produced empty text" }; }
      return { reply };
    } catch (e) {
      if (e instanceof AiKeyMissingError) { set.status = 503; return { error: e.message }; }
      set.status = 502;
      return { error: e instanceof Error ? e.message : "generation failed" };
    }
  },
  { requireRole: "agent" }
);
