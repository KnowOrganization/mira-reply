"use client";
// Skeleton primitives — the building blocks every skeleton composes from.
// All render the shared `.skeleton` shimmer block (globals.css), so they are
// theme-aware (light/dark) and respect prefers-reduced-motion for free.
// Dimensions are ALWAYS derived from a fixed input or the item index — never
// Math.random() — so server and client render identically (no hydration drift).

import type { CSSProperties, ReactNode } from "react";

type Dim = number | string;

/** The one true primitive. Everything else composes this. */
export function Skeleton({
  w = "100%",
  h = 12,
  r = 8,
  circle = false,
  className = "",
  style,
}: {
  w?: Dim;
  h?: Dim;
  r?: Dim;
  circle?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      aria-hidden
      style={{
        width: circle ? h : w,
        height: h,
        borderRadius: circle ? "50%" : r,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/** A single text line. */
export function SkLine({ w = "100%", h = 11 }: { w?: Dim; h?: number }) {
  return <Skeleton w={w} h={h} r={5} />;
}

/** N stacked text lines; the last is narrower for a natural paragraph rag. */
export function SkText({
  lines = 2,
  lastW = "60%",
  gap = 6,
  h = 11,
}: {
  lines?: number;
  lastW?: Dim;
  gap?: number;
  h?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkLine key={i} h={h} w={i === lines - 1 && lines > 1 ? lastW : "100%"} />
      ))}
    </div>
  );
}

/** Avatar circle. */
export function SkCircle({ size = 32 }: { size?: number }) {
  return <Skeleton h={size} circle />;
}

/** Pill / badge. */
export function SkChip({ w = 44, h = 16 }: { w?: Dim; h?: number }) {
  return <Skeleton w={w} h={h} r={999} />;
}

/** Square media thumbnail. */
export function SkThumb({ size = 48, r = 8 }: { size?: number; r?: number }) {
  return <Skeleton w={size} h={size} r={r} />;
}

/** Button-shaped block. */
export function SkButton({ w = 80, h = 28 }: { w?: Dim; h?: number }) {
  return <Skeleton w={w} h={h} r={8} />;
}

/**
 * Card shell that looks like a real elevated card — only its CHILDREN shimmer,
 * the frame stays solid. Matches how a real card looks while its content loads.
 */
export function SkCard({
  children,
  className = "",
  p = 14,
  r = 12,
  elev2 = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  p?: number;
  r?: number;
  elev2?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: elev2 ? "var(--bg-elev-2)" : "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: r,
        padding: p,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Repeat helper — keeps view skeletons free of Array.from boilerplate. */
export function SkRepeat({ n, children }: { n: number; children: (i: number) => ReactNode }) {
  return <>{Array.from({ length: n }).map((_, i) => children(i))}</>;
}
