"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { SplitReveal } from "../ui/SplitReveal";

// ── Six acts, stacked deck ──────────────────────────────────────────────
// Each act is a sticky full-viewport panel; the next slides over the last.
// Vignettes are living mock-UI, not screenshots — they perform the feature.

type Act = {
  tag: string;
  title: string;
  body: string;
  accent: string;
  vignette: React.ReactNode;
};

// shared count-up number (starts when scrolled into view)
function CountUp({ to, suffix = "", duration = 1200 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      setV(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {v}
      {suffix}
    </span>
  );
}

/* ── 1 · assisted drafts ── */
function AssistedDraftVignette() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-25% 0px" });
  const DRAFT =
    "Hey! Yes — the cream tote is in stock. I can hold 2 till Friday. Want me to send the payment link?";
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(DRAFT.slice(0, i));
      if (i >= DRAFT.length) clearInterval(id);
    }, 26);
    return () => clearInterval(id);
  }, [inView]);

  const done = typed.length >= DRAFT.length;

  return (
    <div ref={ref} className="w-full max-w-[420px] space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="m-bubble-in max-w-[85%] px-4 py-3 text-[14px]"
      >
        Is the cream tote still available? Need 2 for Friday 🙏
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="rounded-2xl border p-4"
        style={{ borderColor: "rgba(0,149,246,0.4)", background: "rgba(0,149,246,0.05)" }}
      >
        <div className="m-mono mb-2 flex items-center justify-between" style={{ color: "var(--m-blue)" }}>
          <span>MIRA DRAFT · YOUR VOICE</span>
          <span>{done ? "READY" : "WRITING…"}</span>
        </div>
        <p className="min-h-[63px] text-[14px] leading-snug">
          {typed}
          {!done && <span className="m-caret" />}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="m-mono flex items-center gap-2" style={{ color: "var(--m-dim)" }}>
            <svg width="18" height="18" viewBox="0 0 20 20" className="m-ring">
              <circle cx="10" cy="10" r="8" stroke="var(--m-line)" strokeWidth="2" />
              <motion.circle
                cx="10"
                cy="10"
                r="8"
                stroke="var(--m-green)"
                strokeWidth="2"
                strokeDasharray="50.26"
                initial={{ strokeDashoffset: 0 }}
                animate={inView ? { strokeDashoffset: 12 } : {}}
                transition={{ duration: 2.5, ease: "linear" }}
              />
            </svg>
            <span>WINDOW OPEN · 22:41:09</span>
          </div>
          <motion.button
            animate={done ? { scale: [1, 1.06, 1] } : {}}
            transition={{ duration: 0.5 }}
            className="m-mono rounded-full px-4 py-2"
            style={{
              background: done ? "var(--m-blue)" : "rgba(255,255,255,0.06)",
              color: done ? "#fff" : "var(--m-faint)",
              transition: "background .4s, color .4s",
            }}
          >
            EDIT &amp; SEND
          </motion.button>
        </div>
      </motion.div>

      <p className="m-mono text-center" style={{ color: "var(--m-faint)" }}>
        A HUMAN PRESSES SEND. ALWAYS.
      </p>
    </div>
  );
}

