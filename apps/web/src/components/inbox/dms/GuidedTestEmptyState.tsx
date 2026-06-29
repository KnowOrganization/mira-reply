"use client";

import { useState } from "react";
import { Inbox as InboxIcon, RefreshCw, Check, Copy } from "lucide-react";
import { useStatus, type IgStatus } from "@/lib/api/hooks";

// Empty-inbox state with a guided live test: tells the owner exactly which
// handle to DM and gives a ready-to-send suggested message to copy.
export function GuidedTestEmptyState({ syncing }: { syncing: boolean }) {
  const status = useStatus<IgStatus>();
  const username = status.data?.account?.username;
  const [copied, setCopied] = useState(false);
  const suggested = "Hey! Do you have the catalog?";
  const copy = () => {
    navigator.clipboard.writeText(suggested).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (syncing) {
    return (
      <div className="p-8 text-center text-xs flex flex-col items-center gap-2" style={{ color: "var(--text-subtle)" }}>
        <RefreshCw size={16} className="animate-spin" style={{ opacity: 0.6 }} />
        Loading your latest DMs from Instagram…
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col items-center gap-3 text-center">
      <InboxIcon size={20} style={{ opacity: 0.4, color: "var(--text-subtle)" }} />
      <div className="text-[12.5px] font-semibold" style={{ color: "var(--text)" }}>No conversations yet</div>
      <div className="text-[11px] leading-relaxed max-w-[230px]" style={{ color: "var(--text-subtle)" }}>
        Test it live — from another Instagram account, DM{" "}
        {username ? <b style={{ color: "var(--accent)" }}>@{username}</b> : "your connected account"} and it shows up here within seconds.
      </div>
      <div className="w-full rounded-xl p-3 mt-1" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
        <div className="text-[9px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-subtle)" }}>
          Suggested test message
        </div>
        <div className="text-[12.5px]" style={{ color: "var(--text)" }}>“{suggested}”</div>
        <button
          onClick={copy}
          className="mt-2.5 text-[10.5px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 mx-auto"
          style={{ background: copied ? "rgba(34,197,94,0.15)" : "var(--accent)", color: copied ? "#22c55e" : "#fff" }}
        >
          {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy message</>}
        </button>
      </div>
    </div>
  );
}
