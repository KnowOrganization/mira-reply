"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useBrainAction } from "@/lib/api/hooks";
import { Sparkles, Loader2 } from "lucide-react";

// ── paste ────────────────────────────────────────────────────────────────
export function Paste({ onSaved }: { onSaved: () => Promise<void> }) {
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
