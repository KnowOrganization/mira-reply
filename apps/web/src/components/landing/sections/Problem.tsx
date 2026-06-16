"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SCROLLER, prefersReducedMotion } from "../scroll";
import { SplitReveal } from "../ui/SplitReveal";

gsap.registerPlugin(ScrollTrigger);

// The flood, horizontally. A sticky viewport while a belt of real-feeling
// messages scrubs past — spam, "price?", and buried in it, the deal.
const FLOOD: Array<{ from: string; text: string; tone?: "gold" | "spam" }> = [
  { from: "@arjun.fits", text: "price??" },
  { from: "@dailyhustle_", text: "🔥🔥🔥 follow back bro", tone: "spam" },
  { from: "@meera.codes", text: "bhai do you ship to Delhi?" },
  { from: "@cryptoking4u", text: "DM me to 10x your money 💰", tone: "spam" },
  { from: "@studiokava", text: "We'd love to sponsor a reel — budget attached.", tone: "gold" },
  { from: "@riya___s", text: "love your content!!" },
  { from: "@gymrat.vk", text: "is the cream-colored one back in stock?" },
  { from: "@freelikes.gg", text: "free followers click bio", tone: "spam" },
  { from: "@podmasala", text: "Would you come on our podcast next month?" },
  { from: "@neha.jpg", text: "size M available? need it before Friday 🙏" },
];

export function Problem() {
  const section = useRef<HTMLElement>(null);
  const belt = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sec = section.current;
    const strip = belt.current;
    if (!sec || !strip || prefersReducedMotion()) return;

    const dist = () => -(strip.scrollWidth - window.innerWidth);
    const tween = gsap.to(strip, {
      x: dist,
      ease: "none",
      scrollTrigger: {
        trigger: sec,
        scroller: SCROLLER,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (st) => {
          if (counter.current) {
            counter.current.textContent = String(Math.round(st.progress * 1287)).padStart(4, "0");
          }
        },
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <section id="act-problem" ref={section} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="px-5 md:px-10">
          <div className="m-mono mb-5" style={{ color: "var(--m-faint)" }}>
            01 — THE FLOOD · MESSAGE #<span ref={counter}>0000</span>
          </div>
          <SplitReveal
            as="h2"
            className="m-display max-w-[1100px] text-[clamp(36px,6.4vw,92px)]"
          >
            Thousands of messages. 24 hours to answer. One of them is a brand deal.
          </SplitReveal>
        </div>

        <div ref={belt} className="mt-14 flex w-max gap-5 pl-5 will-change-transform md:pl-10">
          {FLOOD.map((m, i) => (
            <div
              key={i}
              className="w-[260px] shrink-0 rounded-2xl border p-5 md:w-[300px]"
              style={{
                borderColor: m.tone === "gold" ? "var(--m-amber)" : "var(--m-line)",
                background: m.tone === "gold" ? "rgba(255,180,67,0.06)" : "rgba(255,255,255,0.02)",
                transform: `rotate(${((i % 5) - 2) * 1.4}deg) translateY(${((i % 3) - 1) * 14}px)`,
                opacity: m.tone === "spam" ? 0.55 : 1,
              }}
            >
              <div className="m-mono mb-3 flex items-center justify-between" style={{ color: "var(--m-faint)" }}>
                <span>{m.from}</span>
                {m.tone === "gold" && <span style={{ color: "var(--m-amber)" }}>● OPPORTUNITY</span>}
                {m.tone === "spam" && <span>● NOISE</span>}
              </div>
              <p className="text-[15px] leading-snug" style={{ color: m.tone === "spam" ? "var(--m-dim)" : "var(--m-ink)" }}>
                {m.text}
              </p>
              {m.tone === "gold" && (
                <p className="m-mono mt-4" style={{ color: "var(--m-amber)" }}>
                  WORTH ₹2,40,000 — IT WAS MESSAGE #847
                </p>
              )}
            </div>
          ))}
        </div>

        <p
          className="mt-12 max-w-[420px] px-5 text-[15px] leading-relaxed md:px-10"
          style={{ color: "var(--m-dim)" }}
        >
          Meta gives you a 24-hour window to reply before the conversation
          goes cold. Miss it, and the deal scrolls away with everything else.
        </p>
      </div>
    </section>
  );
}
