"use client";

import { useCallback, useEffect, useState } from "react";

// ── types ────────────────────────────────────────────────────────────────
type Decision =
  | { action: "send"; text: string; intent: string; dmText?: string }
  | { action: "draft"; text: string; intent: string; reviewOnly?: boolean }
  | { action: "clarify"; question: string; kind: string; intent: string }
  | { action: "skip"; reason: string; intent: string; hide?: boolean };

type RunResult = { decision?: Decision; error?: string; ms?: number };

type QA = { q: string; a: string };

type CorrectAction = "reply" | "ask_owner" | "skip";

type TrainingExample = {
  id: string;
  comment: string;
  caption: string;
  notes: string;
  miraAction: string;
  miraReply: string;
  intent: string;
  verdict: "good" | "bad";
  correctAction?: CorrectAction;
  idealReply?: string;
  askQuestion?: string;
  note?: string;
  createdAt: number;
};

// what the owner submits when denying a decision
type Correction = {
  correctAction: CorrectAction;
  idealReply?: string;
  askQuestion?: string;
  note?: string;
};

type Scenario = {
  label: string;
  comment: string;
  caption?: string;
  notes?: string;
  expect: "send" | "draft" | "clarify" | "skip";
  why: string;
};

// ── the do / don't suite ─────────────────────────────────────────────────
const DO_CASES: Scenario[] = [
  { label: "Link request", comment: "Link?", expect: "clarify", why: "asks for a link — none attached, so ask the owner" },
  { label: "Answer from hashtag", comment: "Which bike is this?", caption: "Golden hour therapy 🌅 #Dominar #Dominar400", expect: "send", why: "caption hashtag answers it — reply directly" },
  { label: "Answer from notes", comment: "what bike", notes: "bike name is Dominar 400", expect: "send", why: "owner notes hold the answer — use them" },
  { label: "Genuine praise", comment: "insane shot bro, love the vibe 🔥", expect: "send", why: "real praise — warm short reply" },
  { label: "Recommends the account", comment: "@rohan you gotta follow this account, so good", expect: "draft", why: "tags a friend but recommends us — thank them" },
  { label: "Question, no context", comment: "where was this shot?", expect: "clarify", why: "location unknown — ask the owner" },
];
const DONT_CASES: Scenario[] = [
  { label: "Tag banter", comment: "@sintuyadav1568 ise bolte h bhai sone nahi de rahe 😂", expect: "skip", why: "two friends joking — not for us" },
  { label: "Tag drop", comment: "@brother 😂", expect: "skip", why: "just tagging a friend" },
  { label: "One vague word", comment: "ok", expect: "skip", why: "too thin, no content" },
  { label: "Emoji only", comment: "🔥🔥🔥", expect: "skip", why: "bare emoji — react at most" },
  { label: "Hate / troll", comment: "this bike is trash and your content sucks", expect: "skip", why: "hate — hidden, never engaged" },
  { label: "Spam", comment: "follow me back and check my page for promo", expect: "skip", why: "spam — never replied to" },
];

const BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  send: { label: "AUTO-SEND", bg: "#1f7a4d", fg: "#eafff3" },
  draft: { label: "DRAFT · review", bg: "#2d6cb8", fg: "#eaf3ff" },
  clarify: { label: "ASKS OWNER", bg: "#b8861f", fg: "#fff8e6" },
  skip: { label: "SKIPPED", bg: "#8a3a3a", fg: "#ffecec" },
};

// what Mira "said" — used as the training record
function replyOf(d: Decision): string {
  if (d.action === "send" || d.action === "draft") return d.text;
  if (d.action === "clarify") return d.question;
  return `(skipped: ${d.reason})`;
}

