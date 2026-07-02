// Price formatter — converts minor units (paise, cents) → display string.
// Uses Intl.NumberFormat so ₹ / $ / € etc. are all handled natively.
// Falls back to priceText (owner-entered display string) when priceMinor is null.
// Pure, no hooks — safe in RSC and client components.

const NO_DECIMAL = new Set(["JPY", "KRW", "VND", "IDR", "CLP", "HUF", "ISK", "PYG", "UGX", "XAF", "XOF"]);
const THREE_DECIMAL = new Set(["KWD", "BHD", "JOD", "OMR", "TND"]);

function minorDivisor(currency: string): number {
  const c = currency.toUpperCase();
  if (NO_DECIMAL.has(c)) return 1;
  if (THREE_DECIMAL.has(c)) return 1000;
  return 100;
}

export function formatPrice(minor: number, currency: string): string {
  const c = currency.toUpperCase();
  const amount = minor / minorDivisor(c);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: c,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Unknown currency code → plain number
    return `${c} ${amount.toLocaleString()}`;
  }
}

export function Price({
  minor,
  currency,
  fallback,
  style,
  className,
}: {
  minor: number | null;
  currency?: string;
  fallback?: string | null;
  style?: React.CSSProperties;
  className?: string;
}) {
  const text = minor != null ? formatPrice(minor, currency || "INR") : (fallback ?? null);
  if (!text) return null;
  return (
    <span style={style} className={className}>
      {text}
    </span>
  );
}
