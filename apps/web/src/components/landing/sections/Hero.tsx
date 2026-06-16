"use client";

import { motion } from "framer-motion";
import { ScrambleText } from "../ui/ScrambleText";

type Props = { loaded: boolean };

const line = {
  hidden: { yPercent: 130, rotate: 3 },
  show: (i: number) => ({
    yPercent: 0,
    rotate: 0,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as const, delay: 0.15 + i * 0.12 },
  }),
};

// Headline floats over the particle swarm. Every line rises out of an
// overflow-hidden slot once the preloader hands over.
export function Hero({ loaded }: Props) {
  const anim = loaded ? "show" : "hidden";

  return (
    <section className="relative flex min-h-screen flex-col justify-center px-5 md:px-10">
      <div className="max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ delay: 0.1, duration: 0.8 }}
          className="m-mono mb-6 flex items-center gap-3"
          style={{ color: "var(--m-dim)" }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--m-green)" }} />
          <ScrambleText text="MIRA — INSTAGRAM BUSINESS OS" delay={400} />
        </motion.div>

        <h1
          className="m-display"
          style={{ fontSize: "clamp(44px, 9.2vw, 132px)" }}
        >
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <motion.span className="block" custom={0} variants={line} initial="hidden" animate={anim}>
              Your DMs are
            </motion.span>
          </span>
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <motion.span className="block" custom={1} variants={line} initial="hidden" animate={anim}>
              a business.
            </motion.span>
          </span>
          <span className="block overflow-hidden pb-[0.12em] -mb-[0.08em]">
            <motion.span
              className="m-serif-it block"
              style={{ color: "var(--m-blue)", fontWeight: 400, letterSpacing: "-0.01em" }}
              custom={2}
              variants={line}
              initial="hidden"
              animate={anim}
            >
              Run them like one.
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.75, duration: 0.9, ease: "easeOut" }}
          className="mt-8 max-w-[460px] text-[15px] leading-relaxed md:text-[17px]"
          style={{ color: "var(--m-dim)" }}
        >
          Mira turns the flood of comments, mentions and messages into
          conversations, customers and closed deals — in your voice, on the
          official API.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="m-mono flex flex-col items-center gap-3" style={{ color: "var(--m-faint)" }}>
          <span>SCROLL — THE CHAOS ORGANIZES</span>
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="block h-8 w-px"
            style={{ background: "var(--m-faint)" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