/* ── 2 · CRM ── */
function CrmVignette() {
  const contacts = [
    { name: "@studiokava", status: "HOT", score: 92, color: "var(--m-magenta)" },
    { name: "@neha.jpg", status: "WARM", score: 67, color: "var(--m-amber)" },
    { name: "@arjun.fits", status: "COLD", score: 23, color: "var(--m-blue)" },
  ];
  return (
    <div className="w-full max-w-[420px] space-y-3">
      {contacts.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-20% 0px" }}
          transition={{ duration: 0.6, delay: i * 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border p-4"
          style={{ borderColor: "var(--m-line)", background: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-full"
                style={{ background: `linear-gradient(135deg, ${c.color}, transparent)` }}
              />
              <div>
                <div className="text-[14px] font-semibold">{c.name}</div>
                <div className="m-mono" style={{ color: "var(--m-faint)" }}>
                  AUTO-CREATED FROM DM
                </div>
              </div>
            </div>
            <span
              className="m-mono rounded-full border px-2.5 py-1"
              style={{ borderColor: c.color, color: c.color }}
            >
              {c.status}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${c.score}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: 0.3 + i * 0.18, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: c.color }}
              />
            </div>
            <span className="m-mono" style={{ color: c.color }}>
              <CountUp to={c.score} duration={1100 + i * 200} />
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── 3 · opportunities ── */
function OpportunitiesVignette() {
  const deals = [
    { type: "SPONSORSHIP", from: "@studiokava", value: "₹2,40,000", conf: 94 },
    { type: "COLLAB", from: "@podmasala", value: "₹60,000", conf: 81 },
    { type: "BRAND DEAL", from: "@vyommedia", value: "₹1,10,000", conf: 76 },
  ];
  return (
    <div className="w-full max-w-[440px] space-y-3">
      {deals.map((d, i) => (
        <motion.div
          key={d.from}
          initial={{ opacity: 0, y: 30, rotate: 1.5 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, margin: "-20% 0px" }}
          transition={{ duration: 0.6, delay: i * 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between rounded-2xl border p-4"
          style={{ borderColor: "rgba(255,180,67,0.35)", background: "rgba(255,180,67,0.04)" }}
        >
          <div>
            <div className="m-mono mb-1" style={{ color: "var(--m-amber)" }}>
              {d.type} · {d.conf}% CONFIDENCE
            </div>
            <div className="text-[14px]">{d.from}</div>
          </div>
          <div className="m-display text-[20px]" style={{ color: "var(--m-amber)" }}>
            {d.value}
          </div>
        </motion.div>
      ))}
      <p className="m-mono pt-2 text-center" style={{ color: "var(--m-faint)" }}>
        DETECTED IN THE FLOOD. NOTHING SLIPS.
      </p>
    </div>
  );
}

/* ── 4 · automations ── */
function AutomationsVignette() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-25% 0px" });
  return (
    <div ref={ref} className="w-full max-w-[440px]">
      <svg viewBox="0 0 440 240" className="w-full">
        {/* wires */}
        <motion.path
          d="M120 60 C 200 60, 200 120, 250 120"
          fill="none"
          stroke="var(--m-blue)"
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 0.9, delay: 0.3 }}
        />
        <motion.path
          d="M310 120 C 360 120, 360 180, 320 180"
          fill="none"
          stroke="var(--m-blue)"
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 0.9, delay: 1.1 }}
        />
        {/* nodes */}
        {[
          { x: 30, y: 35, w: 90, label: "COMMENT", sub: '"price"', delay: 0 },
          { x: 250, y: 95, w: 60, label: "MATCH", sub: "keyword", delay: 0.8 },
          { x: 230, y: 155, w: 90, label: "SEND DM", sub: "instant", delay: 1.8 },
        ].map((n) => (
          <motion.g
            key={n.label}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: n.delay }}
          >
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={50}
              rx={12}
              fill="rgba(0,149,246,0.07)"
              stroke="rgba(0,149,246,0.5)"
            />
            <text x={n.x + 12} y={n.y + 22} fill="var(--m-ink)" fontSize="10" fontFamily="var(--m-mono)" letterSpacing="1.5">
              {n.label}
            </text>
            <text x={n.x + 12} y={n.y + 38} fill="var(--m-dim)" fontSize="10" fontFamily="var(--m-mono)">
              {n.sub}
            </text>
          </motion.g>
        ))}
        {/* the fired DM */}
        <motion.g
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 2.4 }}
        >
          <rect x={40} y={185} width={150} height={36} rx={14} fill="var(--m-blue)" />
          <text x={56} y={207} fill="#fff" fontSize="12">
            Here&apos;s the price list 👋
          </text>
        </motion.g>
      </svg>
      <p className="m-mono mt-3 text-center" style={{ color: "var(--m-faint)" }}>
        COMMENT → DM IN UNDER A SECOND. ANY GRAPH YOU CAN DRAW.
      </p>
    </div>
  );
}

