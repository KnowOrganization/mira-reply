"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X, Link2, Loader2, Sparkles } from "lucide-react";

type Topic = "gear" | "location" | "song" | "personal" | "shop" | "general";

type Fact = {
  id: string;
  question: string;
  answer: string;
  topic: Topic;
  scope: "account" | "post";
  postId?: string;
  link?: { url: string; label: string };
  hitCount: number;
  createdAt: number;
  updatedAt: number;
};

const TOPICS: Topic[] = ["gear", "location", "song", "personal", "shop", "general"];

export function KnowledgeEditor() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [topic, setTopic] = useState<Topic>("general");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/ig/knowledge").then((r) => r.json());
      setFacts(r.facts ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!q.trim() || !a.trim() || busy) return;
    setBusy(true);
    try {
      await fetch("/api/ig/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.trim(), answer: a.trim(), topic, scope: "account" }),
      });
      setQ("");
      setA("");
      setTopic("general");
      toast.success("Mira learned it.");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setFacts((f) => f.filter((x) => x.id !== id));
    await fetch(`/api/ig/knowledge/${id}`, { method: "DELETE" });
  }

  async function save(id: string, patch: Partial<Fact>) {
    await fetch(`/api/ig/knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  const reused = facts.reduce((n, f) => n + f.hitCount, 0);

  return (
    <div className="space-y-3">
      {/* add form */}
      <div
        className="rounded-xl border p-3 space-y-2"
        style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What might people ask?  e.g. which riding jacket is this"
          className="w-full h-9 px-3 rounded-md border bg-transparent text-sm outline-none focus:border-strong"
          style={{ borderColor: "var(--border-strong)" }}
        />
        <textarea
          value={a}
          onChange={(e) => setA(e.target.value)}
          placeholder="The answer Mira should give  (paste a URL to make it a link)"
          rows={2}
          className="w-full px-3 py-2 rounded-md border bg-transparent text-sm outline-none focus:border-strong resize-y"
          style={{ borderColor: "var(--border-strong)" }}
        />
        <div className="flex items-center gap-2">
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value as Topic)}
            className="h-8 px-2 rounded-md border bg-transparent text-xs outline-none focus:border-strong"
            style={{ borderColor: "var(--border-strong)" }}
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
            account-wide — recalled on every post
          </span>
          <button
            onClick={add}
            disabled={busy || !q.trim() || !a.trim()}
            className="ml-auto h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Teach Mira
          </button>
        </div>
      </div>

      {/* stats line */}
      <div className="flex items-center gap-3 text-[11px] px-1" style={{ color: "var(--text-subtle)" }}>
        <span className="inline-flex items-center gap-1">
          <Sparkles size={11} /> {facts.length} fact{facts.length === 1 ? "" : "s"}
        </span>
        {reused > 0 && <span>· reused {reused}× to answer comments</span>}
      </div>

      {/* list */}
      <div className="space-y-1.5">
        {loading ? (
          <div className="text-xs py-4 text-center" style={{ color: "var(--text-subtle)" }}>
            Loading…
          </div>
        ) : facts.length === 0 ? (
          <div
            className="rounded-xl border border-dashed py-7 px-4 text-center text-xs"
            style={{ borderColor: "var(--border-strong)", color: "var(--text-subtle)" }}
          >
            Nothing yet. Teach Mira a few facts so it never has to ask.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {facts.map((f) => (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <FactRow fact={f} onSave={save} onDelete={remove} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function FactRow({
  fact,
  onSave,
  onDelete,
}: {
  fact: Fact;
  onSave: (id: string, patch: Partial<Fact>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState(fact.question);
  const [a, setA] = useState(fact.answer);
  const [topic, setTopic] = useState<Topic>(fact.topic);
  const [scope, setScope] = useState<"account" | "post">(fact.scope);
  const [busy, setBusy] = useState(false);

  async function commit() {
    setBusy(true);
    await onSave(fact.id, { question: q.trim(), answer: a.trim(), topic, scope }).finally(() =>
      setBusy(false)
    );
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        className="rounded-lg border p-2.5 space-y-2"
        style={{ borderColor: "var(--border-strong)", background: "var(--bg-elev)" }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full h-8 px-2.5 rounded-md border bg-transparent text-[13px] outline-none focus:border-strong"
          style={{ borderColor: "var(--border-strong)" }}
        />
        <textarea
          value={a}
          onChange={(e) => setA(e.target.value)}
          rows={2}
          className="w-full px-2.5 py-1.5 rounded-md border bg-transparent text-[13px] outline-none focus:border-strong resize-y"
          style={{ borderColor: "var(--border-strong)" }}
        />
        <div className="flex items-center gap-2">
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value as Topic)}
            className="h-7 px-2 rounded-md border bg-transparent text-[11px] outline-none"
            style={{ borderColor: "var(--border-strong)" }}
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as "account" | "post")}
            className="h-7 px-2 rounded-md border bg-transparent text-[11px] outline-none"
            style={{ borderColor: "var(--border-strong)" }}
            title="account = recalled on every post"
          >
            <option value="account">account</option>
            <option value="post">post</option>
          </select>
          <button
            onClick={commit}
            disabled={busy || !q.trim() || !a.trim()}
            className="ml-auto h-7 px-2.5 rounded-md text-[11px] font-medium flex items-center gap-1 disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="h-7 px-2 rounded-md text-[11px] border"
            style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}
          >
            <X size={11} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group rounded-lg border p-2.5 flex gap-2.5"
      style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="text-[13px] font-medium">{fact.question}</span>
          <Tag>{fact.topic}</Tag>
          <Tag muted>{fact.scope}</Tag>
          {fact.link && <Link2 size={11} style={{ color: "var(--text-subtle)" }} />}
          {fact.hitCount > 0 && (
            <span className="text-[10px]" style={{ color: "var(--accent-deep)" }}>
              reused {fact.hitCount}×
            </span>
          )}
        </div>
        <div className="text-[12.5px] leading-5 break-words" style={{ color: "var(--text-muted)" }}>
          {fact.answer}
        </div>
      </div>
      <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
          aria-label="Edit"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(fact.id)}
          className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
          aria-label="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function Tag({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded border"
      style={{
        borderColor: "var(--border-strong)",
        color: muted ? "var(--text-subtle)" : "var(--text-muted)",
      }}
    >
      {children}
    </span>
  );
}
