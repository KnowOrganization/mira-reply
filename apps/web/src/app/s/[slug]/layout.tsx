"use client";
// Per-slug layout — wraps all pages under /s/:slug in a single CartProvider so
// cart state is shared across listing, product detail, cart, checkout, and success.
// Uses useParams() rather than awaiting params (client component cannot await).
import { useParams } from "next/navigation";
import { CartProvider } from "../_lib/cart";

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams() as { slug: string };
  return <CartProvider slug={slug}>{children}</CartProvider>;
}
