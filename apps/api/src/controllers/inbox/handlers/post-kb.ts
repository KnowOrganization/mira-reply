import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { addKb } from "../../../services/inbox-service";

export const postKbHandler = new Elysia().use(authPlugin).post(
  "/api/ig/kb",
  async ({ body, auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { question?: string; answer?: string; tags?: string[] };
    const result = await addKb(b);
    if ("validationError" in result) {
      set.status = 400;
      return { error: result.validationError };
    }
    return result;
  },
  { requireRole: "agent" }
);
