"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, RefreshCw, Loader2, Plus, Trash2 } from "lucide-react";
import { useStatus, useSetChannelMode, useSyncPosts, useDisconnect, useKb, useAddKb, useDeleteKb, useAiSettings, usePatchAiSettings, useBrainStatus, useRebuildBrain, type IgStatus } from "@/lib/api/hooks";
import { useMe } from "@/lib/api/teamHooks";

type Props = { open: boolean; onClose: () => void; onAccountChange: () => void };
type ChannelMode = "shadow" | "assisted" | "auto";

export function SettingsPanel({ open, onClose, onAccountChange }: Props) {
  const [syncMsg, setSyncMsg]   = useState("");

  const { data: status } = useStatus<IgStatus & { account: { username: string; igUserId: string } | null }>({
    enabled: open,
  });
  const { data: me } = useMe();
  const canManage = !!me?.canManage; // owner/admin — may change modes, disconnect
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
                    {canManage && (
                      <>
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
                      </>
                    )}
                    {me?.accountRole && (
                      <p className="text-[10.5px] px-2" style={{ color: "var(--text-subtle)" }}>You're {me.accountRole} on this account</p>
                    )}
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

                {!canManage && (
                  <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>Only admins can change reply modes.</p>
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
                  disabled={!canManage}
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
                  disabled={!canManage}
                />
              </div>

              {/* brain */}
              <BrainSection canManage={canManage} />

              {/* ai provider */}
              <AiSection canManage={canManage} />

              {/* knowledge base */}
              <KbSection canManage={canManage} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function BrainSection({ canManage }: { canManage: boolean }) {
  const { data } = useBrainStatus();
  const rebuild = useRebuildBrain();
  if (!data) return null;
  const built = data.builtAt
    ? new Date(data.builtAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "never";

  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-subtle)" }}>Brain</p>
      <div className="rounded-xl p-3 space-y-1.5" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
        <div className="flex justify-between text-[11.5px]"><span style={{ color: "var(--text-subtle)" }}>Facts</span><span style={{ color: "var(--text)" }}>{data.factCount}</span></div>
        <div className="flex justify-between text-[11.5px]"><span style={{ color: "var(--text-subtle)" }}>Style samples</span><span style={{ color: "var(--text)" }}>{data.styleSampleCount}</span></div>
        <div className="flex justify-between text-[11.5px]"><span style={{ color: "var(--text-subtle)" }}>Last built</span><span style={{ color: "var(--text)" }}>{built}</span></div>
        {data.gaps.length > 0 && (
          <p className="text-[10.5px] pt-1" style={{ color: "var(--text-subtle)" }}>Gaps: {data.gaps.join(", ")}</p>
        )}
        {canManage && (
          <button onClick={() => rebuild.mutate()} disabled={rebuild.isPending}
            className="w-full mt-1 h-8 rounded-md text-[11.5px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
            {rebuild.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Rebuild brain
          </button>
        )}
      </div>
    </div>
  );
}

function AiSection({ canManage }: { canManage: boolean }) {
  const { data } = useAiSettings();
  const patch = usePatchAiSettings();
  const [key, setKey] = useState("");
  if (!data) return null;
  const providers: Array<"claude" | "ollama"> = ["claude", "ollama"];

  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-subtle)" }}>AI provider</p>
      <div className="flex gap-2 mb-2" style={!canManage ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
        {providers.map((p) => (
          <button key={p} onClick={() => patch.mutate({ provider: p })}
            className="flex-1 py-2 rounded-xl text-[11.5px] font-semibold capitalize"
            style={data.provider === p
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { background: "var(--bg-inset)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            {p}
          </button>
        ))}
      </div>
      <p className="text-[10px] mb-2" style={{ color: "var(--text-subtle)" }}>Model: {data.model}</p>
      {canManage && (
        <div className="flex items-center gap-2">
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
            placeholder={data.byokKeySet ? "Key set — enter new to replace" : "Bring your own API key"}
            className="flex-1 h-8 px-2.5 rounded-md border bg-transparent text-[12px] outline-none focus:border-strong" style={{ borderColor: "var(--border-strong)" }} />
          <button onClick={() => { patch.mutate({ byokKey: key }); setKey(""); }} disabled={!key.trim()}
            className="h-8 px-2.5 rounded-md text-[11px] font-medium disabled:opacity-40" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>Save</button>
          {data.byokKeySet && (
            <button onClick={() => patch.mutate({ byokKey: null })} title="Clear key"
              className="h-8 px-2 rounded-md text-[11px] border" style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}>Clear</button>
          )}
        </div>
      )}
    </div>
  );
}

function KbSection({ canManage }: { canManage: boolean }) {
  const { data, isLoading } = useKb();
  const entries = data?.entries ?? [];
  const addKb = useAddKb();
  const delKb = useDeleteKb();
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [tags, setTags] = useState("");
  const busy = addKb.isPending;

  async function add() {
    if (!q.trim() || !a.trim() || busy) return;
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    await addKb.mutateAsync({ question: q.trim(), answer: a.trim(), tags: tagList });
    setQ(""); setA(""); setTags("");
  }

  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-subtle)" }}>Knowledge base</p>
      {canManage && (
        <div className="rounded-xl p-2.5 space-y-2 mb-2" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Question"
            className="w-full h-8 px-2.5 rounded-md border bg-transparent text-[12px] outline-none focus:border-strong" style={{ borderColor: "var(--border-strong)" }} />
          <textarea value={a} onChange={(e) => setA(e.target.value)} placeholder="Answer" rows={2}
            className="w-full px-2.5 py-1.5 rounded-md border bg-transparent text-[12px] outline-none focus:border-strong resize-y" style={{ borderColor: "var(--border-strong)" }} />
          <div className="flex items-center gap-2">
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, comma, separated"
              className="flex-1 h-7 px-2 rounded-md border bg-transparent text-[11px] outline-none focus:border-strong" style={{ borderColor: "var(--border-strong)" }} />
            <button onClick={add} disabled={busy || !q.trim() || !a.trim()}
              className="h-7 px-2.5 rounded-md text-[11px] font-medium flex items-center gap-1 disabled:opacity-40" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
            </button>
          </div>
        </div>
      )}
      {isLoading ? (
        <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>No entries yet.</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((e) => (
            <div key={e.id} className="group rounded-lg p-2 flex gap-2" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate" style={{ color: "var(--text)" }}>{e.question}</p>
                <p className="text-[11.5px] leading-4 break-words" style={{ color: "var(--text-muted)" }}>{e.answer}</p>
                {e.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {e.tags.map((t) => (
                      <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border-strong)", color: "var(--text-subtle)" }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
              {canManage && (
                <button onClick={() => delKb.mutate(e.id)} className="p-1 rounded opacity-0 group-hover:opacity-100 transition self-start" style={{ color: "var(--text-muted)" }} aria-label="Delete">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ChannelModeT = "shadow" | "assisted" | "auto";
function ModeRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: Record<ChannelModeT, string>;
  value: ChannelModeT;
  onChange: (m: ChannelModeT) => void;
  disabled?: boolean;
}) {
  const modes: ChannelModeT[] = ["shadow", "assisted", "auto"];
  return (
    <div style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
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
