"use client";

import { useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import type { PendingDraft } from "./types";

// Read-only — the draft is AI-generated, never hand-edited before sending.
export function DraftBox({
  draft,
  onApprove,
  onReject,
}: {
  draft: PendingDraft;
  onApprove: (d: PendingDraft, text: string) => Promise<void>;
  onReject: (d: PendingDraft) => Promise<void>;
}) {
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
      <div
        className="w-full px-3 py-2 rounded-lg border text-[13px] whitespace-pre-wrap"
        style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}
      >
        {draft.draftText}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={async () => {
            setBusy(true);
            await onApprove(draft, draft.draftText).finally(() => setBusy(false));
          }}
          disabled={busy || !draft.draftText.trim()}
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
