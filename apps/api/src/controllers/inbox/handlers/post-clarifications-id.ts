import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { actOnClarification } from "../../../services/inbox-service";

export const postClarificationsIdHandler = new Elysia().use(authPlugin).post(
  "/api/ig/clarifications/:id",
  async ({ params, body, auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { action: "answer" | "skip"; answer?: string };
    const result = await actOnClarification(auth.accountId, params.id, b);
    if ("notFound" in result) { set.status = 404; return { error: "not found" }; }
    if ("badAction" in result) { set.status = 400; return { error: "bad action" }; }
    return { ok: true };
  },
  { auth: true }
);
