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
            style={{ background: "#0d0d0d", borderLeft: "1px solid #1e1e1e" }}
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
              <span className="text-[13px] font-bold" style={{ color: "#e5e5e5" }}>Settings</span>
              <button onClick={onClose} style={{ color: "#555" }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 px-5 py-5 space-y-6 overflow-y-auto">
              {/* account */}
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#444" }}>Account</p>
                {account ? (
                  <div className="rounded-xl p-3 space-y-3" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: "#3b82f6" }} />
                      <span className="text-[13px] font-semibold" style={{ color: "#e5e5e5" }}>@{account.username}</span>
                    </div>
                    <button
                      onClick={switchAccount}
                      className="w-full text-[12px] py-1.5 rounded-lg text-left px-2"
                      style={{ color: "#3b82f6", background: "transparent" }}
                    >
                      Switch account →
                    </button>
                    <button
                      onClick={disconnect}
                      className="w-full flex items-center gap-2 text-[12px] py-1.5 rounded-lg px-2"
                      style={{ color: "#555" }}
                    >
                      <LogOut size={12} /> Disconnect
                    </button>
                  </div>
                ) : (
                  <p className="text-[12px]" style={{ color: "#444" }}>Not connected</p>
                )}
              </div>

              {/* sync */}
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#444" }}>Posts</p>
                <button
                  onClick={syncPosts}
                  disabled={syncing}
                  className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-xl disabled:opacity-50"
                  style={{ background: "#111", border: "1px solid #1e1e1e", color: "#e5e5e5" }}
                >
                  {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Sync posts
                </button>
                {syncMsg && <p className="text-[11px] mt-2" style={{ color: "#555" }}>{syncMsg}</p>}
              </div>

              {/* reply modes — per channel */}
              <div className="space-y-5">
                {!brainReady && (
                  <div
                    className="rounded-xl px-3 py-2.5 text-[11px] leading-4"
                    style={{ background: "rgba(59,130,246,0.1)", color: "#7ab0ff" }}
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
      <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#444" }}>{label}</p>
      <div className="flex gap-2">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className="flex-1 py-2 rounded-xl text-[11.5px] font-semibold capitalize"
            style={value === m
              ? { background: "#3b82f6", color: "#fff" }
              : { background: "#111", border: "1px solid #1e1e1e", color: "#555" }
            }
          >
            {m}
          </button>
        ))}
      </div>
      <p className="text-[10px] mt-2" style={{ color: "#333" }}>{hint[value]}</p>
    </div>
  );
}
