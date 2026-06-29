"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useBrainAction } from "@/lib/api/hooks";
import { Loader2, Plus } from "lucide-react";
import { BRAIN_TOPICS } from "../BrainGraph";

export function AddFactForm({ onAdded }: { onAdded: () => Promise<void> }) {
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
