"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SCROLLER, prefersReducedMotion } from "../scroll";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  children: string;
  className?: string;
  /** seconds between each word */
  stagger?: number;
  /** ScrollTrigger start, default "top 78%" */
  start?: string;
  as?: "h1" | "h2" | "h3" | "p" | "div";
};

// Word-by-word rise: each word wrapped in an overflow-hidden cell, slides up
// with a long expo ease when the block scrolls into view.
export function SplitReveal({
  children,
  className,
  stagger = 0.045,
  start = "top 78%",
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const words = el.querySelectorAll<HTMLElement>("[data-word]");
    const tween = gsap.fromTo(
      words,
      { yPercent: 120, rotate: 4 },
      {
        yPercent: 0,
        rotate: 0,
        duration: 1.1,
        ease: "expo.out",
        stagger,
        scrollTrigger: { trigger: el, scroller: SCROLLER, start, once: true },
      }
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [stagger, start]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className} aria-label={children}>
      {children.split(" ").map((w, i) => (
        <span key={i} aria-hidden>
          <span
            className="inline-block overflow-hidden align-bottom"
            style={{ paddingBottom: "0.08em", marginBottom: "-0.08em" }}
          >
            <span data-word className="inline-block will-change-transform">
              {w}
            </span>
          </span>{" "}
        </span>
      ))}
    </Tag>
  );
}
