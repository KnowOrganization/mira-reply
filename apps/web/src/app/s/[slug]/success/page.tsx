"use client";
// Order success page — /s/<slug>/success?order=<orderId>.
// Polls GET /api/store/:slug/order/:id every 2 s until status==="paid" (max 30 s).
// useSearchParams() is in a Suspense boundary as required by Next.js App Router.
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useCart } from "../../_lib/cart";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatPrice(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner content — must be wrapped in Suspense because it calls useSearchParams.
// ─────────────────────────────────────────────────────────────────────────────

type OrderStatus = "pending" | "paid" | "failed" | "timeout";

function SuccessContent() {
  const { slug } = useParams() as { slug: string };
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const cart = useCart();

  const [orderStatus, setOrderStatus] = useState<OrderStatus>("pending");
  const [amountTotal, setAmountTotal] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("INR");
  const cartCleared = useRef(false);

  // Clear cart once on mount regardless of poll result (handler may have already
  // cleared it; double-clearing is harmless since clear() sets items to []).
  useEffect(() => {
    if (!cartCleared.current) {
      cartCleared.current = true;
      cart.clear();
    }
  }, [cart]);

  // Poll order status until paid or timeout.
  useEffect(() => {
    if (!orderId) return;

    const MAX_ATTEMPTS = 15; // 15 × 2 s = 30 s
    let attempt = 0;

    async function poll() {
      attempt++;
      try {
        const res = await fetch(
          `/api/store/${encodeURIComponent(slug)}/order/${encodeURIComponent(orderId!)}`
        );
        if (!res.ok) return; // transient error — keep polling
        const data: { status: string; amountTotal: number; currency: string } =
          await res.json();

        if (data.status === "paid") {
          setAmountTotal(data.amountTotal);
          setCurrency(data.currency);
          setOrderStatus("paid");
          return; // stop polling
        }
        if (data.status === "failed") {
          setOrderStatus("failed");
          return;
        }
      } catch {
        // Network error — keep polling
      }

      if (attempt >= MAX_ATTEMPTS) {
        setOrderStatus("timeout");
        return;
      }

      timer = setTimeout(poll, 2000);
    }

    let timer = setTimeout(poll, 1200); // first poll after 1.2 s (let webhook land)
    return () => clearTimeout(timer);
  }, [orderId, slug]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const shopLink = (
    <Link
      href={`/s/${slug}`}
      style={{
        display: "inline-block",
        marginTop: 24,
        padding: "11px 26px",
        background: "var(--sf-accent, #4f6bed)",
        color: "var(--sf-accent-fg, #fff)",
        borderRadius: 10,
        fontWeight: 600,
        textDecoration: "none",
        fontSize: 14,
      }}
    >
      Back to shop
    </Link>
  );

  if (!orderId) {
    return (
      <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: 16, color: "var(--sf-muted, #888)" }}>
          No order ID found. If you just paid, check your email for confirmation.
        </p>
        {shopLink}
      </div>
    );
  }

  if (orderStatus === "pending") {
    return (
      <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
        <Spinner />
        <p style={{ marginTop: 20, fontSize: 16, fontWeight: 600 }}>
          Confirming your payment…
        </p>
        <p style={{ fontSize: 13, color: "var(--sf-muted, #888)", marginTop: 8 }}>
          This usually takes a few seconds.
        </p>
      </div>
    );
  }

  if (orderStatus === "paid") {
    return (
      <div style={{ padding: "3rem 1.5rem", textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#d1fae5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 32,
          }}
        >
          ✓
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Payment confirmed!
        </h1>
        {amountTotal != null && (
          <p style={{ fontSize: 28, fontWeight: 800, margin: "8px 0 4px", letterSpacing: "-0.03em" }}>
            {formatPrice(amountTotal, currency)}
          </p>
        )}
        <p style={{ fontSize: 13, color: "var(--sf-muted, #888)", margin: "8px 0 0" }}>
          Order ID: <code style={{ fontFamily: "monospace", fontSize: 12 }}>{orderId}</code>
        </p>
        <p style={{ fontSize: 14, color: "var(--sf-muted, #666)", margin: "16px 0 0", lineHeight: 1.6 }}>
          Your order is confirmed. You'll receive a confirmation email shortly.
        </p>
        {shopLink}
      </div>
    );
  }

  if (orderStatus === "failed") {
    return (
      <div style={{ padding: "3rem 1.5rem", textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 32,
          }}
        >
          ✕
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>
          Payment failed
        </h1>
        <p style={{ fontSize: 14, color: "var(--sf-muted, #666)", lineHeight: 1.6 }}>
          Your payment could not be processed. No money was charged. Please try
          again or contact support.
        </p>
        <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href={`/s/${slug}/checkout`}
            style={{
              padding: "11px 22px",
              background: "var(--sf-accent, #4f6bed)",
              color: "var(--sf-accent-fg, #fff)",
              borderRadius: 10,
              fontWeight: 600,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Try again
          </Link>
          {shopLink}
        </div>
      </div>
    );
  }

  // timeout
  return (
    <div style={{ padding: "3rem 1.5rem", textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#fef9c3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: 32,
        }}
      >
        ⏳
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>
        Still processing…
      </h1>
      <p style={{ fontSize: 14, color: "var(--sf-muted, #666)", lineHeight: 1.6 }}>
        Your payment is being processed. If it succeeds you&apos;ll receive a
        confirmation email. Order ID:{" "}
        <code style={{ fontFamily: "monospace", fontSize: 12 }}>{orderId}</code>
      </p>
      {shopLink}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        border: "3px solid var(--sf-border, #e5e7eb)",
        borderTopColor: "var(--sf-accent, #4f6bed)",
        borderRadius: "50%",
        margin: "0 auto",
        animation: "spin 0.8s linear infinite",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export — Suspense shell required for useSearchParams
// ─────────────────────────────────────────────────────────────────────────────

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "var(--sf-muted, #888)" }}>Loading…</div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
