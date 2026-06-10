"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, RefreshCw, Loader2 } from "lucide-react";

type Props = { open: boolean; onClose: () => void; onAccountChange: () => void };

export function SettingsPanel({ open, onClose, onAccountChange }: Props) {
  const [account, setAccount]   = useState<{ username: string; igUserId: string } | null>(null);
  const [mode, setMode]         = useState<"auto" | "shadow">("auto");
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/ig/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.account) setAccount(d.account);
        setMode(d.replyMode === "shadow" ? "shadow" : "auto");
      })
      .catch(() => {});
  }, [open]);

  async function switchMode(m: "auto" | "shadow") {
    setMode(m);
    await fetch("/api/ig/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: m }),
    }).catch(() => {});
  }

  async function syncPosts() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const r = await fetch("/api/ig/posts/sync", { method: "POST" });
      const j = await r.json() as { count?: number };
      setSyncMsg(`Synced ${j.count ?? 0} posts`);
    } catch {
      setSyncMsg("Sync failed");
    }
    setSyncing(false);
  }

  async function disconnect() {
    await fetch("/api/ig/disconnect", { method: "POST" });
    onAccountChange();
    onClose();
    window.location.reload();
  }

  async function switchAccount() {
    await fetch("/api/ig/disconnect", { method: "POST" });
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

              {/* mode */}
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#444" }}>Reply mode</p>
                <div className="flex gap-2">
                  {(["auto", "shadow"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className="flex-1 py-2 rounded-xl text-[12px] font-semibold capitalize"
                      style={mode === m
                        ? { background: "#3b82f6", color: "#fff" }
                        : { background: "#111", border: "1px solid #1e1e1e", color: "#555" }
                      }
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] mt-2" style={{ color: "#333" }}>
                  {mode === "auto" ? "Mira sends everything automatically." : "Mira drafts only — nothing is sent."}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
