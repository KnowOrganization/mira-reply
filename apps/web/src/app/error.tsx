"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "var(--bg-frame)", color: "var(--text)" }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Something went wrong</span>
      {error.message && (
        <code style={{ fontSize: 11, color: "var(--text-subtle)", background: "var(--bg-inset)", padding: "4px 10px", borderRadius: 6 }}>
          {error.message}
        </code>
      )}
      <button
        onClick={reset}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--accent-deep)",
          background: "var(--accent-soft)",
          border: "none",
          cursor: "pointer",
          padding: "8px 18px",
          borderRadius: 8,
        }}
      >
        Try again
      </button>
    </div>
  );
}
