"use client";

import { useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import type { PendingDraft } from "./types";

export function DraftBox({
  draft,
  onApprove,
  onReject,
}: {
  draft: PendingDraft;
  onApprove: (d: PendingDraft, text: string) => Promise<void>;
  onReject: (d: PendingDraft) => Promise<void>;
}) {
  const [text, setText] = useState(draft.draftText);
  const [busy, setBusy] = useState(false);

  return (
    <div
      className="mt-2 rounded-2xl border p-3.5"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-elev)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 rounded-lg border bg-transparent text-[13px] outline-none focus:border-strong resize-y"
        style={{ borderColor: "var(--border-strong)" }}
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={async () => {
            setBusy(true);
            await onApprove(draft, text).finally(() => setBusy(false));
          }}
          disabled={busy || !text.trim()}
          className="h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Send
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            await onReject(draft).finally(() => setBusy(false));
          }}
          disabled={busy}
          className="h-8 px-3 rounded-md text-xs border flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5"
          style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}
        >
          <X size={12} /> Reject
        </button>
      </div>
    </div>
  );
}
