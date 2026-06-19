// ColumnHeader — board column header: status glyph + name + count + actions.
// All actions are passed in; this renders only.
import { MoreHorizontal, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "./IconButton";

export function ColumnHeader({
  icon,
  label,
  count,
  onAdd,
  onMore,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  onAdd?: () => void;
  onMore?: () => void;
}) {
  return (
    <div className="px-1.5 h-9 flex items-center gap-2 group">
      {icon}
      <span className="text-[12.5px] font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>{label}</span>
      <span className="text-[12px] tabular-nums" style={{ color: "var(--text-subtle)" }}>{count}</span>
      <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onMore && <IconButton size={22} title="More" onClick={onMore}><MoreHorizontal size={14} /></IconButton>}
        {onAdd && <IconButton size={22} title="Add" onClick={onAdd}><Plus size={14} /></IconButton>}
      </div>
    </div>
  );
}
