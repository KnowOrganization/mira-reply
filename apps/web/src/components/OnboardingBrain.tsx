"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Brain } from "./Brain";
import { useBrain } from "@/lib/api/hooks";
import { api } from "@/lib/api/client";
import { MiraLogo } from "./MiraLogo";

const MIN_FACTS = 3;

type BrainResp = { total?: number };

/**
 * Brain-first onboarding step. Shown after Instagram is connected, before the
 * dashboard unlocks. Strongly prompts the owner to train the brain (so Mira
 * knows what they sell, who they are, key links) but allows Skip — Mira just
 * stays draft-only until the brain is trained.
 */
export function OnboardingBrain() {
  const qc = useQueryClient();
  const { data } = useBrain<BrainResp>();
  const total = data?.total ?? 0;
  const ready = total >= MIN_FACTS;
  const [busy, setBusy] = useState(false);

  async function advance(action: "complete" | "skip") {
    if (busy) return;
    setBusy(true);
    try {
      await api.post("/api/ig/onboarding", { action });
      await qc.invalidateQueries({ queryKey: ["ig", "status"] });
    } catch {
      toast.error("Couldn't save — try again");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: "var(--bg-frame)" }}>
      {/* header */}
      <div
        className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-frame)" }}
      >
        <div className="flex items-center gap-3">
          <MiraLogo size={28} />
          <div>
            <div className="flex items-center gap-2 text-[14px] font-bold">
              Train your brain
            </div>
            <div className="text-[12px]" style={{ color: "var(--text-subtle)" }}>
              Step 2 of 2 · Teach Mira who you are so it can reply for you
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[12px]" style={{ color: ready ? "var(--accent-deep)" : "var(--text-subtle)" }}>
            {total} fact{total === 1 ? "" : "s"} {ready ? "· ready" : `· ${Math.max(0, MIN_FACTS - total)} more to go`}
          </span>
          <button
            onClick={() => advance("skip")}
            disabled={busy}
            className="h-9 px-3.5 rounded-xl text-[13px] font-semibold disabled:opacity-50"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
          >
            Skip for now
          </button>
          <motion.button
            whileHover={ready ? { y: -1 } : undefined}
            whileTap={ready ? { scale: 0.98 } : undefined}
            onClick={() => advance("complete")}
            disabled={busy || !ready}
            className="h-9 px-4 rounded-xl flex items-center gap-1.5 text-[13px] font-bold disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {busy ? "Saving…" : "Continue"} <ArrowRight size={15} />
          </motion.button>
        </div>
      </div>

      {/* why-this-matters strip */}
      <div
        className="px-6 py-3 text-[12.5px]"
        style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
      >
        Mira always builds the brain first. Add a few facts — what you sell, your gear, your
        links — and Mira can answer comments and DMs in your voice. Until then it drafts replies
        for you to approve.
      </div>

      {/* the brain editor */}
      <div className="flex-1 overflow-auto">
        <Brain />
      </div>
    </div>
  );
}
