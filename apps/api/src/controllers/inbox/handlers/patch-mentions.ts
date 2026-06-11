import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { patchMentions } from "../../../services/inbox-service";

export const patchMentionsHandler = new Elysia().use(authPlugin).patch(
  "/api/ig/mentions",
  async ({ body, auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { id?: string; read?: boolean; all?: boolean };
    await patchMentions(auth.accountId, b);
    return { ok: true };
  },
  { auth: true }
);
