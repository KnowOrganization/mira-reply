"use client";
// t09-boutique "The Ritual" — cursor-following soft spotlight.
// A fixed radial accent glow that spring-lags the pointer. Mouse-only
// (pointer: fine), renders nothing under prefers-reduced-motion or on touch.
// Server render is null (active starts false), so hydration is stable.
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { prefersReducedMotion } from "../../_motion";

const SIZE = 520;

export default function Spotlight() {
  const [active, setActive] = useState(false);
  const mx = useMotionValue(-SIZE);
  const my = useMotionValue(-SIZE);
  const x = useSpring(mx, { stiffness: 52, damping: 18, mass: 0.6 });
  const y = useSpring(my, { stiffness: 52, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX - SIZE / 2);
      my.set(e.clientY - SIZE / 2);
    };
    setActive(true);
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  if (!active) return null;
  return (
    <motion.div
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: SIZE,
        height: SIZE,
        x,
        y,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 4,
        opacity: 0.14,
        filter: "blur(46px)",
        background:
          "radial-gradient(circle closest-side, color-mix(in srgb, var(--sf-accent, #b76e79), white 40%) 0%, transparent 72%)",
        willChange: "transform",
      }}
    />
  );
}
