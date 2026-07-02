// Razorpay webhook receiver — dumb, fast, idempotent. Pattern copied from
// routes/webhook.ts: raw-body HMAC verify → business logic → always 200.
// Razorpay points directly at this API URL (not via Next.js rewrite).
// Rate-limit skip list in index.ts includes /api/razorpay/webhook.
import { Elysia } from "elysia";
import crypto from "node:crypto";
import { markOrderPaid, markOrderFailed } from "@shaiz/db";

/** Verify X-Razorpay-Signature = HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET).
 *  Returns false if the secret is missing — fail open (log + 200) rather than
 *  crash, since returning 4xx causes Razorpay to retry indefinitely. */
function verifyRazorpaySignature(raw: string, sigHeader: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!sigHeader || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(sigHeader);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch — guard it.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

type RzpPaymentEntity = {
  id?: string;        // payment_id
  order_id?: string;  // our razorpayOrderId
  email?: string;
  contact?: string;
};
type RzpWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: RzpPaymentEntity };
  };
};

export const razorpayWebhookRoute = new Elysia()
  .post(
    "/api/razorpay/webhook",
    async ({ body, request }) => {
      // Always return 200 — Razorpay retries on any non-2xx, which is noisy and
      // unhelpful for signature errors (misconfiguration) or parse errors.
      const raw = typeof body === "string" ? body : JSON.stringify(body ?? "");

      if (!verifyRazorpaySignature(raw, request.headers.get("x-razorpay-signature"))) {
        console.warn("[razorpay-webhook] signature mismatch — check RAZORPAY_WEBHOOK_SECRET");
        return { ok: false, reason: "signature" };
      }

      let payload: RzpWebhookPayload;
      try {
        payload = JSON.parse(raw) as RzpWebhookPayload;
      } catch {
        console.warn("[razorpay-webhook] bad JSON");
        return { ok: false, reason: "json" };
      }

      const event = payload?.event;
      const entity = payload?.payload?.payment?.entity;
      const rzpOrderId = entity?.order_id;
      const paymentId = entity?.id;

      if (!rzpOrderId) return { ok: true }; // non-payment event — ignore silently

      if (event === "payment.captured") {
        if (!paymentId) { console.warn("[razorpay-webhook] payment.captured missing payment id"); return { ok: false }; }
        await markOrderPaid(rzpOrderId, { paymentId, email: entity?.email });
      } else if (event === "payment.failed") {
        await markOrderFailed(rzpOrderId);
      }
      // All other events are acknowledged with 200 and ignored.

      return { ok: true };
    },
    { parse: "text" }, // raw body required for HMAC verification
  );
