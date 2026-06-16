"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SCROLLER, prefersReducedMotion } from "../scroll";

gsap.registerPlugin(ScrollTrigger);

// The OS in three verbs. Pinned center stage; each verb blooms out of the
// last while the particle field behind settles into order.
const LOOPS = [
  {
    word: "Answer",
    color: "var(--m-blue)",
    desc: "Every inbound gets a draft in your voice. A human reads it, edits it, sends it.",
  },
  {
    word: "Learn",
    color: "var(--m-magenta)",
    desc: "Mira studies your captions, your DMs, your knowledge base — and stops sounding like a bot.",
  },
  {
    word: "Deliver",
    color: "var(--m-amber)",
    desc: "Leads scored. Opportunities surfaced. Deals tracked from first comment to closed.",
  },
];

export function Manifesto() {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const sec = section.current;
    if (!sec || prefersReducedMotion()) return;

    const slides = sec.querySelectorAll<HTMLElement>("[data-loop]");
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sec,
        scroller: SCROLLER,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
      },
    });

    slides.forEach((slide, i) => {
      const word = slide.querySelector("[data-word-big]");
      const desc = slide.querySelector("[data-desc]");
      if (i > 0) {
        tl.fromTo(
          word,
          { opacity: 0, scale: 0.82, yPercent: 18, filter: "blur(14px)" },
          { opacity: 1, scale: 1, yPercent: 0, filter: "blur(0px)", duration: 1 },
          i * 2
        ).fromTo(desc, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7 }, i * 2 + 0.3);
      } else {
        gsap.set(word, { opacity: 1 });
        gsap.set(desc, { opacity: 1 });
      }
      if (i < slides.length - 1) {
        tl.to(slide, { opacity: 0, scale: 1.06, filter: "blur(10px)", duration: 0.8 }, i * 2 + 1.2);
      }
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <section id="act-os" ref={section} className="relative h-[400vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div className="m-mono absolute left-5 top-24 md:left-10" style={{ color: "var(--m-faint)" }}>
          02 — MEET MIRA · THREE LOOPS, ONE OS
        </div>
        {LOOPS.map((l, i) => (
          <div
            key={l.word}
            data-loop
            className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center"
            style={{ opacity: i === 0 ? 1 : undefined }}
          >
            <div
              data-word-big
              className="m-display"
              style={{
                fontSize: "clamp(72px, 17vw, 260px)",
                color: l.color,
                opacity: 0,
                textShadow: `0 0 120px ${i === 0 ? "rgba(0,149,246,.35)" : i === 1 ? "rgba(255,45,120,.3)" : "rgba(255,180,67,.3)"}`,
              }}
            >
              {l.word}
            </div>
            <p
              data-desc
              className="mt-6 max-w-[440px] text-[15px] leading-relaxed md:text-[17px]"
              style={{ color: "var(--m-dim)", opacity: 0 }}
            >
              {l.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
