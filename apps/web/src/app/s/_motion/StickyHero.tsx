"use client";
// Pinned scroll section. Pins itself while the user scrolls `distance` px
// (or the track's horizontal overflow in `horizontal` mode) and exposes
// progress two ways:
//   • CSS var --sf-pin (0→1) on the pinned element — style children with it
//   • horizontal mode: translates the inner track by its overflow width
// Reduced motion / small screens (< md when `desktopOnly`): renders children
// in normal flow, fully visible, no pin.
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SF_SCROLLER, prefersReducedMotion } from "./scroll";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  children: React.ReactNode;
  /** pin travel in px (vertical mode). Default 1.2 viewport heights. */
  distance?: number;
  /** translate the inner track horizontally by its overflow */
  horizontal?: boolean;
  /** skip pinning under 768px (mobile gets normal flow) */
  desktopOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export default function StickyHero({
  children,
  distance,
  horizontal = false,
  desktopOnly = false,
  className,
  style,
}: Props) {
  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sec = section.current;
    const trk = track.current;
    if (!sec || !trk) return;
    if (prefersReducedMotion()) return;
    if (desktopOnly && window.innerWidth < 768) return;

    const overflow = horizontal ? Math.max(0, trk.scrollWidth - sec.clientWidth) : 0;
    const travel = horizontal ? overflow : (distance ?? Math.round(window.innerHeight * 1.2));
    if (travel <= 0) return;
    setActive(true);

    const tween = gsap.fromTo(
      trk,
      horizontal ? { x: 0 } : {},
      {
        ...(horizontal ? { x: -overflow } : {}),
        ease: "none",
        scrollTrigger: {
          trigger: sec,
          scroller: SF_SCROLLER,
          start: "top top",
          end: `+=${travel}`,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            sec.style.setProperty("--sf-pin", self.progress.toFixed(4));
          },
        },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      setActive(false);
    };
  }, [distance, horizontal, desktopOnly]);

  return (
    <div ref={section} className={className} style={{ ...style, ["--sf-pin" as string]: 0 }}>
      <div
        ref={track}
        style={
          horizontal && active
            ? { display: "flex", width: "max-content", willChange: "transform" }
            : horizontal
              ? { display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch" }
              : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
