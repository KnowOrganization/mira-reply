import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getLogs } from "../../../services/analytics-service";

export const getLogsHandler = new Elysia().get(
  "/api/ig/logs",
  async ({ request, query, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const limit = Math.min(parseInt((query.limit as string) ?? "200", 10), 1000);
    return getLogs(limit);
  }
);
