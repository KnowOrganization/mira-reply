"use client";
// CheckoutForm — address collection → Razorpay Checkout overlay → verify → success.
// No @razorpay npm dep; the SDK is a <script> injected once on submit.
// Server recomputes the order total in /checkout/order — client never dictates amount.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../_lib/cart";

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay global type declaration
// ─────────────────────────────────────────────────────────────────────────────

type RzpOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  handler: (response: RzpResponse) => void;
  modal?: { ondismiss?: () => void };
};

type RzpInstance = { open: () => void };

type RzpResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay: new (options: RzpOptions) => RzpInstance;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Inject https://checkout.razorpay.com/v1/checkout.js once; resolve when ready. */
function loadRazorpay(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("SSR"));
    if (window.Razorpay) return resolve();

    const existing = document.getElementById("rzp-sdk") as HTMLScriptElement | null;
    if (existing) {
      // Script already injected but may not have finished loading — poll.
      let ticks = 0;
      const t = setInterval(() => {
        ticks++;
        if (window.Razorpay) { clearInterval(t); resolve(); }
        if (ticks > 80) { clearInterval(t); reject(new Error("Razorpay SDK load timeout")); }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.id = "rzp-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.head.appendChild(script);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Form field definitions
// ─────────────────────────────────────────────────────────────────────────────

type FieldDef = {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
};

const FIELDS: FieldDef[] = [
  {
    name: "name",
    label: "Full name",
    placeholder: "Priya Sharma",
    required: true,
    autoComplete: "name",
  },
  {
    name: "email",
    label: "Email address",
    placeholder: "priya@example.com",
    required: true,
    type: "email",
    autoComplete: "email",
  },
  {
    name: "line1",
    label: "Address line 1",
    placeholder: "123 Main Street",
    required: true,
    autoComplete: "address-line1",
  },
  {
    name: "line2",
    label: "Address line 2",
    placeholder: "Apt, floor, suite (optional)",
    autoComplete: "address-line2",
  },
  {
    name: "city",
    label: "City",
    placeholder: "Mumbai",
    required: true,
    autoComplete: "address-level2",
  },
  {
    name: "state",
    label: "State / Province",
    placeholder: "Maharashtra",
    autoComplete: "address-level1",
  },
  {
    name: "postalCode",
    label: "Postal code",
    placeholder: "400001",
    required: true,
    autoComplete: "postal-code",
  },
  {
    name: "country",
    label: "Country",
    placeholder: "India",
    autoComplete: "country-name",
  },
];

type FormValues = { [K in (typeof FIELDS)[number]["name"]]: string };

function validate(values: FormValues): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  for (const f of FIELDS) {
    if (f.required && !(values[f.name] || "").trim()) {
      errors[f.name] = `${f.label} is required`;
    }
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address";
  }
  return errors;
}

const INITIAL: FormValues = {
  name: "",
  email: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CheckoutForm({ slug }: { slug: string }) {
  const router = useRouter();
  const cart = useCart();

  const [values, setValues] = useState<FormValues>(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("Store");

  // Fetch store title once for the Razorpay modal header.
  useEffect(() => {
    fetch(`/api/store/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d: { store?: { title?: string } }) => {
        if (d?.store?.title) setStoreName(d.store.title);
      })
      .catch(() => {});
  }, [slug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    // Clear per-field error on edit.
    if (fieldErrors[name]) {
      setFieldErrors((fe) => {
        const next = { ...fe };
        delete next[name];
        return next;
      });
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (cart.count === 0) {
      setErrorMsg("Your cart is empty. Add items before checking out.");
      return;
    }

    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      // ── 1. Create order server-side (server recomputes total). ───────────
      const orderRes = await fetch(
        `/api/store/${encodeURIComponent(slug)}/checkout/order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.items.map((i) => ({
              productId: i.productId,
              qty: i.qty,
              ...(i.variantId ? { variantId: i.variantId } : {}),
            })),
            email: values.email.trim(),
            shipping: {
              name: values.name.trim(),
              line1: values.line1.trim(),
              ...(values.line2.trim() ? { line2: values.line2.trim() } : {}),
              city: values.city.trim(),
              ...(values.state.trim() ? { state: values.state.trim() } : {}),
              postalCode: values.postalCode.trim(),
              ...(values.country.trim() ? { country: values.country.trim() } : {}),
            },
          }),
        }
      );

      if (orderRes.status === 403) {
        setErrorMsg("Checkout is not enabled for this store.");
        setSubmitting(false);
        return;
      }
      if (orderRes.status === 400) {
        const body: { error?: string } = await orderRes.json().catch(() => ({}));
        setErrorMsg(body.error || "Cart contains unavailable or unsellable items.");
        setSubmitting(false);
        return;
      }
      if (!orderRes.ok) {
        setErrorMsg("Could not create order. Please try again.");
        setSubmitting(false);
        return;
      }

      const orderData: {
        razorpayOrderId: string;
        keyId: string;
        amount: number;
        currency: string;
        orderId: string;
      } = await orderRes.json();

      const { razorpayOrderId, keyId, amount, currency, orderId } = orderData;

      // ── 2. Load Razorpay Checkout SDK (injected once). ───────────────────
      await loadRazorpay();

      // ── 3. Open Razorpay modal. ──────────────────────────────────────────
      const rzp = new window.Razorpay({
        key: keyId,
        order_id: razorpayOrderId,
        amount,
        currency,
        name: storeName,
        description: "Order payment",
        prefill: {
          name: values.name.trim(),
          email: values.email.trim(),
        },
        handler: async (resp: RzpResponse) => {
          // ── 4. Verify payment signature server-side. ─────────────────────
          try {
            const verifyRes = await fetch(
              `/api/store/${encodeURIComponent(slug)}/checkout/verify`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                }),
              }
            );
            if (!verifyRes.ok) {
              setErrorMsg(
                "Payment received but verification failed. Please contact support with payment ID: " +
                  resp.razorpay_payment_id
              );
              setSubmitting(false);
              return;
            }
            // ── 5. Clear cart and navigate to success. ───────────────────
            cart.clear();
            router.push(
              `/s/${slug}/success?order=${encodeURIComponent(orderId)}`
            );
          } catch {
            setErrorMsg(
              "Network error during payment verification. Contact support with payment ID: " +
                resp.razorpay_payment_id
            );
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            // User closed the modal without paying — allow them to try again.
            setSubmitting(false);
          },
        },
      });

      rzp.open();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setErrorMsg(msg);
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Back link */}
      <div style={{ marginBottom: 24 }}>
        <a
          href={`/s/${slug}/cart`}
          style={{ fontSize: 13, color: "var(--sf-muted, #888)", textDecoration: "none" }}
        >
          ← Back to cart
        </a>
      </div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 24px",
          letterSpacing: "-0.02em",
        }}
      >
        Checkout
      </h1>

      {/* Global error banner */}
      {errorMsg && (
        <div
          style={{
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#b91c1c",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--sf-muted, #999)",
            margin: "0 0 16px",
          }}
        >
          Shipping details
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label
                htmlFor={`cf-${f.name}`}
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 5,
                  color: "var(--sf-muted, #666)",
                }}
              >
                {f.label}
                {f.required && (
                  <span style={{ color: "#e11d48", marginLeft: 2 }}>*</span>
                )}
              </label>
              <input
                id={`cf-${f.name}`}
                name={f.name}
                type={f.type ?? "text"}
                placeholder={f.placeholder}
                value={values[f.name] ?? ""}
                onChange={handleChange}
                autoComplete={f.autoComplete}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${
                    fieldErrors[f.name]
                      ? "#f87171"
                      : "var(--sf-border, #e0e0e0)"
                  }`,
                  fontSize: 14,
                  outline: "none",
                  background: "transparent",
                  boxSizing: "border-box",
                  color: "inherit",
                  fontFamily: "inherit",
                  transition: "border-color .15s",
                }}
              />
              {fieldErrors[f.name] && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#e11d48" }}>
                  {fieldErrors[f.name]}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Cart summary chips */}
        <div
          style={{
            background: "var(--sf-accent-soft, #f5f7ff)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 24,
            fontSize: 13,
            color: "var(--sf-muted, #666)",
          }}
        >
          <strong style={{ color: "inherit" }}>{cart.count}</strong>{" "}
          {cart.count === 1 ? "item" : "items"} in cart — total computed
          securely on the server.
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: "14px",
            background: submitting
              ? "var(--sf-muted, #ccc)"
              : "var(--sf-accent, #4f6bed)",
            color: "var(--sf-accent-fg, #fff)",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "background .15s",
          }}
        >
          {submitting ? "Processing…" : "Pay now"}
        </button>

        <p
          style={{
            marginTop: 12,
            fontSize: 11,
            textAlign: "center",
            color: "var(--sf-muted, #aaa)",
          }}
        >
          Secured by Razorpay · Card, UPI, Netbanking accepted
        </p>
      </form>
    </div>
  );
}
