"use client";

import React from "react";
import { HelpCircle } from "lucide-react";
import type { ItemState } from "./types";

export function IconBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-7 w-7 rounded-md border flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
      style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}
    >
      {children}
    </button>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded border text-[10px]"
      style={{ borderColor: "var(--border-strong)" }}
    >
      {children}
    </span>
  );
}

export function StateChip({ state }: { state: ItemState }) {
  if (state === "needs_you")
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
        style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
      >
        <HelpCircle size={9} /> Needs you
      </span>
    );
  if (state === "draft")
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded"
        style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
      >
        Draft
      </span>
    );
  return null;
}

export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="px-3 py-2.5" style={{ background: "var(--bg-sidebar)" }}>
      <div
        className="text-[10px] uppercase tracking-[0.07em]"
        style={{ color: "var(--text-subtle)" }}
      >
        {label}
      </div>
      <div
        className="text-[17px] font-medium leading-tight mt-0.5"
        style={{ color: accent && value > 0 ? "var(--accent)" : "var(--text)" }}
      >
        {value}
      </div>
      <div className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
        {sub}
      </div>
    </div>
  );
}

export function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-10 text-center text-xs" style={{ color: "var(--text-subtle)" }}>
      {children}
    </div>
  );
}
