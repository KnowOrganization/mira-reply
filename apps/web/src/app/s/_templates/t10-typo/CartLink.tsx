"use client";
// t10-typo — cart nav link with live count. Server (and first client render)
// show plain "Cart"; the count fills in after the cart hydrates from
// localStorage, so there is no hydration mismatch. Never rendered on preview
// slugs (the RSC templates omit it there).
import Link from "next/link";
import { useCart } from "../../_lib/cart";

export default function CartLink({
  slug,
  className,
  style,
}: {
  slug: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { count } = useCart();
  return (
    <Link href={`/s/${slug}/cart`} className={className} style={style}>
      Cart{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
