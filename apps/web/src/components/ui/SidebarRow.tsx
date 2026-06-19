// SidebarRow + SectionLabel — Linear-style nav row (icon + label, hover pill,
// active state) and tiny uppercase section heading. Render-only.
import type { ReactNode } from "react";

export function SidebarRow({
  icon,
  label,
  active = false,
  count,
  trailing,
  onClick,
  indent = false,
}: {
  icon?: ReactNode;
  label: ReactNode;
  active?: boolean;
  count?: number;
  trailing?: ReactNode;
  onClick?: () => void;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full h-7 flex items-center gap-2 rounded-md text-[13px] font-medium transition-colors"
      style={{
        paddingLeft: indent ? 26 : 8,
        paddingRight: 8,
        background: active ? "var(--bg-inset)" : "transparent",
        color: active ? "var(--text)" : "var(--text-muted)",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-inset)"; e.currentTarget.style.color = "var(--text)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = active ? "var(--text)" : "var(--text-muted)"; }}
    >
      {icon && <span className="flex items-center shrink-0" style={{ color: active ? "var(--text)" : "var(--text-subtle)" }}>{icon}</span>}
      <span className="truncate">{label}</span>
      {count != null && <span className="ml-auto text-[11px] tabular-nums" style={{ color: "var(--text-subtle)" }}>{count}</span>}
      {trailing && <span className={count != null ? "" : "ml-auto"}>{trailing}</span>}
    </button>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pt-4 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--text-subtle)" }}>
      {children}
    </div>
  );
}