/* ── 5 · in-DM commerce ── */
function CommerceVignette() {
  const products = [
    { name: "Cream Tote", price: "₹1,899", hue: "var(--m-amber)" },
    { name: "Canvas Mini", price: "₹1,299", hue: "var(--m-blue)" },
    { name: "Jute Carry", price: "₹999", hue: "var(--m-magenta)" },
    { name: "Linen Slouch", price: "₹2,199", hue: "var(--m-green)" },
  ];
  return (
    <div
      className="w-[290px] rounded-[36px] border p-3"
      style={{ borderColor: "var(--m-line)", background: "rgba(255,255,255,0.02)" }}
    >
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full" style={{ background: "var(--m-line)" }} />
      <div className="m-bubble-in mb-3 max-w-[80%] px-3.5 py-2.5 text-[13px]">do you have tote bags?</div>
      <div className="m-marquee" style={{ "--m-marquee-speed": "14s" } as React.CSSProperties}>
        <div className="m-marquee-track gap-3 pr-3">
          {products.map((p) => (
            <div
              key={p.name}
              className="w-[150px] shrink-0 overflow-hidden rounded-2xl border"
              style={{ borderColor: "var(--m-line)" }}
            >
              <div
                className="h-[100px]"
                style={{ background: `radial-gradient(120% 120% at 30% 20%, ${p.hue} -60%, #141417 70%)` }}
              />
              <div className="p-3">
                <div className="text-[12px] font-semibold">{p.name}</div>
                <div className="m-mono mt-0.5" style={{ color: "var(--m-dim)" }}>
                  {p.price}
                </div>
                <div
                  className="m-mono mt-2 rounded-full py-1.5 text-center"
                  style={{ background: "rgba(0,149,246,0.15)", color: "var(--m-blue)" }}
                >
                  BUY
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="m-mono mt-3 text-center" style={{ color: "var(--m-faint)" }}>
        LIVE CAROUSEL, INSIDE THE DM
      </p>
    </div>
  );
}

/* ── 6 · autonomy ── */
function AutonomyVignette() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-25% 0px" });
  const gates = [
    { label: "CONFIDENCE", value: "97%", color: "var(--m-blue)" },
    { label: "ROLE", value: "OWNER", color: "var(--m-magenta)" },
    { label: "WINDOW", value: "OPEN", color: "var(--m-green)" },
    { label: "DISCLOSURE", value: "SET", color: "var(--m-amber)" },
  ];
  return (
    <div ref={ref} className="w-full max-w-[440px]">
      <div className="grid grid-cols-2 gap-6 md:flex md:justify-between md:gap-3">
        {gates.map((g, i) => (
          <div key={g.label} className="flex min-w-0 flex-col items-center gap-2">
            <svg width="64" height="64" viewBox="0 0 64 64" className="m-ring">
              <circle cx="32" cy="32" r="27" stroke="var(--m-line)" strokeWidth="2" />
              <motion.circle
                cx="32"
                cy="32"
                r="27"
                stroke={g.color}
                strokeWidth="2.5"
                strokeDasharray="169.6"
                initial={{ strokeDashoffset: 169.6 }}
                animate={inView ? { strokeDashoffset: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.45, ease: "easeInOut" }}
              />
            </svg>
            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.7 + i * 0.45 }}
              className="text-center"
            >
              <div className="m-mono" style={{ color: g.color }}>
                {g.value}
              </div>
              <div className="m-mono" style={{ color: "var(--m-faint)", fontSize: 9 }}>
                {g.label}
              </div>
            </motion.div>
          </div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.6, delay: 2.3, ease: [0.16, 1, 0.3, 1] }}
        className="m-bubble-out ml-auto mt-8 max-w-[85%] px-4 py-3 text-[14px]"
      >
        Sent autonomously — every gate passed, every step logged.
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 2.8 }}
        className="m-mono mt-3 text-right"
        style={{ color: "var(--m-faint)" }}
      >
        AUDIT LOG: AI · SEND · REASON · 00:00:41
      </motion.p>
    </div>
  );
}

