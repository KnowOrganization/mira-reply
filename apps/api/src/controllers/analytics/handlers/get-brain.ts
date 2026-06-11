import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getBrain } from "../../../services/analytics-service";

export const getBrainHandler = new Elysia().get(
  "/api/ig/brain",
  async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return getBrain(a.ctx.accountId);
  }
);
