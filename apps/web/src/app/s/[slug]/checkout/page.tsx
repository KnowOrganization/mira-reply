"use client";
// Checkout page — /s/<slug>/checkout. Thin wrapper; CheckoutForm owns the UX.
import { useParams } from "next/navigation";
import CheckoutForm from "../../_components/CheckoutForm";

export default function CheckoutPage() {
  const { slug } = useParams() as { slug: string };
  return <CheckoutForm slug={slug} />;
}
