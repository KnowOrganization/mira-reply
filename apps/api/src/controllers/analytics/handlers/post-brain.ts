import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { postBrain, type BrainBody } from "../../../services/analytics-service";

export const postBrainHandler = new Elysia().use(authPlugin).post(
  "/api/ig/brain",
  async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as BrainBody;
    try {
      return await postBrain(b);
    } catch (e) {
      const err = e as { status?: number; error?: string };
      if (err.status) { set.status = err.status; return { error: err.error }; }
      throw e;
    }
  },
  { requireRole: "agent" }
);
