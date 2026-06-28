"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useBrainAction } from "@/lib/api/hooks";
import { Sparkles, Loader2, ArrowRight, Check } from "lucide-react";
import { MiraLogo } from "../MiraLogo";
import { QUESTIONS, TOPIC, SPRING } from "./constants";
import { emptyAnswer, type Answer } from "./types";
import { hasContent, composeAnswer } from "./utils";
import { ChipSelect } from "./parts";

// ── interview ────────────────────────────────────────────────────────────
// Mostly MCQ — tap chips, type only where unavoidable (name, links, FAQ answer).
// Selections autosave to localStorage so progress survives a reload. Everything
// is composed into one blob at the end and sent to the same `extract` action
// Paste uses — so the brain-build path (and the DM pipeline) is unchanged.
export function Interview({ onSaved, handle }: { onSaved: () => Promise<void>; handle: string }) {
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
