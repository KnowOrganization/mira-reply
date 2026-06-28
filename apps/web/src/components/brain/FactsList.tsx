"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBrainAction } from "@/lib/api/hooks";
import { Plus, Trash2 } from "lucide-react";
import { TOPIC } from "./constants";
import type { Fact } from "./types";
import { AddFactForm } from "./AddFactForm";

// ── facts list + manual add ──────────────────────────────────────────────
export function FactsList({
  facts,
  onChanged,
  onPick,
}: {
  facts: Fact[];
  onChanged: () => Promise<void>;
  onPick: (f: Fact) => void;
}) {
  const [adding, setAdding] = useState(false);
  const deleteAction = useBrainAction();

  async function del(id: string) {
    await deleteAction.mutateAsync({ action: "delete", id }).catch(() => {});
    await onChanged();
  }

  return (
    <div>
      <button
        onClick={() => setAdding((a) => !a)}
        className="w-full h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 mb-3"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        <Plus size={13} /> Add a fact manually
      </button>
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <AddFactForm
              onAdded={async () => {
                setAdding(false);
                await onChanged();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {facts.length === 0 && (
        <div
          className="text-[12px] text-center py-10"
          style={{ color: "var(--text-subtle)" }}
        >
          Nothing yet. Run the interview or paste a paragraph.
        </div>
      )}
      <div className="space-y-1.5">
        {facts.map((f) => {
          const t = TOPIC[f.topic];
          return (
            <div
              key={f.id}
              className="group rounded-xl p-2.5 cursor-pointer"
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
              }}
              onClick={() => onPick(f)}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: t?.color || "var(--text-subtle)" }}
                />
                <span
                  className="text-[11px] font-semibold truncate"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {f.question}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    del(f.id);
                  }}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition shrink-0"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="text-[13px] mt-0.5">{f.answer}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
