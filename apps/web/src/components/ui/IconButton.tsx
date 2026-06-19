// IconButton — square ghost button for header/toolbar actions.
import type { ReactNode } from "react";

export function IconButton({
  children,
  onClick,
  title,
  size = 28,
  active = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  size?: number;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-md flex items-center justify-center transition-colors"
      style={{
        width: size, height: size,
        color: active ? "var(--text)" : "var(--text-subtle)",
        background: active ? "var(--bg-inset)" : "transparent",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-inset)"; e.currentTarget.style.color = "var(--text)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = active ? "var(--bg-inset)" : "transparent"; e.currentTarget.style.color = active ? "var(--text)" : "var(--text-subtle)"; }}
    >
      {children}
    </button>
  );
}
