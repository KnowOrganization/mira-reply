import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { removeKb } from "../../../services/inbox-service";

export const deleteKbIdHandler = new Elysia().use(authPlugin).delete(
  "/api/ig/kb/:id",
  async ({ params, auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    await removeKb(auth.accountId, params.id);
    return { ok: true };
  },
  { requireRole: "agent" }
);
