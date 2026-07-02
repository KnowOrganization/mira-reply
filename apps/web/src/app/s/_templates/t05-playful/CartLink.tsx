"use client";
// t05-playful — round sticker-badge cart link with live count. Server (and
// first client render) show the "★" placeholder; the count fills in after the
// cart hydrates from localStorage, so there is no hydration mismatch.
// Never rendered on preview slugs (the RSC templates omit it there).
import Link from "next/link";
import { useCart } from "../../_lib/cart";

export default function CartLink({ slug }: { slug: string }) {
  const { count } = useCart();
  return (
    <Link href={`/s/${slug}/cart`} className="t05-cart" aria-label="Cart">
      <span className="t05-cart-count" aria-hidden>
        {count > 0 ? count : "★"}
      </span>
      <span className="t05-cart-word">cart</span>
    </Link>
  );
}
