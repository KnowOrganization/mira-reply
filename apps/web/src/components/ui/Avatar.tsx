// Avatar — round image/initial avatar. Falls back to an initial on a tinted bg.
function hueFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({
  src,
  name,
  size = 22,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const h = hueFor(name || "x");
  if (src) {
    return (
      <img
        src={src}
        alt={name || ""}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ border: "1px solid var(--border)" }}
      />
    );
  }
  return (
    <span
      className="rounded-full shrink-0 inline-flex items-center justify-center font-semibold"
      style={{
        width: size, height: size,
        fontSize: size * 0.42,
        background: `hsl(${h} 60% 92%)`,
        color: `hsl(${h} 45% 38%)`,
      }}
    >
      {initial}
    </span>
  );
}
