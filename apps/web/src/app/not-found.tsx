import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "var(--bg-frame)", color: "var(--text)" }}
    >
      <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-subtle)" }}>404</span>
      <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Page not found.</p>
      <Link
        href="/dashboard"
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--accent-deep)",
          textDecoration: "none",
          padding: "8px 18px",
          borderRadius: 8,
          background: "var(--accent-soft)",
        }}
      >
        Go home
      </Link>
    </div>
  );
}
