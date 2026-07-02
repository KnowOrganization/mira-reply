"use client";
// Scroll-scrubbed vertical drift. Positive speed → element lags (moves up
// slower than scroll); negative → leads. transform-only, GPU cheap.
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SF_SCROLLER, prefersReducedMotion } from "./scroll";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  children: React.ReactNode;
  /** total travel in % of element height across its scroll journey (±) */
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function Parallax({ children, speed = 12, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      el,
      { yPercent: speed },
      {
        yPercent: -speed,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          scroller: SF_SCROLLER,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [speed]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform", ...style }}>
      {children}
    </div>
  );
}
