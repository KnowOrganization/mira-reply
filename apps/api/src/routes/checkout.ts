// Razorpay checkout endpoints — public (no authPlugin), slug-scoped.
// Proxied by the existing /api/store/:path* Next.js rewrite, so no new rewrite
// needed. Slug resolution + 404 pattern copied from routes/store.ts.
import { Elysia } from "elysia";
import crypto from "node:crypto";
import {
  getAccountByStorefrontSlug, getSettings,
  computeCartTotal, createOrder, attachRazorpayOrder, markOrderPaid, getOrderPublic,
} from "@shaiz/db";
import { razorpay } from "../lib/razorpay";

// StorefrontSettings may not yet define storefrontCheckoutEnabled (B workstream
// adds it). We read it from the raw settings object with a safe cast so this
// route works before and after B lands — no type coupling required.
type SettingsLike = { storefrontCheckoutEnabled?: boolean };

type ShippingInput = {
  name?: string; line1?: string; line2?: string;
  city?: string; state?: string; postalCode?: string; country?: string;
};

export const checkoutRoute = new Elysia()
  // ── POST /api/store/:slug/checkout/order ─────────────────────────────────
  // Server computes the cart total from DB — client never dictates the amount.
  // Returns the Razorpay order id + publishable key for the browser SDK.
  .post("/api/store/:slug/checkout/order", async ({ params, body, set }) => {
    const slug = (params.slug || "").trim();
    if (!slug) { set.status = 404; return { error: "not found" }; }

    const accountId = await getAccountByStorefrontSlug(slug);
    if (!accountId) { set.status = 404; return { error: "not found" }; }

    const settings = (await getSettings(accountId)) as SettingsLike | null;
    if (!settings?.storefrontCheckoutEnabled) {
      set.status = 403;
      return { error: "checkout not enabled for this store" };
    }

    const b = (body ?? {}) as {
      items?: { productId: string; qty: number; variantId?: string }[];
      email?: string;
      shipping?: ShippingInput;
    };

    const cart = await computeCartTotal(accountId, b.items ?? []);
    if (!cart.lineItems.length || cart.amountTotal <= 0) {
      set.status = 400;
      return { error: "no sellable items in cart" };
    }

    // Persist order (status=pending) before calling Razorpay so we always have
    // a record even if the Razorpay API call fails.
    const order = await createOrder(accountId, {
      currency: cart.currency,
      amountTotal: cart.amountTotal,
      email: b.email,
      shipping: b.shipping ?? null,
      items: cart.lineItems,
    });

    // Create Razorpay order — amount in paise (minor units), currency from cart.
    // receipt = our orderId so Razorpay dashboard shows it. notes carried into
    // the webhook payload so we can resolve order without a DB lookup on
    // razorpay_order_id (belt-and-suspenders; we do look up by rzp_order_id too).
    const rzp = await razorpay.orders.create({
      amount: cart.amountTotal,
      currency: cart.currency,
      receipt: order.id,
      notes: { orderId: order.id, accountId } as Record<string, string>,
    });

    await attachRazorpayOrder(order.id, rzp.id);

    return {
      razorpayOrderId: rzp.id,
      keyId: process.env.RAZORPAY_KEY_ID!,
      amount: cart.amountTotal,
      currency: cart.currency,
      orderId: order.id,
    };
  })

  // ── POST /api/store/:slug/checkout/verify ─────────────────────────────────
  // Client-side success path: browser calls this after Razorpay handler fires.
  // HMAC-SHA256(`${order_id}|${payment_id}`, RAZORPAY_KEY_SECRET) verified with
  // timing-safe compare (pattern from routes/webhook.ts verifySignature).
  // Idempotent via markOrderPaid's status<>'paid' guard.
  .post("/api/store/:slug/checkout/verify", async ({ params, body, set }) => {
    const slug = (params.slug || "").trim();
    if (!slug) { set.status = 404; return { error: "not found" }; }

    const accountId = await getAccountByStorefrontSlug(slug);
    if (!accountId) { set.status = 404; return { error: "not found" }; }

    const b = (body ?? {}) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };
    if (!b.razorpay_order_id || !b.razorpay_payment_id || !b.razorpay_signature) {
      set.status = 400;
      return { error: "missing required fields" };
    }

    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`)
      .digest("hex");

    const sigBuf = Buffer.from(b.razorpay_signature);
    const expBuf = Buffer.from(expected);
    // timingSafeEqual throws on length mismatch (mirrors webhook.ts pattern).
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      set.status = 400;
      return { error: "invalid signature" };
    }

    await markOrderPaid(b.razorpay_order_id, { paymentId: b.razorpay_payment_id });

    return { status: "paid" };
  })

  // ── GET /api/store/:slug/order/:id ────────────────────────────────────────
  // Success-page status poll — no PII, returns only {status,amountTotal,currency}.
  // Scoped to accountId so order ids can't be enumerated across stores.
  .get("/api/store/:slug/order/:id", async ({ params, set }) => {
    const slug = (params.slug || "").trim();
    const id = (params.id || "").trim();
    if (!slug || !id) { set.status = 404; return { error: "not found" }; }

    const accountId = await getAccountByStorefrontSlug(slug);
    if (!accountId) { set.status = 404; return { error: "not found" }; }

    const order = await getOrderPublic(accountId, id);
    if (!order) { set.status = 404; return { error: "not found" }; }

    return order;
  });
