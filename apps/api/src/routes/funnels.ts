// Funnel Studio results — giveaway entrants/winner draw, discount-code
// issuance/redemption, A/B test results. Scoped per automation (:id).
import { Elysia } from "elysia";
import {
  listFunnelEntries, drawFunnelWinner, listDiscountCodes, redeemDiscountCode, abResults,
} from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

export const funnelsRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/funnels/:id/entries", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { entries: await listFunnelEntries(auth.accountId, params.id) };
  }, { auth: true })
  .post("/api/ig/funnels/:id/draw", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const winner = await drawFunnelWinner(auth.accountId, params.id);
    if (!winner) { set.status = 400; return { error: "no eligible entries" }; }
    return { winner };
  }, { requireRole: "agent" })
  .get("/api/ig/funnels/:id/codes", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { codes: await listDiscountCodes(auth.accountId, params.id) };
  }, { auth: true })
  .post("/api/ig/funnels/:id/codes/redeem", async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const code = (body as { code?: string } | null)?.code;
    if (!code) { set.status = 400; return { error: "code required" }; }
    const ok = await redeemDiscountCode(auth.accountId, params.id, code);
    if (!ok) { set.status = 404; return { error: "invalid or already redeemed" }; }
    return { ok: true };
  }, { requireRole: "agent" })
  .get("/api/ig/funnels/:id/ab", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { results: await abResults(auth.accountId, params.id) };
  }, { auth: true });
