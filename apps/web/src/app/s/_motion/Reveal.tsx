"use client";
// In-view reveal island. RSC children pass through as a slot — product markup
// stays server-rendered; only this thin wrapper hydrates. SSR HTML shows the
// content untransformed (SEO / no-JS / reduced-motion all see everything);
// the hidden initial state applies only after hydration.
import { motion, useReducedMotion } from "framer-motion";

type Props = {
  children: React.ReactNode;
  /** seconds */
  delay?: number;
  /** seconds */
  duration?: number;
  /** px the element rises from */
  y?: number;
  /** start blurred and resolve sharp */
  blur?: boolean;
  /** initial scale (e.g. 1.05 for images settling) */
  scale?: number;
  once?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export default function Reveal({
  children,
  delay = 0,
  duration = 0.9,
  y = 28,
  blur = false,
  scale,
  once = true,
  className,
  style,
}: Props) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className} style={style}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      style={style}
      initial={{
        opacity: 0,
        y,
        ...(scale ? { scale } : null),
        ...(blur ? { filter: "blur(12px)" } : null),
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        ...(scale ? { scale: 1 } : null),
        ...(blur ? { filter: "blur(0px)" } : null),
      }}
      viewport={{ once, margin: "0px 0px -10% 0px" }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
