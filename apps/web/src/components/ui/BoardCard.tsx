// BoardCard — Linear-style issue card shell. Pure layout; all behavior
// (onClick, draggable, onDragStart) is forwarded from the caller untouched.
import type { ReactNode } from "react";

export function BoardCard({
  breadcrumb,
  title,
  status,
  chips,
  footer,
  avatar,
  onClick,
  draggable,
  onDragStart,
}: {
  breadcrumb?: ReactNode;
  title: ReactNode;
  status?: ReactNode;
  chips?: ReactNode;
  footer?: ReactNode;
  avatar?: ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className="rounded-lg p-3 cursor-pointer transition-all duration-100"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      {(breadcrumb || avatar) && (
        <div className="flex items-center gap-2 mb-1.5">
          {breadcrumb && (
            <span className="text-[11px] font-medium truncate" style={{ color: "var(--text-subtle)" }}>{breadcrumb}</span>
          )}
          {avatar && <span className="ml-auto shrink-0">{avatar}</span>}
        </div>
      )}
      <div className="flex items-start gap-1.5">
        {status && <span className="mt-0.5">{status}</span>}
        <span className="text-[12.5px] font-medium leading-snug line-clamp-2" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</span>
      </div>
      {chips && <div className="flex flex-wrap items-center gap-1.5 mt-2">{chips}</div>}
      {footer && <div className="mt-2 text-[11px]" style={{ color: "var(--text-subtle)" }}>{footer}</div>}
    </div>
  );
}
