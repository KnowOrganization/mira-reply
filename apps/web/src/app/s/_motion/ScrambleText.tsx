"use client";
// Mono-label reveal: characters churn through glyphs and lock in left→right
// once the element enters the viewport (ported from landing).
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./scroll";

const GLYPHS = "▪▫/\\|<>+=*#%@$&0123456789";

type Props = {
  text: string;
  className?: string;
  /** ms per character resolved */
  speed?: number;
  delay?: number;
};

export default function ScrambleText({ text, className, speed = 28, delay = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  // start empty on server AND client — branching on matchMedia during
  // render breaks hydration; the effect below fills it in
  const [out, setOut] = useState("");
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || started.current) return;
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setOut(text));
      return () => cancelAnimationFrame(id);
    }

    let raf = 0;
    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now + delay;
      const elapsed = now - t0;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const locked = Math.floor(elapsed / speed);
      if (locked >= text.length) {
        setOut(text);
        return;
      }
      let s = text.slice(0, locked);
      for (let i = locked; i < text.length; i++) {
        s += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setOut(s);
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          raf = requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text, speed, delay]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {out || " "}
    </span>
  );
}
