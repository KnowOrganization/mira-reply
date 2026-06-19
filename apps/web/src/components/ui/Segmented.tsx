// Segmented — Linear-style pill toggle (All / Active / Backlog…). Controlled:
// value + onChange come from the caller; this owns no state.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 h-6 text-[11.5px]" : "px-3 h-7 text-[12.5px]";
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "var(--bg-inset)" }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`${pad} rounded-md font-medium transition-all duration-100`}
            style={
              on
                ? { background: "var(--bg)", color: "var(--text)", boxShadow: "var(--shadow-card)" }
                : { background: "transparent", color: "var(--text-muted)" }
            }
            onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
