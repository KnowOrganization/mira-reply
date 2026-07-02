"use client";
// Owns the storefront scroll container (see s/layout.tsx). Renders the same
// 100dvh scroll div the layout used to render, now with id="sf-scroll" so
// every ScrollTrigger can target it, and upgrades to Lenis smooth scrolling
// on desktop only — touch devices and in-app webviews keep native physics.
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SF_SCROLLER_ID, isDesktop, prefersReducedMotion } from "./scroll";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapper.current || !content.current) return;
    // fonts shift layout → recompute trigger positions once they settle
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    if (prefersReducedMotion() || !isDesktop()) return;

    const lenis = new Lenis({
      wrapper: wrapper.current,
      content: content.current,
      lerp: 0.09,
      wheelMultiplier: 1.05,
    });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <div
      id={SF_SCROLLER_ID}
      ref={wrapper}
      style={{ height: "100dvh", overflowY: "auto", overflowX: "hidden" }}
    >
      <div ref={content}>{children}</div>
    </div>
  );
}
