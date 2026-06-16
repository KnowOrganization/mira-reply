"use client";

import Link from "next/link";
import { Magnetic } from "../ui/Magnetic";
import { SplitReveal } from "../ui/SplitReveal";

// Full-viewport close. Giant outlined wordmark fills on hover; the only
// move left is the button.
export function Finale() {
  return (
    <section
      className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 text-center"
      style={{ background: "var(--m-bg)" }}
    >
      <div className="m-mono mb-8" style={{ color: "var(--m-faint)" }}>
        11 — THE FLOOD ISN&apos;T WAITING
      </div>

      <SplitReveal as="h2" className="m-display text-[clamp(40px,7.5vw,110px)]">
        Stop scrolling. Start closing.
      </SplitReveal>

      <Magnetic strength={0.45} className="mt-14">
        <Link
          href="/"
          data-cursor="GO"
          className="group relative inline-flex items-center gap-4 overflow-hidden rounded-full px-10 py-5"
          style={{ background: "var(--m-blue)" }}
        >
          <span className="relative z-10 text-[17px] font-bold tracking-tight text-white">
            Enter Mira
          </span>
          <span className="relative z-10 text-white transition-transform duration-300 group-hover:translate-x-1.5">
            →
          </span>
          <span
            className="absolute inset-0 translate-y-full rounded-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0"
            style={{ background: "var(--m-magenta)" }}
          />
        </Link>
      </Magnetic>

      <a
        href="mailto:danyalforg@gmail.com?subject=Mira%20early%20access"
        className="m-mono mt-8 transition-colors hover:text-[var(--m-ink)]"
        style={{ color: "var(--m-dim)" }}
        data-cursor="MAIL"
      >
        OR WRITE TO US FOR EARLY ACCESS
      </a>

      <div
        className="m-display m-outline pointer-events-none absolute bottom-[-2vw] left-1/2 w-full -translate-x-1/2 select-none whitespace-nowrap text-center"
        style={{ fontSize: "22vw", lineHeight: 1, opacity: 0.5 }}
        aria-hidden
      >
        MIRA
      </div>
    </section>
  );
}
