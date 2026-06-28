"use client";

import { BRAIN_TOPICS } from "../BrainGraph";

export function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-8 rounded-xl text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
      style={
        active
          ? { background: "var(--accent)", color: "var(--accent-fg)" }
          : { color: "var(--text-muted)" }
      }
    >
      {icon}
      {label}
    </button>
  );
}

export function Legend() {
  return (
    <div
      className="shrink-0 border-t px-6 py-3 flex items-center gap-x-4 gap-y-1.5 flex-wrap"
      style={{ borderColor: "var(--border)" }}
    >
      {BRAIN_TOPICS.map((t) => (
        <span key={t.key} className="flex items-center gap-1.5 text-[11px]">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: t.color }}
          />
          <span style={{ color: "var(--text-muted)" }}>{t.label}</span>
        </span>
      ))}
      <span
        className="text-[11px] ml-auto"
        style={{ color: "var(--text-subtle)" }}
      >
        bigger dot = used more in replies · click a dot to edit
      </span>
    </div>
  );
}

// tap-to-select chips — single (radio) or multi (toggle). Token-styled to match
// the rest of the brain UI, so it follows the app theme in light + dark.
export function ChipSelect({
  options,
  value,
  multi,
  onChange,
}: {
  options: string[];
  value: string[];
  multi: boolean;
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    if (multi) onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
    else onChange(value.includes(opt) ? [] : [opt]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className="h-8 px-3 rounded-xl text-[12px] font-semibold transition-colors"
            style={
              on
                ? { background: "var(--accent)", color: "var(--accent-fg)" }
                : {
                    background: "var(--bg-inset)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
