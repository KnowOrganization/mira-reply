"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useBrain, useBrainAction } from "@/lib/api/hooks";
import { MessageSquareText, ClipboardPaste, ListTree } from "lucide-react";
import { BrainGraph, BRAIN_TOPICS } from "./BrainGraph";
import { MiraLogo } from "./MiraLogo";
import { ModeTab, Legend } from "./brain/parts";
import { Interview } from "./brain/Interview";
import { Paste } from "./brain/Paste";
import { FactsList } from "./brain/FactsList";
import { NodeDetail } from "./brain/NodeDetail";
import type { Fact, BrainResp } from "./brain/types";

export function Brain() {
  const [mode, setMode] = useState<"interview" | "paste" | "facts">("interview");
  const [selected, setSelected] = useState<Fact | null>(null);

  const { data, refetch } = useBrain<BrainResp>();
  const deleteAction = useBrainAction();

  const facts = data?.facts || [];
  const total = data?.total || 0;
  const byTopic = data?.byTopic || {};
  const handle = data?.account?.username || "";

  // children call this after a write — refetch and resolve once fresh data lands
  const load = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filledAreas = useMemo(
    () => BRAIN_TOPICS.filter((t) => (byTopic[t.key] || 0) > 0).length,
    [byTopic]
  );
  const strength = Math.round((filledAreas / BRAIN_TOPICS.length) * 100);

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      {/* header */}
      <div
        className="shrink-0 border-b px-6 py-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <MiraLogo size={18} color="var(--accent-fg)" />
          </div>
          <h1 className="display" style={{ fontSize: 22 }}>
            Account Brain
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              Mira knows <b style={{ color: "var(--text)" }}>{total}</b> thing
              {total === 1 ? "" : "s"} across{" "}
              <b style={{ color: "var(--text)" }}>
                {filledAreas}/{BRAIN_TOPICS.length}
              </b>{" "}
              areas
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-24 h-2 rounded-full overflow-hidden"
                style={{ background: "var(--bg-inset)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${strength}%`, background: "var(--accent)" }}
                />
              </div>
              <span
                className="text-[12px] font-bold tabular-nums"
                style={{ color: "var(--accent)" }}
              >
                {strength}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* graph */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center p-6 min-h-0">
            <BrainGraph
              facts={facts}
              handle={handle}
              selectedId={selected?.id || null}
              onSelect={(f) => setSelected(f as Fact | null)}
            />
          </div>
          <Legend />
        </div>

        {/* builder panel */}
        <div
          className="w-[384px] shrink-0 border-l flex flex-col"
          style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
        >
          {/* selected node detail */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <NodeDetail
                  fact={selected}
                  onDelete={async () => {
                    await deleteAction.mutateAsync({ action: "delete", id: selected.id }).catch(() => {});
                    setSelected(null);
                    await load();
                    toast.success("Removed from the brain");
                  }}
                  onClose={() => setSelected(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* mode tabs */}
          <div className="p-3">
            <div
              className="flex p-1 rounded-2xl"
              style={{ background: "var(--bg-inset)" }}
            >
              <ModeTab
                active={mode === "interview"}
                onClick={() => setMode("interview")}
                icon={<MessageSquareText size={14} />}
                label="Interview"
              />
              <ModeTab
                active={mode === "paste"}
                onClick={() => setMode("paste")}
                icon={<ClipboardPaste size={14} />}
                label="Paste"
              />
              <ModeTab
                active={mode === "facts"}
                onClick={() => setMode("facts")}
                icon={<ListTree size={14} />}
                label={`Facts ${total}`}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4">
            {mode === "interview" && <Interview onSaved={load} handle={handle} />}
            {mode === "paste" && <Paste onSaved={load} />}
            {mode === "facts" && (
              <FactsList facts={facts} onChanged={load} onPick={setSelected} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
