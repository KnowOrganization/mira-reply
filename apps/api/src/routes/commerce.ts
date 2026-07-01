// Social Commerce — back-in-stock waitlist. Customers DM interest in a
// sold-out product; the owner taps "Notify" to DM everyone waiting once it's
// available again (one-time best-effort fan-out — failures don't block).
import { Elysia } from "elysia";
import { interestCounts, listUnnotifiedInterest, markInterestNotified, getAccessToken, getProduct } from "@shaiz/db";
import { sendDM } from "../../../../lib/ig/graph";
import { authPlugin } from "../plugins/auth";

export const commerceRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/commerce/interest", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { counts: await interestCounts(auth.accountId) };
  }, { auth: true })
  .post("/api/ig/products/:id/notify-restock", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const product = await getProduct(auth.accountId, params.id);
    if (!product) { set.status = 404; return { error: "not found" }; }
    const token = await getAccessToken(auth.accountId);
    if (!token) { set.status = 400; return { error: "not connected" }; }
    const waiting = await listUnnotifiedInterest(auth.accountId, params.id);
    let sent = 0;
    for (const w of waiting) {
      try {
        await sendDM(auth.accountId, w.igsid, `${product.title} is back in stock! 🎉`, token);
        sent++;
      } catch {
        // best-effort fan-out — one failed DM doesn't block the rest
      }
    }
    await markInterestNotified(auth.accountId, params.id);
    return { ok: true, attempted: waiting.length, sent };
  }, { requireRole: "agent" });
