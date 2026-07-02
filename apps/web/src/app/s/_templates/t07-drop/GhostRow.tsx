"use client";
// t07-drop — lineup row wrapper. Two jobs:
//   1. snap-in from alternating sides (0.4s hard cut, whileInView once)
//   2. on fine pointers, a ghost product image chases the cursor on a spring
// Touch devices get the RSC-rendered static thumb instead (CSS-hidden on
// desktop); reduced-motion gets a plain wrapper with no entrance or ghost.
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { StoreImage } from "../../_components/StoreImage";

type Props = {
  imageUrl: string | null;
  monogram: string;
  /** entrance offset — alternate ± per row for the side-slide */
  fromX: number;
  children: React.ReactNode;
};

export default function GhostRow({ imageUrl, monogram, fromX, children }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [fine, setFine] = useState(false);
  const [hover, setHover] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 26, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 300, damping: 26, mass: 0.6 });

  useEffect(() => {
    setFine(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  const ghost = fine && !reduced && !!imageUrl;

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, x: fromX }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "relative" }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHover(true);
      }}
      onPointerLeave={() => setHover(false)}
      onPointerMove={(e) => {
        if (!ghost || e.pointerType !== "mouse") return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set(e.clientX - r.left - 110);
        y.set(e.clientY - r.top - 138);
      }}
    >
      {children}
      {ghost ? (
        <motion.div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            x: sx,
            y: sy,
            rotate: -3,
            width: 220,
            height: 276,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,.2)",
            boxShadow: "0 24px 60px rgba(0,0,0,.55)",
            pointerEvents: "none",
            zIndex: 6,
            opacity: hover ? 1 : 0,
            transition: "opacity .18s ease",
          }}
        >
          <StoreImage src={imageUrl} alt="" monogram={monogram} style={{ width: "100%", height: "100%" }} />
        </motion.div>
      ) : null}
    </motion.div>
  );
}
