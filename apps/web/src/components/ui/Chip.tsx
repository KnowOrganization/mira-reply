// Chip — small label pill with optional leading icon/dot + trailing count.
// Linear's metadata chips (Meetings, Module, 2 PRs…).
import type { ReactNode } from "react";

export function Chip({
  children,
  icon,
  dot,
  count,
  onClick,
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  dot?: string;
  count?: number | string;
  onClick?: () => void;
  title?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-md text-[11px] font-medium transition-colors"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
      onMouseEnter={onClick ? (e) => (e.currentTarget.style.borderColor = "var(--border-strong)") : undefined}
      onMouseLeave={onClick ? (e) => (e.currentTarget.style.borderColor = "var(--border)") : undefined}
    >
      {dot && <span style={{ width: 7, height: 7, borderRadius: 999, background: dot, flexShrink: 0 }} />}
      {icon && <span className="flex items-center" style={{ color: "var(--text-subtle)" }}>{icon}</span>}
      <span className="truncate max-w-[120px]">{children}</span>
      {count != null && <span className="tabular-nums" style={{ color: "var(--text-subtle)" }}>{count}</span>}
    </Tag>
  );
}
