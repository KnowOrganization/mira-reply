import Razorpay from "razorpay";

// Lazy singleton — constructed on FIRST use, not at import. Razorpay's ctor
// throws if key_id/key_secret are absent; instantiating at module load would
// crash the whole API on boot before keys are configured. Deferring means the
// storefront (and everything else) runs fine until someone actually hits
// checkout, which then fails with a clear "not configured" error.
// key_id is publishable (returned to the browser as keyId); key_secret is
// server-only (signature verification).
let _instance: Razorpay | null = null;

function instance(): Razorpay {
  if (_instance) return _instance;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET",
    );
  }
  _instance = new Razorpay({ key_id, key_secret });
  return _instance;
}

// Proxy so call sites keep using `razorpay.orders.create(...)` unchanged; the
// real client is built (and validated) on first property access.
export const razorpay = new Proxy({} as Razorpay, {
  get(_t, prop) {
    const inst = instance() as unknown as Record<string | symbol, unknown>;
    const v = inst[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(inst) : v;
  },
});