const ACTS: Act[] = [
  {
    tag: "03 — THE WEDGE",
    title: "AI drafts. A human sends.",
    body: "Every inbound DM arrives with a reply already written — grounded in your knowledge base, tuned to your voice. You read, tweak, send. That human touch is also what legitimately unlocks Meta's 7-day reply window.",
    accent: "var(--m-blue)",
    vignette: <AssistedDraftVignette />,
  },
  {
    tag: "04 — CRM",
    title: "A CRM that builds itself.",
    body: "Every person who DMs or comments becomes a contact — automatically. Lead scores tick up with intent, frequency, recency. Cold, warm, hot, customer: the pipeline assembles while you sleep.",
    accent: "var(--m-magenta)",
    vignette: <CrmVignette />,
  },
  {
    tag: "05 — OPPORTUNITIES",
    title: "The deal finds you.",
    body: "Sponsorships, collabs, podcast invites, brand deals — Mira classifies every thread and surfaces the valuable ones with confidence scores and estimated value. Message #847 never gets buried again.",
    accent: "var(--m-amber)",
    vignette: <OpportunitiesVignette />,
  },
  {
    tag: "06 — AUTOMATIONS",
    title: "Draw the flow. Mira runs it.",
    body: 'Comment says "price" → DM lands in under a second. Keyword triggers, quick-reply funnels, ice breakers, story-mention replies — any graph you can draw, running 24/7 on webhooks, not polling.',
    accent: "var(--m-blue)",
    vignette: <AutomationsVignette />,
  },
  {
    tag: "07 — COMMERCE",
    title: "The DM is the storefront.",
    body: "A product question gets a real, scrollable carousel — straight from your inventory, with cached media for instant sends. Browse, tap, buy, without ever leaving the thread.",
    accent: "var(--m-green)",
    vignette: <CommerceVignette />,
  },
  {
    tag: "08 — AUTONOMY",
    title: "Autonomy you can audit.",
    body: "When you're ready, Mira sends on its own — but only through four gates: confidence threshold, role permission, open window, disclosure rules. Every autonomous action lands in the audit log with a reason.",
    accent: "var(--m-magenta)",
    vignette: <AutonomyVignette />,
  },
];

export function FeatureActs() {
  return (
    <div className="relative">
      {ACTS.map((act, i) => (
        <section key={act.tag} className="sticky top-0 flex h-screen items-center" style={{ background: i % 2 ? "var(--m-bg-2)" : "var(--m-bg)", zIndex: i + 1 }}>
          <div
            className={`mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 md:grid-cols-2 md:gap-20 md:px-10 ${
              i % 2 ? "md:[&>*:first-child]:order-2" : ""
            }`}
          >
            <div>
              <div className="m-mono mb-5" style={{ color: act.accent }}>
                {act.tag}
              </div>
              <SplitReveal as="h2" className="m-display text-[clamp(34px,5vw,68px)]" start="top 85%">
                {act.title}
              </SplitReveal>
              <p className="mt-6 max-w-[440px] text-[15px] leading-relaxed md:text-[16px]" style={{ color: "var(--m-dim)" }}>
                {act.body}
              </p>
            </div>
            <div className="flex justify-center">{act.vignette}</div>
          </div>
          {/* top hairline so the stacking read is crisp */}
          <div className="m-rule absolute inset-x-0 top-0" />
        </section>
      ))}
    </div>
  );
}
