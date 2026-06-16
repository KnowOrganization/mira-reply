"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MiraLogo } from "@/components/MiraLogo";
import { SCROLLER_ID, prefersReducedMotion } from "./scroll";
import { Cursor } from "./ui/Cursor";
import { Magnetic } from "./ui/Magnetic";
import { Preloader } from "./sections/Preloader";
import { Hero } from "./sections/Hero";
import { Problem } from "./sections/Problem";
import { Manifesto } from "./sections/Manifesto";
import { FeatureActs } from "./sections/FeatureActs";
import { Compliance } from "./sections/Compliance";
import { Signal } from "./sections/Signal";
import { Finale } from "./sections/Finale";
import { Footer } from "./sections/Footer";
import "./landing.css";

gsap.registerPlugin(ScrollTrigger);

// WebGL scenes never render on the server
const Scene = dynamic(() => import("./Scene").then((m) => m.Scene), { ssr: false });

export function LandingPage() {
  const wrapper = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!wrapper.current || !content.current) return;
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      wrapper: wrapper.current,
      content: content.current,
      lerp: 0.09,
      wheelMultiplier: 1.05,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // fonts shift layout → recompute trigger positions once they settle
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollTo = (target: string) => {
    const el = wrapper.current?.querySelector(target) as HTMLElement | null;
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mira-landing">
      <Preloader onDone={() => setLoaded(true)} />
      <Cursor />
      <div className="m-grain" />

      {/* nav — above everything, outside the scroll flow */}
      <header
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 md:px-10 md:py-6"
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity .8s ease .2s",
        }}
      >
        <Link href="/landing" className="flex items-center" data-cursor="MIRA">
          <MiraLogo size={26} />
          <span className="m-display ml-2.5 text-[19px] tracking-tight">Mira</span>
        </Link>
        <nav className="m-mono hidden items-center gap-8 md:flex" style={{ color: "var(--m-dim)" }}>
          <button onClick={() => scrollTo("#act-problem")} className="transition-colors hover:text-[var(--m-ink)]">
            The Flood
          </button>
          <button onClick={() => scrollTo("#act-os")} className="transition-colors hover:text-[var(--m-ink)]">
            The OS
          </button>
          <button onClick={() => scrollTo("#act-compliance")} className="transition-colors hover:text-[var(--m-ink)]">
            Compliance
          </button>
        </nav>
        <Magnetic>
          <Link
            href="/"
            data-cursor="OPEN"
            className="m-mono inline-block rounded-full border px-5 py-2.5 transition-colors hover:bg-[var(--m-ink)] hover:text-black"
            style={{ borderColor: "var(--m-line)" }}
          >
            Enter Mira
          </Link>
        </Magnetic>
      </header>

      {/* the scroll world — body is overflow-hidden, so we own scrolling */}
      <div
        id={SCROLLER_ID}
        ref={wrapper}
        className="fixed inset-0 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: "none", background: "var(--m-bg)" }}
      >
        <Scene />
        <div ref={content} className="relative z-10">
          <Hero loaded={loaded} />
          <Problem />
          <Manifesto />
          <FeatureActs />
          <Compliance />
          <Signal />
          <Finale />
          <Footer />
        </div>
      </div>
    </div>
  );
}
