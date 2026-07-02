// Owner orders view — authenticated, account-scoped.
// Returns full order list + aggregate stats (count, revenue, new-last-24h).
import { Elysia } from "elysia";
import { listOrders, orderStats } from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

export const ordersRoute = new Elysia()
  .use(authPlugin)
  .get(
    "/api/ig/orders",
    async ({ auth, set }) => {
      if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
      const [orders, stats] = await Promise.all([
        listOrders(auth.accountId),
        orderStats(auth.accountId),
      ]);
      return { orders, stats };
    },
    { auth: true },
  );
