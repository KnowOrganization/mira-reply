"use client";

import { ScrambleText } from "../ui/ScrambleText";

// Trust through restraint. Near-black band, mono type, hard facts.
const LINES = [
  "OFFICIAL META GRAPH API ONLY.",
  "NO SCRAPING. NO SESSION HACKS. NO GHOST CLIENTS.",
  "24-HOUR WINDOWS ENFORCED IN CODE, NOT IN FINE PRINT.",
  "HUMAN-AGENT REPLIES ARE HUMAN. ALWAYS.",
  "BROADCASTS REACH OPTED-IN PEOPLE. NOBODY ELSE.",
  "EVERY AI ACTION LOGGED, EXPLAINED, AUDITABLE.",
];

export function Compliance() {
  return (
    <section
      id="act-compliance"
      className="relative z-10 px-5 py-28 md:px-10 md:py-40"
      style={{ background: "#020203" }}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="m-mono mb-12" style={{ color: "var(--m-faint)" }}>
          09 — THE BORING PART WE REFUSE TO CHEAT ON
        </div>
        <div className="space-y-0">
          {LINES.map((l, i) => (
            <div key={i}>
              <div className="m-rule" />
              <div className="flex items-baseline gap-6 py-5 md:py-7">
                <span className="m-mono w-8 shrink-0" style={{ color: "var(--m-faint)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <ScrambleText
                  text={l}
                  speed={14}
                  delay={i * 90}
                  className="m-mono"
                  // larger than the label voice — this is the message
                />
              </div>
            </div>
          ))}
          <div className="m-rule" />
        </div>
        <p className="mt-10 max-w-[460px] text-[15px] leading-relaxed" style={{ color: "var(--m-dim)" }}>
          Your account is the business. Mira never touches an unofficial
          endpoint, never fakes a human, never messages anyone who didn&apos;t
          ask. Compliance isn&apos;t a checkbox here — it&apos;s the
          architecture.
        </p>
      </div>
    </section>
  );
}