export default function PlaygroundPage() {
  const [comment, setComment] = useState("");
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [qa, setQa] = useState<QA[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [training, setTraining] = useState<TrainingExample[]>([]);
  const [savedFor, setSavedFor] = useState<string | null>(null);
  const [batch, setBatch] = useState<Record<string, RunResult>>({});
  const [batchRunning, setBatchRunning] = useState(false);

  const loadTraining = useCallback(async () => {
    try {
      const r = await fetch("/api/playground/train");
      const j = await r.json();
      setTraining(j.training || []);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    loadTraining();
  }, [loadTraining]);

  async function callRun(c: string, cap: string, nt: string, q: QA[]): Promise<RunResult> {
    try {
      const r = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: c, caption: cap, notes: nt, qa: q }),
      });
      return (await r.json()) as RunResult;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "request failed" };
    }
  }

  async function run() {
    if (!comment.trim() || running) return;
    setRunning(true);
    setResult(null);
    setSavedFor(null);
    setResult(await callRun(comment, caption, notes, qa));
    setRunning(false);
  }

  // save an approve / deny verdict
  async function train(verdict: "good" | "bad", correction?: Correction) {
    const d = result?.decision;
    if (!d) return;
    await fetch("/api/playground/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment,
        caption,
        notes,
        miraAction: d.action,
        miraReply: replyOf(d),
        intent: d.intent,
        verdict,
        correctAction: correction?.correctAction,
        idealReply: correction?.idealReply,
        askQuestion: correction?.askQuestion,
        note: correction?.note,
      }),
    });
    setSavedFor(comment);
    loadTraining();
  }

  async function delTraining(id: string) {
    await fetch(`/api/playground/train?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    loadTraining();
  }

  function loadScenario(s: Scenario) {
    setComment(s.comment);
    setCaption(s.caption || "");
    setNotes(s.notes || "");
    setQa([]);
    setResult(null);
    setSavedFor(null);
  }

  async function runAll() {
    if (batchRunning) return;
    setBatchRunning(true);
    setBatch({});
    for (const s of [...DO_CASES, ...DONT_CASES]) {
      const res = await callRun(s.comment, s.caption || "", s.notes || "", []);
      setBatch((b) => ({ ...b, [s.label]: res }));
    }
    setBatchRunning(false);
  }

  const goodCount = training.filter((t) => t.verdict === "good").length;
  const badCount = training.length - goodCount;

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-6xl mx-auto">
        {/* header */}
        <div className="flex items-center gap-3 mb-1">
          <h1 className="display" style={{ fontSize: 30 }}>Mira Playground</h1>
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-lg"
            style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
            train · dry run
          </span>
          <a href="/" className="ml-auto text-[12.5px] font-semibold" style={{ color: "var(--accent)" }}>
            ← back to app
          </a>
        </div>
        <p className="text-[13px] mb-6" style={{ color: "var(--text-subtle)" }}>
          Test Mira on any made-up comment. Approve good replies and correct bad ones —
          every verdict is fed back into the live reply engine as a trained example.
          Nothing here touches Instagram.
        </p>

        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
          {/* ── left: build + run + verdict ──────────────────────────── */}
          <div className="space-y-4">
            <SectionTitle>1 · Build a scenario</SectionTitle>
            <Field label="Comment (what the follower wrote)">
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                placeholder="e.g. Which bike is this?" className="pg-input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Post caption (optional)">
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2}
                  placeholder="Golden hour #Dominar400" className="pg-input" />
              </Field>
              <Field label="Owner notes (optional)">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  placeholder="shot in Munnar, Dominar 400" className="pg-input" />
              </Field>
            </div>

            {/* dynamic Q&A pairs */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>
                  Owner Q&amp;A on the post (optional)
                </span>
                <button onClick={() => setQa([...qa, { q: "", a: "" }])}
                  className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded"
                  style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}>
                  + add Q&amp;A
                </button>
              </div>
              <div className="mt-1.5 space-y-1.5">
                {qa.map((row, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input value={row.q} placeholder="Question"
                      onChange={(e) => setQa(qa.map((r, j) => (j === i ? { ...r, q: e.target.value } : r)))}
                      className="pg-input" style={{ flex: 1 }} />
                    <input value={row.a} placeholder="Answer"
                      onChange={(e) => setQa(qa.map((r, j) => (j === i ? { ...r, a: e.target.value } : r)))}
                      className="pg-input" style={{ flex: 1 }} />
                    <button onClick={() => setQa(qa.filter((_, j) => j !== i))}
                      className="px-2 rounded-lg text-[13px]" style={{ background: "var(--bg-inset)", color: "var(--text-subtle)" }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={run} disabled={running || !comment.trim()}
              className="w-full h-11 rounded-xl font-bold text-[13.5px] disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
              {running ? "Running Mira…" : "▶ Run Mira"}
            </button>

            {result && (
              <>
                <SectionTitle>2 · Mira&apos;s decision — train it</SectionTitle>
                <ResultCard
                  result={result}
                  saved={savedFor === comment}
                  onApprove={() => train("good")}
                  onDeny={(correction) => train("bad", correction)}
                />
              </>
            )}
          </div>

          {/* ── right: training memory + suite ───────────────────────── */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SectionTitle>Training memory</SectionTitle>
                <span className="ml-auto text-[11px] font-semibold" style={{ color: "var(--text-subtle)" }}>
                  <span style={{ color: "#3fae6b" }}>{goodCount} good</span>
                  {" · "}
                  <span style={{ color: "#d06a6a" }}>{badCount} fixed</span>
                </span>
              </div>
              <p className="text-[11.5px] mb-2" style={{ color: "var(--text-subtle)" }}>
                These examples are injected into every live reply. Mira mirrors them.
              </p>
              <TrainingPanel training={training} onDelete={delTraining} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <SectionTitle>Test suite</SectionTitle>
                <button onClick={runAll} disabled={batchRunning}
                  className="ml-auto text-[12px] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                  style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}>
                  {batchRunning ? "Running all…" : "Run all"}
                </button>
              </div>
              <CaseGroup title="✅ Should reply" cases={DO_CASES} batch={batch} onLoad={loadScenario} />
              <div className="h-3" />
              <CaseGroup title="🚫 Should skip" cases={DONT_CASES} batch={batch} onLoad={loadScenario} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pg-input {
          width: 100%;
          background: var(--bg-inset);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 13px;
          resize: vertical;
          outline: none;
        }
        .pg-input:focus { border-color: var(--accent); }
      `}</style>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13.5px] font-bold">{children}</h2>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ResultCard({
  result,
  saved,
  onApprove,
  onDeny,
}: {
  result: RunResult;
  saved: boolean;
  onApprove: () => void;
  onDeny: (c: Correction) => void;
}) {
  const [denyMode, setDenyMode] = useState(false);
  const [act, setAct] = useState<CorrectAction>("reply");
  const [ideal, setIdeal] = useState("");
  const [askQ, setAskQ] = useState("");
  const [note, setNote] = useState("");

  if (result.error) {
    return (
      <div className="rounded-xl p-4 text-[13px]" style={{ background: "#8a3a3a", color: "#ffecec" }}>
        Error: {result.error}
      </div>
    );
  }
  const d = result.decision;
  if (!d) return null;
  const b = BADGE[d.action];

  function saveCorrection() {
    onDeny({
      correctAction: act,
      idealReply: act === "reply" && ideal.trim() ? ideal.trim() : undefined,
      askQuestion: act === "ask_owner" && askQ.trim() ? askQ.trim() : undefined,
      note: note.trim() || undefined,
    });
  }

  const ACTIONS: { key: CorrectAction; label: string; desc: string }[] = [
    { key: "reply", label: "Reply with this", desc: "send a specific reply" },
    { key: "ask_owner", label: "Ask me first", desc: "raise a question, don't guess" },
    { key: "skip", label: "Stay silent", desc: "no reply at all" },
  ];

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--bg-elev)", boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ background: b.bg, color: b.fg }}>
          {b.label}
        </span>
        <span className="text-[11px] font-semibold px-2 py-1 rounded-lg"
          style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}>
          intent: {d.intent}
        </span>
        {result.ms != null && (
          <span className="ml-auto text-[11px]" style={{ color: "var(--text-subtle)" }}>{result.ms} ms</span>
        )}
      </div>

      {(d.action === "send" || d.action === "draft") && <Out label="Reply" text={d.text} />}
      {d.action === "send" && d.dmText && <Out label="DM" text={d.dmText} />}
      {d.action === "clarify" && <Out label={`Asks owner (${d.kind})`} text={d.question} />}
      {d.action === "skip" && (
        <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          Skipped — reason: <b>{d.reason}</b>{d.hide && " · hidden from public"}
        </p>
      )}

      {/* verdict controls */}
      {saved ? (
        <div className="text-[12.5px] font-semibold" style={{ color: "#3fae6b" }}>
          ✓ Saved to training memory
        </div>
      ) : denyMode ? (
        <div className="space-y-3 pt-1">
          <div>
            <span className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>
              What should Mira have done?
            </span>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
              {ACTIONS.map((a) => (
                <button key={a.key} onClick={() => setAct(a.key)}
                  className="rounded-lg p-2 text-left"
                  style={
                    act === a.key
                      ? { background: "var(--accent)", color: "var(--accent-fg)" }
                      : { background: "var(--bg-inset)", color: "var(--text-muted)" }
                  }>
                  <div className="text-[12px] font-bold">{a.label}</div>
                  <div className="text-[10px] opacity-80 leading-tight mt-0.5">{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {act === "reply" && (
            <Field label="The exact reply to send (this text goes to the follower verbatim)">
              <textarea value={ideal} onChange={(e) => setIdeal(e.target.value)} rows={2}
                placeholder="e.g. That's a Dominar 400 🏍" className="pg-input" />
            </Field>
          )}
          {act === "ask_owner" && (
            <Field label="What should Mira ask you? (optional)">
              <textarea value={askQ} onChange={(e) => setAskQ(e.target.value)} rows={2}
                placeholder="e.g. What's the location of this post?" className="pg-input" />
            </Field>
          )}
          {act === "skip" && (
            <p className="text-[12px]" style={{ color: "var(--text-subtle)" }}>
              Mira will stay silent on comments like this — no reply, no draft.
            </p>
          )}

          <Field label="Rule / why — guidance for Mira, never sent to anyone">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="e.g. never state a location that isn't in the post context" className="pg-input" />
          </Field>

          <div className="flex gap-2">
            <button onClick={saveCorrection}
              className="flex-1 h-9 rounded-lg font-bold text-[12.5px]"
              style={{ background: "#8a3a3a", color: "#ffecec" }}>
              Save correction
            </button>
            <button onClick={() => setDenyMode(false)}
              className="px-4 h-9 rounded-lg font-semibold text-[12.5px]"
              style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 pt-1">
          <button onClick={onApprove}
            className="flex-1 h-9 rounded-lg font-bold text-[12.5px]"
            style={{ background: "#1f7a4d", color: "#eafff3" }}>
            ✓ Approve — Mira did well
          </button>
          <button onClick={() => setDenyMode(true)}
            className="flex-1 h-9 rounded-lg font-bold text-[12.5px]"
            style={{ background: "var(--bg-inset)", color: "#d06a6a" }}>
            ✗ Deny — correct it
          </button>
        </div>
      )}
    </div>
  );
}

function Out({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>
        {label}
      </span>
      <p className="text-[14px] mt-0.5" style={{ color: "var(--text)" }}>{text}</p>
    </div>
  );
}

// one-line summary of what a training example teaches
function trainingSummary(t: TrainingExample): string {
  if (t.verdict === "good") {
    if (t.miraAction === "skip") return "✓ stay silent — correct";
    if (t.miraAction === "clarify") return "✓ ask the owner — correct";
    return `✓ ${t.miraReply}`;
  }
  const a = t.correctAction || "reply";
  if (a === "skip") return "→ stay silent";
  if (a === "ask_owner")
    return `→ ask the owner${t.askQuestion ? `: "${t.askQuestion}"` : " first"}`;
  return `→ reply: ${t.idealReply || "(no text)"}`;
}

function TrainingPanel({
  training,
  onDelete,
}: {
  training: TrainingExample[];
  onDelete: (id: string) => void;
}) {
  if (!training.length) {
    return (
      <div className="rounded-xl p-6 text-center text-[12px]"
        style={{ background: "var(--bg-inset)", color: "var(--text-subtle)" }}>
        No training yet. Run a comment, then Approve or Deny it.
      </div>
    );
  }
  return (
    <div className="space-y-1.5 max-h-[340px] overflow-y-auto scrollbar-thin pr-1">
      {training.map((t) => (
        <div key={t.id} className="rounded-xl p-2.5"
          style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0"
              style={{ background: t.verdict === "good" ? "#3fae6b" : "#d06a6a" }} />
            <span className="text-[12px] font-bold truncate">{t.comment}</span>
            <button onClick={() => onDelete(t.id)}
              className="ml-auto text-[12px] shrink-0" style={{ color: "var(--text-subtle)" }}>✕</button>
          </div>
          <p className="text-[11.5px] mt-1" style={{ color: "var(--text-muted)" }}>
            {trainingSummary(t)}
          </p>
          {t.note && (
            <p className="text-[11px] mt-0.5 italic" style={{ color: "var(--text-subtle)" }}>
              rule: {t.note}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function CaseGroup({
  title,
  cases,
  batch,
  onLoad,
}: {
  title: string;
  cases: Scenario[];
  batch: Record<string, RunResult>;
  onLoad: (s: Scenario) => void;
}) {
  return (
    <div>
      <h3 className="text-[12px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>{title}</h3>
      <div className="space-y-1.5">
        {cases.map((c) => {
          const got = batch[c.label]?.decision?.action;
          const pass = got ? got === c.expect : undefined;
          return (
            <button key={c.label} onClick={() => onLoad(c)}
              className="w-full text-left rounded-xl p-2.5"
              style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold">{c.label}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: "var(--bg-elev)", color: "var(--text-subtle)" }}>
                  expect: {c.expect}
                </span>
                {pass !== undefined && (
                  <span className="ml-auto text-[11px] font-bold"
                    style={{ color: pass ? "#3fae6b" : "#d06a6a" }}>
                    {pass ? `✓ ${got}` : `✗ got ${got}`}
                  </span>
                )}
              </div>
              <p className="text-[11.5px] mt-1 italic" style={{ color: "var(--text-muted)" }}>“{c.comment}”</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-subtle)" }}>{c.why}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
