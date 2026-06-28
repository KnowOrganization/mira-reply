// GET /api/ig/insights/account — account-level IG insights (reach, impressions,
// profile views, follower count) over a day range. ?days=7 default.
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { readStore } from "@/lib/ig/store";
import { getAccountInsights } from "@/lib/ig/graph";

export const getInsightsAccountHandler = new Elysia().use(authPlugin).get(
  "/api/ig/insights/account",
  async ({ auth, query: q, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const s = await readStore(auth.accountId);
    if (!s.account?.accessToken) { set.status = 400; return { error: "not connected" }; }
    const days = Math.min(Math.max(Number(q.days) || 7, 1), 30);
    try {
      const raw = (await getAccountInsights(auth.accountId, s.account.accessToken, undefined, days)) as {
        data?: Array<{ name: string; total_value?: { value?: number }; values?: { value: number }[] }>;
      };
      const insights: Record<string, number> = {};
      for (const m of raw.data ?? []) {
        insights[m.name] = m.total_value?.value ?? m.values?.reduce((a, v) => a + (v.value || 0), 0) ?? 0;
      }
      return { insights, days };
    } catch (e) {
      set.status = 502;
      return { error: e instanceof Error ? e.message : "insights fetch failed" };
    }
  },
  { auth: true }
);
