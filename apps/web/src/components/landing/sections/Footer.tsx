"use client";

import Link from "next/link";
import { MiraLogo } from "@/components/MiraLogo";
import { Marquee } from "../ui/Marquee";

export function Footer() {
  return (
    <footer className="relative z-10 border-t" style={{ borderColor: "var(--m-line)", background: "#020203" }}>
      <div className="border-b py-5" style={{ borderColor: "var(--m-line)" }}>
        <Marquee speed="22s">
          {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="m-display mx-6 flex items-center gap-6 whitespace-nowrap text-[28px]" style={{ color: "var(--m-faint)" }}>
            MIRA — THE OS FOR YOUR DMS
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--m-blue)" }} />
          </span>
          ))}
        </Marquee>
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-6 px-5 py-10 md:flex-row md:items-center md:px-10">
        <div className="flex items-center gap-3">
          <MiraLogo size={22} />
          <span className="m-mono" style={{ color: "var(--m-faint)" }}>
            © 2026 MIRA · MADE FOR THE DMS
          </span>
        </div>
        <div className="m-mono flex gap-8" style={{ color: "var(--m-dim)" }}>
          <Link href="/privacy" className="transition-colors hover:text-[var(--m-ink)]">
            PRIVACY
          </Link>
          <Link href="/terms" className="transition-colors hover:text-[var(--m-ink)]">
            TERMS
          </Link>
          <Link href="/" className="transition-colors hover:text-[var(--m-ink)]">
            APP
          </Link>
        </div>
      </div>
    </footer>
  );
}
