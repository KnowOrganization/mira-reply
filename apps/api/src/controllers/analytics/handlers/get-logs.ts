import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getLogs } from "../../../services/analytics-service";

export const getLogsHandler = new Elysia().use(authPlugin).get(
  "/api/ig/logs",
  async ({ auth, query, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const limit = Math.min(parseInt((query.limit as string) ?? "200", 10), 1000);
    return getLogs(limit);
  },
  { auth: true }
);
