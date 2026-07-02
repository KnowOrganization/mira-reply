"use client";
// Integer counts up from 0 when scrolled into view. Tabular numerals so the
// layout doesn't jitter. Reduced motion → renders the final value directly.
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./scroll";

type Props = {
  to: number;
  /** ms */
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

export default function CountUp({ to, duration = 1200, prefix = "", suffix = "", className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || started.current) return;
    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / duration);
          // expo-out
          const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          setValue(Math.round(to * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}
