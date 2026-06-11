import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { postBrain, type BrainBody } from "../../../services/analytics-service";

export const postBrainHandler = new Elysia().post(
  "/api/ig/brain",
  async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as BrainBody;
    try {
      return await postBrain(b);
    } catch (e) {
      const err = e as { status?: number; error?: string };
      if (err.status) { set.status = err.status; return { error: err.error }; }
      throw e;
    }
  }
);
