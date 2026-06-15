"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useBrain, useBrainAction } from "@/lib/api/hooks";
import {
  Sparkles,
  MessageSquareText,
  ClipboardPaste,
  ListTree,
  Loader2,
  Trash2,
  Plus,
  ArrowRight,
  Check,
} from "lucide-react";
import { BrainGraph, BRAIN_TOPICS, type GraphFact } from "./BrainGraph";
import { MiraLogo } from "./MiraLogo";

const SPRING = { type: "spring" as const, stiffness: 320, damping: 30 };

type Fact = GraphFact & { link?: { url: string; label: string } };

// the guided interview — niche-agnostic and mostly tap-to-select, so any creator
// (food, fashion, fitness, travel, tech, comedy, music, moto — anyone) builds a
// strong brain in seconds. Only name / links / FAQ answers need real typing.
// Curated for the facts Mira actually uses to answer follower DMs + comments:
// who you are, what you offer, where to buy, collabs, gear, voice, top FAQ.
type QKind = "single" | "multi" | "text" | "longtext";
type TextField = { key: string; label: string; placeholder: string };
type Question = {
  topic: string; // drives the chip colour header only — the LLM assigns the real fact topic
  q: string;
  kind: QKind;
  options?: string[];
  allowOther?: boolean; // single/multi: also show a free "add your own" input
  otherLabel?: string; // single/multi: a labelled follow-up text input
  fields?: TextField[]; // text: the small labelled inputs
  optional?: boolean;
};

const QUESTIONS: Question[] = [
  {
    topic: "personal",
    q: "What's your name, and where are you based?",
    kind: "text",
    fields: [
      { key: "name", label: "Name", placeholder: "Your name" },
      { key: "location", label: "Based in", placeholder: "City, country" },
    ],
  },
  {
    topic: "general",
    q: "What's your account about?",
    kind: "multi",
    allowOther: true,
    options: [
      "Fitness", "Fashion & Style", "Food", "Travel", "Tech", "Beauty",
      "Business & Finance", "Comedy", "Music", "Art & Design", "Photography",
      "Gaming", "Education", "Lifestyle", "Health & Wellness", "Automotive",
      "Sports", "Parenting",
    ],
  },
  {
    topic: "shop",
    q: "What do you do or offer here?",
    kind: "multi",
    allowOther: true,
    options: [
      "Sell physical products", "Digital products / courses",
      "Services / freelance", "Coaching / consulting",
      "Just content & entertainment", "Brand promos",
      "Affiliate / recommendations",
    ],
  },
  {
    topic: "shop",
    q: "Where can people buy, book, or find more?",
    kind: "text",
    optional: true,
    fields: [
      { key: "shop", label: "Website / shop", placeholder: "yoursite.com" },
      { key: "booking", label: "Booking / contact", placeholder: "email or link" },
      { key: "social", label: "Best other social", placeholder: "@handle or link" },
    ],
  },
  {
    topic: "general",
    q: "Open to brand collabs or paid partnerships?",
    kind: "single",
    options: ["Yes, love them", "Selective / depends", "Not right now"],
    otherLabel: "How should brands reach you? (optional)",
  },
  {
    topic: "gear",
    q: "What do you create with?",
    kind: "multi",
    allowOther: true,
    optional: true,
    options: [
      "Phone camera", "DSLR / mirrorless", "GoPro", "Drone", "Mic",
      "Ring light", "Lightroom", "CapCut", "Premiere Pro", "Final Cut",
      "Canva", "Photoshop",
    ],
  },
  {
    topic: "personal",
    q: "Your personality & content vibe?",
    kind: "multi",
    options: [
      "Funny", "Chill", "Energetic", "Professional", "Inspirational",
      "Educational", "Bold", "Wholesome", "Aesthetic", "Warm", "Real / raw",
      "Playful",
    ],
  },
  {
    topic: "general",
    q: "What do followers ask you most?",
    kind: "multi",
    options: [
      "Prices", "Where to buy", "How to start", "Your gear", "Your location",
      "Collabs", "Recommendations", "Tutorials",
    ],
    otherLabel: "The short answer they need (optional)",
  },
  {
    topic: "general",
    q: "Anything else Mira should know?",
    kind: "longtext",
    optional: true,
  },
];

