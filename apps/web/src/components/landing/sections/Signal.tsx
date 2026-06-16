"use client";

import { SignalWave } from "../SignalWave";
import { SplitReveal } from "../ui/SplitReveal";

// Act II of the WebGL story — the signal field behind "Built India-first."
export function Signal() {
  return (
    <section className="relative z-10 flex min-h-screen items-center overflow-hidden">
      <SignalWave />
      <div className="relative mx-auto w-full max-w-[1200px] px-5 md:px-10">
        <div className="m-mono mb-6" style={{ color: "var(--m-dim)" }}>
          10 — WHERE THE DMS NEVER SLEEP
        </div>
        <SplitReveal as="h2" className="m-display text-[clamp(48px,10vw,150px)]">
          Built India-first.
        </SplitReveal>
        <p className="mt-8 max-w-[480px] text-[15px] leading-relaxed md:text-[17px]" style={{ color: "var(--m-dim)" }}>
          For the creators and SMBs who actually run their business in the
          DMs — pricing in rupees, replies in your tone, deals in your
          timezone.
        </p>
      </div>
    </section>
  );
}
