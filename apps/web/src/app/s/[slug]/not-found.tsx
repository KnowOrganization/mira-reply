// On-brand 404 for unknown / unpublished storefronts (and missing products).
export default function StoreNotFound() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--bg-frame)", color: "var(--text)", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-subtle)" }}>404</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Shop not found</div>
      <div style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 360 }}>This storefront doesn&apos;t exist or isn&apos;t published yet.</div>
      <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 18 }}>Powered by Mira</div>
    </div>
  );
}
