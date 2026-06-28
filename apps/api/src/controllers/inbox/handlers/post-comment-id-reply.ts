import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { replyToCommentManual } from "../../../services/inbox-service";

export const postCommentIdReplyHandler = new Elysia().use(authPlugin).post(
  "/api/ig/comments/:id/reply",
  async ({ params, body, auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const { text } = (body ?? {}) as { text?: string };
    const result = await replyToCommentManual(auth.accountId, params.id, text ?? "");
    if ("notConnected" in result) { set.status = 400; return { error: "not connected" }; }
    if ("notFound" in result) { set.status = 404; return { error: "comment not found" }; }
    if ("validationError" in result) { set.status = 400; return { error: result.validationError }; }
    if ("sendError" in result) { set.status = 400; return { error: result.sendError }; }
    return { ok: true };
  },
  { requireRole: "agent" }
);
