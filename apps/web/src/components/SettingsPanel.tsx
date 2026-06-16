"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, RefreshCw, Loader2 } from "lucide-react";
import { useStatus, useSetChannelMode, useSyncPosts, useDisconnect, type IgStatus } from "@/lib/api/hooks";

type Props = { open: boolean; onClose: () => void; onAccountChange: () => void };
type ChannelMode = "shadow" | "assisted" | "auto";

export function SettingsPanel({ open, onClose, onAccountChange }: Props) {
  const [syncMsg, setSyncMsg]   = useState("");

  const { data: status } = useStatus<IgStatus & { account: { username: string; igUserId: string } | null }>({
    enabled: open,
  });
  const account = status?.account ?? null;
  const brainReady = status?.brainReady ?? true;
  // Read modes straight off the status cache — useSetChannelMode updates it
  // optimistically, so no local mirror state (and no setState-in-effect).
  const commentMode = (status?.commentMode as ChannelMode) ?? "assisted";
  const dmMode = (status?.dmMode as ChannelMode) ?? "auto";
  const setModeMut = useSetChannelMode();
  const syncMut = useSyncPosts();
  const disconnectMut = useDisconnect();
  const syncing = syncMut.isPending;

  const switchComment = (m: ChannelMode) => setModeMut.mutate({ commentMode: m });
  const switchDm = (m: ChannelMode) => setModeMut.mutate({ dmMode: m });

  async function syncPosts() {
    setSyncMsg("");
    try {
      const j = await syncMut.mutateAsync();
      setSyncMsg(`Synced ${j.count ?? 0} posts`);
    } catch {
      setSyncMsg("Sync failed");
    }
  }

  async function disconnect() {
    await disconnectMut.mutateAsync();
    onAccountChange();
    onClose();
    window.location.reload();
  }

  async function switchAccount() {
    await disconnectMut.mutateAsync();
    window.location.href = "/api/ig/connect?switch=1";
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={onClose}
          />

          {/* panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[280px] flex flex-col"
            style={{ background: "var(--bg-elev)", borderLeft: "1px solid var(--border)" }}
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Settings</span>
              <button onClick={onClose} style={{ color: "var(--text-subtle)" }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 px-5 py-5 space-y-6 overflow-y-auto">
              {/* account */}
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-subtle)" }}>Account</p>
                {account ? (
                  <div className="rounded-xl p-3 space-y-3" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                      <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>@{account.username}</span>
                    </div>
                    <button
                      onClick={switchAccount}
                      className="w-full text-[12px] py-1.5 rounded-lg text-left px-2"
                      style={{ color: "var(--accent)", background: "transparent" }}
                    >
                      Switch account →
                    </button>
                    <button
                      onClick={disconnect}
                      className="w-full flex items-center gap-2 text-[12px] py-1.5 rounded-lg px-2"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      <LogOut size={12} /> Disconnect
                    </button>
                  </div>
                ) : (
                  <p className="text-[12px]" style={{ color: "var(--text-subtle)" }}>Not connected</p>
                )}
              </div>

              {/* sync */}
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-subtle)" }}>Posts</p>
                <button
                  onClick={syncPosts}
                  disabled={syncing}
                  className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-xl disabled:opacity-50"
                  style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Sync posts
                </button>
                {syncMsg && <p className="text-[11px] mt-2" style={{ color: "var(--text-subtle)" }}>{syncMsg}</p>}
              </div>

              {/* reply modes — per channel */}
              <div className="space-y-5">
                {!brainReady && (
                  <div
                    className="rounded-xl px-3 py-2.5 text-[11px] leading-4"
                    style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)" }}
                  >
                    Train your brain to turn on auto-replies. Until then Mira drafts only.
                  </div>
                )}

                <ModeRow
                  label="Comments"
                  hint={{
                    shadow: "Mira drafts only — nothing is posted.",
                    assisted: "Mira drafts a reply; you approve before it posts.",
                    auto: "Mira replies to comments automatically.",
                  }}
                  value={commentMode}
                  onChange={switchComment}
                />
                <ModeRow
                  label="DMs"
                  hint={{
                    shadow: "Mira drafts only — nothing is sent.",
                    assisted: "Mira drafts a reply; you approve before it sends.",
                    auto: "Mira answers DMs conversationally on its own.",
                  }}
                  value={dmMode}
                  onChange={switchDm}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

type ChannelModeT = "shadow" | "assisted" | "auto";
function ModeRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: Record<ChannelModeT, string>;
  value: ChannelModeT;
  onChange: (m: ChannelModeT) => void;
}) {
  const modes: ChannelModeT[] = ["shadow", "assisted", "auto"];
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-subtle)" }}>{label}</p>
      <div className="flex gap-2">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className="flex-1 py-2 rounded-xl text-[11.5px] font-semibold capitalize"
            style={value === m
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { background: "var(--bg-inset)", border: "1px solid var(--border)", color: "var(--text-muted)" }
            }
          >
            {m}
          </button>
        ))}
      </div>
      <p className="text-[10px] mt-2" style={{ color: "var(--text-subtle)" }}>{hint[value]}</p>
    </div>
  );
}
