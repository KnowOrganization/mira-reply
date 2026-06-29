import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { sendHumanReply } from "../../../services/crm-service";

export const postConversationSendHandler = new Elysia().use(authPlugin).post(
  "/api/ig/crm/conversations/:id/send",
  async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const { text } = (body ?? {}) as { text?: string };
    const result = await sendHumanReply(auth.accountId, params.id, text ?? "");
    if (!result.ok) { set.status = result.status; return { error: result.reason }; }
    return { ok: true, messageId: result.messageId, via: result.via };
  },
  { requireRole: "agent" }
);
