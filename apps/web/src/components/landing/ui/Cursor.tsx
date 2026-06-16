"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

// Custom cursor: a dot that snaps to the pointer + a trailing ring that
// swells over interactive targets ([data-cursor] / links / buttons).
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [hot, setHot] = useState(false);

  const dx = useMotionValue(-100);
  const dy = useMotionValue(-100);
  const rx = useSpring(dx, { stiffness: 320, damping: 26, mass: 0.6 });
  const ry = useSpring(dy, { stiffness: 320, damping: 26, mass: 0.6 });

  useEffect(() => {
    const fine =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine) return;
    const enable = setTimeout(() => setEnabled(true), 0);

    const move = (e: PointerEvent) => {
      dx.set(e.clientX);
      dy.set(e.clientY);
      const t = (e.target as HTMLElement | null)?.closest(
        "[data-cursor], a, button"
      ) as HTMLElement | null;
      setHot(!!t);
      setLabel(t?.dataset.cursor ?? null);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      clearTimeout(enable);
      window.removeEventListener("pointermove", move);
    };
  }, [dx, dy]);

  if (!enabled) return null;

  return (
    <>
      {/* dot — raw position, zero lag */}
      <motion.div
        className="pointer-events-none fixed z-[90] rounded-full"
        style={{
          x: dx,
          y: dy,
          translateX: "-50%",
          translateY: "-50%",
          width: 6,
          height: 6,
          background: "var(--m-ink)",
        }}
      />
      {/* ring — sprung trail */}
      <motion.div
        className="pointer-events-none fixed z-[90] flex items-center justify-center rounded-full"
        style={{ x: rx, y: ry, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: hot ? (label ? 84 : 48) : 28,
          height: hot ? (label ? 84 : 48) : 28,
          backgroundColor: label ? "rgba(0,149,246,0.92)" : "rgba(0,149,246,0)",
          borderColor: hot ? "rgba(0,149,246,0.9)" : "rgba(242,239,233,0.35)",
        }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        initial={false}
      >
        <span
          className="m-mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.14em",
            color: "#fff",
            opacity: label ? 1 : 0,
            transition: "opacity .2s",
          }}
        >
          {label}
        </span>
        <span
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: "inherit" }}
        />
      </motion.div>
    </>
  );
}
