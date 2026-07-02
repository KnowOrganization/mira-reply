"use client";
// Word- or character-level rise reveal (ported from landing SplitReveal).
// Each unit sits in an overflow-hidden cell and slides up on scroll into view.
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SF_SCROLLER, prefersReducedMotion } from "./scroll";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  children: string;
  className?: string;
  /** split unit */
  by?: "words" | "chars";
  /** seconds between units */
  stagger?: number;
  /** ScrollTrigger start, default "top 82%" */
  start?: string;
  /** initial rotation of each unit */
  rotate?: number;
  as?: "h1" | "h2" | "h3" | "p" | "div" | "span";
};

export default function SplitText({
  children,
  className,
  by = "words",
  stagger,
  start = "top 82%",
  rotate = 4,
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const units = el.querySelectorAll<HTMLElement>("[data-unit]");
    const tween = gsap.fromTo(
      units,
      { yPercent: 120, rotate },
      {
        yPercent: 0,
        rotate: 0,
        duration: 1.1,
        ease: "expo.out",
        stagger: stagger ?? (by === "chars" ? 0.02 : 0.045),
        scrollTrigger: { trigger: el, scroller: SF_SCROLLER, start, once: true },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [stagger, start, by, rotate]);

  const units =
    by === "chars" ? children.split("") : children.split(" ").map((w, i, a) => (i < a.length - 1 ? `${w} ` : w));

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className} aria-label={children}>
      {units.map((u, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block overflow-hidden align-bottom"
          style={{ paddingBottom: "0.1em", marginBottom: "-0.1em" }}
        >
          <span data-unit className="inline-block will-change-transform" style={{ whiteSpace: "pre" }}>
            {u}
          </span>
        </span>
      ))}
    </Tag>
  );
}