type Answer = { selected: string[]; other: string; fields: Record<string, string> };
const emptyAnswer = (): Answer => ({ selected: [], other: "", fields: {} });

function hasContent(a: Answer): boolean {
  return (
    a.selected.length > 0 ||
    a.other.trim().length > 0 ||
    Object.values(a.fields).some((v) => v.trim().length > 0)
  );
}

// turn one answer into the natural-language line the extractor reads
function composeAnswer(qu: Question, a: Answer): string {
  if (qu.kind === "text") {
    return (qu.fields || [])
      .map((f) => (a.fields[f.key]?.trim() ? `${f.label}: ${a.fields[f.key].trim()}` : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (qu.kind === "longtext") return a.other.trim();
  const base = a.selected.join(", ");
  const extra = a.other.trim();
  if (!extra) return base;
  if (qu.otherLabel) return base ? `${base} — ${extra}` : extra;
  return [base, extra].filter(Boolean).join(", ");
}

const TOPIC = Object.fromEntries(BRAIN_TOPICS.map((t) => [t.key, t]));

type BrainResp = {
  facts?: Fact[];
  total?: number;
  byTopic?: Record<string, number>;
  account?: { username?: string };
};

export function Brain() {
  const [mode, setMode] = useState<"interview" | "paste" | "facts">("interview");
  const [selected, setSelected] = useState<Fact | null>(null);

  const { data, refetch } = useBrain<BrainResp>();
  const deleteAction = useBrainAction();

  const facts = data?.facts || [];
  const total = data?.total || 0;
  const byTopic = data?.byTopic || {};
  const handle = data?.account?.username || "";

  // children call this after a write — refetch and resolve once fresh data lands
  const load = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filledAreas = useMemo(
    () => BRAIN_TOPICS.filter((t) => (byTopic[t.key] || 0) > 0).length,
    [byTopic]
  );
  const strength = Math.round((filledAreas / BRAIN_TOPICS.length) * 100);

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      {/* header */}
      <div
        className="shrink-0 border-b px-6 py-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <MiraLogo size={18} color="var(--accent-fg)" />
          </div>
          <h1 className="display" style={{ fontSize: 22 }}>
            Account Brain
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              Mira knows <b style={{ color: "var(--text)" }}>{total}</b> thing
              {total === 1 ? "" : "s"} across{" "}
              <b style={{ color: "var(--text)" }}>
                {filledAreas}/{BRAIN_TOPICS.length}
              </b>{" "}
              areas
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-24 h-2 rounded-full overflow-hidden"
                style={{ background: "var(--bg-inset)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${strength}%`, background: "var(--accent)" }}
                />
              </div>
              <span
                className="text-[12px] font-bold tabular-nums"
                style={{ color: "var(--accent)" }}
              >
                {strength}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* graph */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center p-6 min-h-0">
            <BrainGraph
              facts={facts}
              handle={handle}
              selectedId={selected?.id || null}
              onSelect={(f) => setSelected(f as Fact | null)}
            />
          </div>
          <Legend />
        </div>

        {/* builder panel */}
        <div
          className="w-[384px] shrink-0 border-l flex flex-col"
          style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
        >
          {/* selected node detail */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <NodeDetail
                  fact={selected}
                  onDelete={async () => {
                    await deleteAction.mutateAsync({ action: "delete", id: selected.id }).catch(() => {});
                    setSelected(null);
                    await load();
                    toast.success("Removed from the brain");
                  }}
                  onClose={() => setSelected(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* mode tabs */}
          <div className="p-3">
            <div
              className="flex p-1 rounded-2xl"
              style={{ background: "var(--bg-inset)" }}
            >
              <ModeTab
                active={mode === "interview"}
                onClick={() => setMode("interview")}
                icon={<MessageSquareText size={14} />}
                label="Interview"
              />
              <ModeTab
                active={mode === "paste"}
                onClick={() => setMode("paste")}
                icon={<ClipboardPaste size={14} />}
                label="Paste"
              />
              <ModeTab
                active={mode === "facts"}
                onClick={() => setMode("facts")}
                icon={<ListTree size={14} />}
                label={`Facts ${total}`}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4">
            {mode === "interview" && <Interview onSaved={load} handle={handle} />}
            {mode === "paste" && <Paste onSaved={load} />}
            {mode === "facts" && (
              <FactsList facts={facts} onChanged={load} onPick={setSelected} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-8 rounded-xl text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
      style={
        active
          ? { background: "var(--accent)", color: "var(--accent-fg)" }
          : { color: "var(--text-muted)" }
      }
    >
      {icon}
      {label}
    </button>
  );
}

function Legend() {
  return (
    <div
      className="shrink-0 border-t px-6 py-3 flex items-center gap-x-4 gap-y-1.5 flex-wrap"
      style={{ borderColor: "var(--border)" }}
    >
      {BRAIN_TOPICS.map((t) => (
        <span key={t.key} className="flex items-center gap-1.5 text-[11px]">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: t.color }}
          />
          <span style={{ color: "var(--text-muted)" }}>{t.label}</span>
        </span>
      ))}
      <span
        className="text-[11px] ml-auto"
        style={{ color: "var(--text-subtle)" }}
      >
        bigger dot = used more in replies · click a dot to edit
      </span>
    </div>
  );
}

// ── interview ────────────────────────────────────────────────────────────
// Mostly MCQ — tap chips, type only where unavoidable (name, links, FAQ answer).
// Selections autosave to localStorage so progress survives a reload. Everything
// is composed into one blob at the end and sent to the same `extract` action
// Paste uses — so the brain-build path (and the DM pipeline) is unchanged.
function Interview({ onSaved, handle }: { onSaved: () => Promise<void>; handle: string }) {
  const KEY = `mira.brain.interview:${handle || "default"}`;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(() => QUESTIONS.map(emptyAnswer));
  const [hydrated, setHydrated] = useState(false);
  const [building, setBuilding] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const extractAction = useBrainAction<{ created?: unknown[] }>();

  // Load saved progress once, on the client — NOT in the useState initialiser, so
  // the server and first client render both start empty and hydration matches; we
  // fill from localStorage only after mount. That's the React-recommended way to
  // avoid an SSR hydration mismatch, and it legitimately needs setState here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { answers?: unknown; idx?: unknown };
        if (Array.isArray(saved.answers)) {
          setAnswers(
            QUESTIONS.map((_, i) => {
              const a = (saved.answers as Answer[])[i] || ({} as Answer);
              return {
                selected: Array.isArray(a.selected) ? a.selected : [],
                other: typeof a.other === "string" ? a.other : "",
                fields: a.fields && typeof a.fields === "object" ? a.fields : {},
              };
            })
          );
        }
        if (typeof saved.idx === "number") setIdx(Math.min(saved.idx, QUESTIONS.length));
      }
    } catch {
      /* corrupt cache — ignore */
    }
    setHydrated(true);
  }, [KEY]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // autosave on every change (only after hydration, so we don't clobber the load)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ answers, idx }));
    } catch {
      /* quota / private mode — non-fatal */
    }
  }, [answers, idx, hydrated, KEY]);

  const answeredCount = answers.filter(hasContent).length;

  function patch(p: Partial<Answer>) {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...p };
      return next;
    });
  }
  function setField(key: string, v: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], fields: { ...next[idx].fields, [key]: v } };
      return next;
    });
  }

  async function build() {
    setBuilding(true);
    const text = QUESTIONS.map((qu, i) => {
      const composed = composeAnswer(qu, answers[i]);
      return composed ? `${qu.q}\n${composed}` : "";
    })
      .filter(Boolean)
      .join("\n\n");
    let learned = 0;
    if (text) {
      const r = await extractAction.mutateAsync({ action: "extract", text }).catch(() => null);
      learned = r?.created?.length || 0;
      if (learned)
        toast.success(`Learned ${learned} fact${learned === 1 ? "" : "s"}`);
      await onSaved();
    }
    try {
      localStorage.removeItem(KEY); // interview consumed — start fresh next time
    } catch {
      /* ignore */
    }
    setBuilding(false);
    setDone(learned);
  }

  // completion screen
  if (done !== null) {
    return (
      <div className="flex flex-col items-center text-center gap-3 pt-12">
        <div
          className="w-14 h-14 rounded-3xl flex items-center justify-center"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
        >
          <Check size={26} />
        </div>
        <div className="text-[15px] font-bold">Brain built</div>
        <p className="text-[12px]" style={{ color: "var(--text-subtle)" }}>
          Mira learned {done} fact{done === 1 ? "" : "s"} from your answers. Add
          more anytime via Paste or Facts.
        </p>
        <button
          onClick={() => {
            setAnswers(QUESTIONS.map(emptyAnswer));
            setIdx(0);
            setDone(null);
          }}
          className="text-[12px] font-semibold"
          style={{ color: "var(--accent)" }}
        >
          Run it again
        </button>
      </div>
    );
  }

  // review & build screen
  if (idx >= QUESTIONS.length) {
    return (
      <div>
        <div className="text-[14px] font-bold mb-1">Review &amp; build</div>
        <p className="text-[12px] mb-3" style={{ color: "var(--text-subtle)" }}>
          {answeredCount} of {QUESTIONS.length} answered. Mira reads it all at
          once and grows the graph. Tap any answer to edit it.
        </p>
        <div className="space-y-1.5 mb-4">
          {QUESTIONS.map((qu, i) => {
            const composed = composeAnswer(qu, answers[i]);
            return (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="w-full text-left rounded-xl p-2.5"
                style={{
                  background: "var(--bg-elev)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="text-[11px] font-semibold truncate"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {qu.q}
                </div>
                <div
                  className="text-[12.5px] mt-0.5 line-clamp-2"
                  style={{ color: composed ? "var(--text)" : "var(--text-subtle)" }}
                >
                  {composed || "— skipped —"}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={build}
            disabled={building || answeredCount === 0}
            className="flex-1 h-11 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {building ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            Build my brain
          </motion.button>
          <button
            onClick={() => setIdx(QUESTIONS.length - 1)}
            className="h-11 px-3 rounded-xl text-[12px] font-semibold"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const cur = QUESTIONS[idx];
  const topic = TOPIC[cur.topic];
  const ans = answers[idx];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
          style={{
            background: `color-mix(in srgb, ${topic?.color} 18%, transparent)`,
            color: topic?.color,
          }}
        >
          {topic?.label}
        </span>
        {cur.optional && (
          <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
            optional
          </span>
        )}
        <span
          className="ml-auto text-[11px] tabular-nums"
          style={{ color: "var(--text-subtle)" }}
        >
          {idx + 1} / {QUESTIONS.length}
        </span>
      </div>
      <div
        className="h-1 rounded-full mb-4 overflow-hidden"
        style={{ background: "var(--bg-inset)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--accent)" }}
          animate={{ width: `${(idx / QUESTIONS.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={SPRING}
        >
          <div className="flex items-start gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center"
              style={{ background: "var(--accent)" }}
            >
              <MiraLogo size={15} color="var(--accent-fg)" />
            </div>
            <div
              className="text-[14px] font-semibold leading-snug pt-0.5"
              style={{ color: "var(--text)" }}
            >
              {cur.q}
            </div>
          </div>

          {/* answer body — varies by question kind */}
          {cur.kind === "text" && (
            <div className="space-y-2">
              {(cur.fields || []).map((f) => (
                <div key={f.key}>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {f.label}
                  </label>
                  <input
                    value={ans.fields[f.key] || ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="mt-1 w-full h-10 px-3 rounded-xl bg-transparent text-[13px] outline-none"
                    style={{ border: "1px solid var(--border-strong)" }}
                  />
                </div>
              ))}
            </div>
          )}

          {cur.kind === "longtext" && (
            <textarea
              value={ans.other}
              onChange={(e) => patch({ other: e.target.value })}
              rows={5}
              autoFocus
              placeholder="Write anything else — your story, links, what makes you you. Leave blank to skip."
              className="w-full px-3.5 py-3 rounded-xl bg-transparent text-[13.5px] outline-none resize-none"
              style={{ border: "1px solid var(--border-strong)" }}
            />
          )}

          {(cur.kind === "single" || cur.kind === "multi") && (
            <div className="space-y-2.5">
              <ChipSelect
                options={cur.options || []}
                value={ans.selected}
                multi={cur.kind === "multi"}
                onChange={(v) => patch({ selected: v })}
              />
              {(cur.allowOther || cur.otherLabel) && (
                <input
                  value={ans.other}
                  onChange={(e) => patch({ other: e.target.value })}
                  placeholder={cur.otherLabel || "Add your own…"}
                  className="w-full h-9 px-3 rounded-xl bg-transparent text-[12.5px] outline-none"
                  style={{ border: "1px solid var(--border-strong)" }}
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            {idx > 0 && (
              <button
                onClick={() => setIdx((i) => i - 1)}
                className="h-10 px-3 rounded-xl text-[12px] font-semibold"
                style={{
                  background: "var(--bg-inset)",
                  color: "var(--text-muted)",
                }}
              >
                Back
              </button>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIdx((i) => i + 1)}
              className="h-10 px-4 rounded-xl text-[13px] font-bold flex items-center gap-1.5"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              <ArrowRight size={14} />
              {idx === QUESTIONS.length - 1 ? "Review" : "Next"}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// tap-to-select chips — single (radio) or multi (toggle). Token-styled to match
// the rest of the brain UI, so it follows the app theme in light + dark.
function ChipSelect({
  options,
  value,
  multi,
  onChange,
}: {
  options: string[];
  value: string[];
  multi: boolean;
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    if (multi) onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
    else onChange(value.includes(opt) ? [] : [opt]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className="h-8 px-3 rounded-xl text-[12px] font-semibold transition-colors"
            style={
              on
                ? { background: "var(--accent)", color: "var(--accent-fg)" }
                : {
                    background: "var(--bg-inset)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── paste ────────────────────────────────────────────────────────────────
function Paste({ onSaved }: { onSaved: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const extractAction = useBrainAction<{ created?: unknown[] }>();

  async function extract() {
    if (!text.trim() || busy) return;
    setBusy(true);
    const r = await extractAction.mutateAsync({ action: "extract", text: text.trim() }).catch(() => null);
    setBusy(false);
    if (r?.created?.length) {
      toast.success(`Learned ${r.created.length} fact(s)`);
      setText("");
      await onSaved();
    } else {
      toast.error("Couldn't pull facts from that");
    }
  }

  return (
    <div>
      <p className="text-[12px] mb-2.5" style={{ color: "var(--text-muted)" }}>
        Write everything about you and the account in one go — Mira reads it and
        builds the brain.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={11}
        placeholder="e.g. I'm Aman from Pune, riding a Dominar 400 since 2021. Shoot on a GoPro 12, edit in CapCut. Favourite ride is the Lavasa loop. The account is about everyday motovlogging for new riders…"
        className="w-full px-3.5 py-3 rounded-xl bg-transparent text-[13px] outline-none resize-none leading-relaxed"
        style={{ border: "1px solid var(--border-strong)" }}
      />
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={extract}
        disabled={busy || !text.trim()}
        className="mt-3 w-full h-10 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
        Extract facts
      </motion.button>
    </div>
  );
}

// ── facts list + manual add ──────────────────────────────────────────────
function FactsList({
  facts,
  onChanged,
  onPick,
}: {
  facts: Fact[];
  onChanged: () => Promise<void>;
  onPick: (f: Fact) => void;
}) {
  const [adding, setAdding] = useState(false);
  const deleteAction = useBrainAction();

  async function del(id: string) {
    await deleteAction.mutateAsync({ action: "delete", id }).catch(() => {});
    await onChanged();
  }

  return (
    <div>
      <button
        onClick={() => setAdding((a) => !a)}
        className="w-full h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 mb-3"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        <Plus size={13} /> Add a fact manually
      </button>
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <AddFactForm
              onAdded={async () => {
                setAdding(false);
                await onChanged();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {facts.length === 0 && (
        <div
          className="text-[12px] text-center py-10"
          style={{ color: "var(--text-subtle)" }}
        >
          Nothing yet. Run the interview or paste a paragraph.
        </div>
      )}
      <div className="space-y-1.5">
        {facts.map((f) => {
          const t = TOPIC[f.topic];
          return (
            <div
              key={f.id}
              className="group rounded-xl p-2.5 cursor-pointer"
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
              }}
              onClick={() => onPick(f)}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: t?.color || "var(--text-subtle)" }}
                />
                <span
                  className="text-[11px] font-semibold truncate"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {f.question}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    del(f.id);
                  }}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition shrink-0"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="text-[13px] mt-0.5">{f.answer}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddFactForm({ onAdded }: { onAdded: () => Promise<void> }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [topic, setTopic] = useState("general");
  const [busy, setBusy] = useState(false);
  const addAction = useBrainAction();
  const ok = q.trim() && a.trim();

  async function add() {
    if (!ok || busy) return;
    setBusy(true);
    await addAction
      .mutateAsync({ action: "add", question: q.trim(), answer: a.trim(), topic })
      .catch(() => {});
    setBusy(false);
    toast.success("Added to the brain");
    await onAdded();
  }

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="What might someone ask? e.g. which bike?"
        className="w-full h-9 px-3 rounded-lg bg-transparent text-[12.5px] outline-none"
        style={{ border: "1px solid var(--border-strong)" }}
      />
      <input
        value={a}
        onChange={(e) => setA(e.target.value)}
        placeholder="The answer — e.g. Dominar 400"
        className="w-full h-9 px-3 rounded-lg bg-transparent text-[12.5px] outline-none"
        style={{ border: "1px solid var(--border-strong)" }}
      />
      <div className="flex items-center gap-1 flex-wrap">
        {BRAIN_TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTopic(t.key)}
            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors"
            style={
              topic === t.key
                ? { background: "var(--accent)", color: "var(--accent-fg)" }
                : { background: "var(--bg-inset)", color: "var(--text-muted)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={add}
        disabled={!ok || busy}
        className="w-full h-9 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
        Add fact
      </motion.button>
    </div>
  );
}

function NodeDetail({
  fact,
  onDelete,
  onClose,
}: {
  fact: Fact;
  onDelete: () => void;
  onClose: () => void;
}) {
  const t = TOPIC[fact.topic];
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
          style={{
            background: `color-mix(in srgb, ${t?.color} 18%, transparent)`,
            color: t?.color,
          }}
        >
          {t?.label || fact.topic}
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
          used {fact.hitCount}× in replies
        </span>
        <button
          onClick={onClose}
          className="ml-auto text-[11px] font-semibold"
          style={{ color: "var(--text-muted)" }}
        >
          close
        </button>
      </div>
      <div
        className="text-[11.5px] font-semibold"
        style={{ color: "var(--text-subtle)" }}
      >
        {fact.question}
      </div>
      <div className="text-[14px] mt-0.5">{fact.answer}</div>
      <button
        onClick={onDelete}
        className="mt-3 h-8 px-3 rounded-lg text-[11.5px] font-semibold flex items-center gap-1.5"
        style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
      >
        <Trash2 size={12} /> Remove
      </button>
    </div>
  );
}
