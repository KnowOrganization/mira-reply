"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MiraLogo } from "@/components/MiraLogo";
import { prefersReducedMotion } from "../scroll";

type Props = { onDone: () => void };

// Black curtain + mono counter. The count eases (fast → hesitate → snap to
// 100) so it feels like a machine booting, then the curtain lifts.
export function Preloader({ onDone }: Props) {
  const [n, setN] = useState(0);
  const [gone, setGone] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      // defer past the effect body — sync setState here cascades renders
      const id = setTimeout(() => {
        setGone(true);
        onDone();
      }, 0);
      return () => clearTimeout(id);
    }
    const t0 = performance.now();
    const DUR = 1700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - t0) / DUR, 1);
      // easeInOutQuart-ish with a stall near 80%
      const eased = t < 0.7 ? t * 1.15 : 0.805 + (t - 0.7) * 0.65;
      setN(Math.min(Math.round(eased * 100), 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else if (!done.current) {
        done.current = true;
        setTimeout(() => {
          setGone(true);
          onDone();
        }, 250);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "var(--m-bg)" }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <MiraLogo size={44} />
          </motion.div>
          <div
            className="m-mono absolute bottom-8 right-8 tabular-nums md:bottom-12 md:right-12"
            style={{ fontSize: 13, color: "var(--m-dim)" }}
          >
            {String(n).padStart(3, "0")} / 100
          </div>
          <div
            className="m-mono absolute bottom-8 left-8 md:bottom-12 md:left-12"
            style={{ fontSize: 11, color: "var(--m-faint)" }}
          >
            MIRA — BOOTING THE OS
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
