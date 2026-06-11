"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, X } from "lucide-react";
import { useDigest } from "@/lib/api/hooks";

type DigestBannerData = {
  inbox: number;
  repliedAuto: number;
  pending: number;
  needsInput: number;
  topTheme: { name: string; count: number } | null;
};

export function DigestBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [alreadyShown] = useState(() => {
    if (typeof window === "undefined") return false;
    const key = "mira.digest." + new Date().toISOString().slice(0, 10);
    return !!localStorage.getItem(key);
  });

  const { data: dg } = useDigest<DigestBannerData>({ enabled: !alreadyShown && !dismissed });
  const show = !alreadyShown && !dismissed && !!dg && typeof dg.inbox === "number";

  if (!show || !dg) return null;

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(
      "mira.digest." + new Date().toISOString().slice(0, 10),
      "1"
    );
  }

  return (
    <div className="px-5 pt-5">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-3.5 flex items-start gap-2.5"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elev)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <Activity size={14} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
        <div
          className="flex-1 text-[12.5px] leading-5"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="font-medium" style={{ color: "var(--text)" }}>
            Your daily digest.{" "}
          </span>
          Mira saw <b style={{ color: "var(--text)" }}>{dg.inbox}</b> new comment
          {dg.inbox === 1 ? "" : "s"}, auto-replied to{" "}
          <b style={{ color: "var(--text)" }}>{dg.repliedAuto}</b>, has{" "}
          <b style={{ color: "var(--text)" }}>{dg.pending}</b> waiting for you
          {dg.needsInput > 0 && (
            <>
              {" "}and <b style={{ color: "var(--accent)" }}>{dg.needsInput}</b> that need your
              input
            </>
          )}
          .
          {dg.topTheme && (
            <>
              {" "}
              Most-asked: <b style={{ color: "var(--text)" }}>{dg.topTheme.name}</b>.
            </>
          )}
        </div>
        <button
          onClick={dismiss}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          style={{ color: "var(--text-subtle)" }}
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </motion.div>
    </div>
  );
}
