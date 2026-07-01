"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Plus, Trash2, LogOut, X, Check, User, Users, MessageSquare, BrainCircuit, Bot, BookOpen } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { qk, useStatus, useSetChannelMode, useSyncPosts, useDisconnect, useKb, useAddKb, useDeleteKb, useAiSettings, usePatchAiSettings, useBrainStatus, useRebuildBrain, type IgStatus } from "@/lib/api/hooks";
import { useMe, useAccounts, tk } from "@/lib/api/teamHooks";
import { getActiveAccount, setActiveAccount } from "@/lib/api/activeAccount";
import { useConnectAccount } from "@/lib/api/connectAccount";
import { Modal } from "./ui/Modal";
import { Avatar } from "./ui/Avatar";
import { TeamView } from "./workspace/TeamView";

const TABS = [
  { id: "account", label: "Account", icon: <User size={14} /> },
  { id: "team", label: "Team & access", icon: <Users size={14} /> },
  { id: "replies", label: "Replies", icon: <MessageSquare size={14} /> },
  { id: "brain", label: "Brain", icon: <BrainCircuit size={14} /> },
  { id: "ai", label: "AI provider", icon: <Bot size={14} /> },
  { id: "knowledge", label: "Knowledge", icon: <BookOpen size={14} /> },
] as const;
export type SettingsTab = (typeof TABS)[number]["id"];

type Props = { open: boolean; onClose: () => void; onAccountChange: () => void; initialTab?: SettingsTab };

export function SettingsPanel({ open, onClose, onAccountChange, initialTab = "account" }: Props) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  useEffect(() => { if (open) setTab(initialTab); }, [open, initialTab]);

  const { data: me } = useMe();
  const canManage = !!me?.canManage;

  return (
    <Modal open={open} onClose={onClose} width={780}>
      <div className="flex" style={{ height: "min(640px, 82vh)" }}>
        {/* tab rail */}
        <div className="w-[184px] shrink-0 flex flex-col gap-0.5 p-3" style={{ borderRight: "1px solid var(--border)", background: "var(--bg-elev)" }}>
          <div className="px-2 pt-1 pb-3 text-[13px] font-bold" style={{ color: "var(--text)" }}>Settings</div>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] text-left transition"
                style={active
                  ? { background: "var(--accent-soft)", color: "var(--accent-deep)", fontWeight: 600 }
                  : { background: "transparent", color: "var(--text-subtle)" }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.05)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ opacity: active ? 1 : 0.7 }}>{t.icon}</span>{t.label}
              </button>
            );
          })}
        </div>

        {/* content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-end px-4 py-3 shrink-0">
            <button onClick={onClose} style={{ color: "var(--text-subtle)" }} aria-label="Close"><X size={16} /></button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 scrollbar-thin">
            {tab === "account" && <AccountTab canManage={canManage} accountRole={me?.accountRole ?? null} onAccountChange={onAccountChange} onClose={onClose} />}
            {tab === "team" && <TeamView />}
            {tab === "replies" && <RepliesTab canManage={canManage} open={open} />}
            {tab === "brain" && <BrainSection canManage={canManage} />}
            {tab === "ai" && <AiSection canManage={canManage} />}
            {tab === "knowledge" && <KbSection canManage={canManage} />}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-subtle)" }}>{children}</p>;
}

function AccountTab({ canManage, accountRole, onAccountChange, onClose }: { canManage: boolean; accountRole: string | null; onAccountChange: () => void; onClose: () => void }) {
  const { data: status } = useStatus<IgStatus & { account: { username: string; igUserId: string } | null }>();
  const { data: acctData } = useAccounts();
  const disconnectMut = useDisconnect();
  const account = status?.account ?? null;
  const accounts = acctData?.accounts ?? [];
  const activeAccount = getActiveAccount();

  const queryClient = useQueryClient();
  const { state: connectState, connect } = useConnectAccount(() => {
    queryClient.invalidateQueries({ queryKey: tk.accounts });
    queryClient.invalidateQueries({ queryKey: qk.status });
  });

  async function disconnect() {
    await disconnectMut.mutateAsync();
    onAccountChange();
    onClose();
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Current account</SectionLabel>
        {account ? (
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
            <Avatar name={account.username} size={34} />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text)" }}>@{account.username}</div>
              {accountRole && <div className="text-[11px]" style={{ color: "var(--text-subtle)" }}>You're {accountRole} on this account</div>}
            </div>
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: "var(--text-subtle)" }}>Not connected</p>
        )}
      </div>

      {accounts.length > 0 && (
        <div>
          <SectionLabel>Switch account</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {accounts.map((a) => {
              const active = activeAccount ? activeAccount === a.accountId : a.username === account?.username;
              return (
                <button key={a.accountId} onClick={() => setActiveAccount(a.accountId, a.orgId)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left"
                  style={{ background: active ? "var(--accent-soft)" : "var(--bg-inset)", border: "1px solid var(--border)" }}>
                  <Avatar name={a.username || a.accountId} size={24} />
                  <span className="text-[13px] font-medium truncate flex-1" style={{ color: active ? "var(--accent-deep)" : "var(--text)" }}>@{a.username || a.accountId}</span>
                  <span className="text-[10px] uppercase shrink-0" style={{ color: "var(--text-subtle)" }}>{a.role}</span>
                  {active && <Check size={14} style={{ color: "var(--accent-deep)" }} />}
                </button>
              );
            })}
          </div>
          <button onClick={() => connect()} disabled={connectState.status === "busy"}
            className="flex items-center gap-2 mt-2 px-3 py-2 text-[12.5px] rounded-xl disabled:opacity-50"
            style={{ color: "var(--accent)" }}>
            <Plus size={13} /> {connectState.status === "busy" ? "Waiting for Instagram…" : "Connect new account"}
          </button>
          {connectState.status === "error" && (
            <p className="text-[11px] mt-1.5" style={{ color: "#9a3525" }}>{connectState.reason}</p>
          )}
          {connectState.status === "conflict" && (
            <p className="text-[11px] mt-1.5 leading-4" style={{ color: "#9a3525" }}>
              @{connectState.username || connectState.accountId} is managed in another workspace.{" "}
              <button onClick={() => connect({ transfer: true })} className="font-bold hover:underline">
                Transfer it here →
              </button>
            </p>
          )}
        </div>
      )}

      {account && canManage && (
        <div>
          <SectionLabel>Danger zone</SectionLabel>
          <button onClick={disconnect} disabled={disconnectMut.isPending}
            className="flex items-center gap-2 px-3 py-2 text-[12.5px] rounded-xl disabled:opacity-50"
            style={{ color: "#ef4444", border: "1px solid var(--border)" }}>
            {disconnectMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />} Disconnect @{account.username}
          </button>
        </div>
      )}
    </div>
  );
}

function RepliesTab({ canManage, open }: { canManage: boolean; open: boolean }) {
  const [syncMsg, setSyncMsg] = useState("");
  const { data: status } = useStatus<IgStatus & { account: { username: string; igUserId: string } | null }>({ enabled: open });
  const brainReady = status?.brainReady ?? true;
  const commentMode = (status?.commentMode as ChannelModeT) ?? "assisted";
  const dmMode = (status?.dmMode as ChannelModeT) ?? "auto";
  const setModeMut = useSetChannelMode();
  const syncMut = useSyncPosts();
  const syncing = syncMut.isPending;

  async function syncPosts() {
    setSyncMsg("");
    try { const j = await syncMut.mutateAsync(); setSyncMsg(`Synced ${j.count ?? 0} posts`); }
    catch { setSyncMsg("Sync failed"); }
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Posts</SectionLabel>
        <button onClick={syncPosts} disabled={syncing}
          className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-xl disabled:opacity-50"
          style={{ background: "var(--bg-inset)", border: "1px solid var(--border)", color: "var(--text)" }}>
          {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sync posts
        </button>
        {syncMsg && <p className="text-[11px] mt-2" style={{ color: "var(--text-subtle)" }}>{syncMsg}</p>}
      </div>

      {!brainReady && (
        <div className="rounded-xl px-3 py-2.5 text-[11px] leading-4" style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)" }}>
          Train your brain to turn on auto-replies. Until then Mira drafts only.
        </div>
      )}
      {!canManage && <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>Only admins can change reply modes.</p>}

      <ModeRow label="Comments" value={commentMode} disabled={!canManage}
        onChange={(m) => setModeMut.mutate({ commentMode: m })}
        hint={{ shadow: "Mira drafts only — nothing is posted.", assisted: "Mira drafts a reply; you approve before it posts.", auto: "Mira replies to comments automatically." }} />
      <ModeRow label="DMs" value={dmMode} disabled={!canManage}
        onChange={(m) => setModeMut.mutate({ dmMode: m })}
        hint={{ shadow: "Mira drafts only — nothing is sent.", assisted: "Mira drafts a reply; you approve before it sends.", auto: "Mira answers DMs conversationally on its own." }} />
    </div>
  );
}

function BrainSection({ canManage }: { canManage: boolean }) {
  const { data } = useBrainStatus();
  const rebuild = useRebuildBrain();
  if (!data) return null;
  const built = data.builtAt
    ? new Date(data.builtAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "never";

  const persona = data.persona;

  return (
    <div>
      <SectionLabel>Brain</SectionLabel>
      <div className="rounded-xl p-3 space-y-1.5" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
        <div className="flex justify-between text-[11.5px]"><span style={{ color: "var(--text-subtle)" }}>Facts</span><span style={{ color: "var(--text)" }}>{data.factCount}</span></div>
        <div className="flex justify-between text-[11.5px]"><span style={{ color: "var(--text-subtle)" }}>Style samples</span><span style={{ color: "var(--text)" }}>{data.styleSampleCount}</span></div>
        <div className="flex justify-between text-[11.5px]"><span style={{ color: "var(--text-subtle)" }}>Last built</span><span style={{ color: "var(--text)" }}>{built}</span></div>
        {data.gaps.length > 0 && (
          <p className="text-[10.5px] pt-1" style={{ color: "var(--text-subtle)" }}>Gaps: {data.gaps.join(", ")}</p>
        )}
        {canManage && (
          <button
            onClick={() =>
              rebuild.mutate(undefined, {
                onSuccess: (r) =>
                  toast.success(
                    r.factsCreated > 0
                      ? `Rebuilt — scanned ${r.postsScanned} post${r.postsScanned === 1 ? "" : "s"}, found ${r.factsCreated} new fact${r.factsCreated === 1 ? "" : "s"}${r.imagesDescribed ? `, described ${r.imagesDescribed} image${r.imagesDescribed === 1 ? "" : "s"}` : ""}`
                      : "Rebuilt — no new facts found (all posts already scanned, or captions too thin)"
                  ),
                onError: () => toast.error("Rebuild failed"),
              })
            }
            disabled={rebuild.isPending}
            className="w-full mt-1 h-8 rounded-md text-[11.5px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
            {rebuild.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {rebuild.isPending ? "Scanning posts…" : "Rebuild brain"}
          </button>
        )}
      </div>

      {persona && (persona.oneLiner || persona.brief || persona.full) ? (
        <div className="rounded-xl p-3 mt-2 space-y-2.5" style={{ background: "var(--bg-inset)", border: "1px solid var(--border)" }}>
          <PersonaTier label="One-liner" text={persona.oneLiner} empty="Not enough facts yet" />
          <PersonaTier label="Brief" text={persona.brief} empty="Not enough facts yet — this is what gets injected into replies" />
          <PersonaTier label="Full" text={persona.full} empty="Not enough facts yet — a synthesized markdown profile once there's enough content" />
        </div>
      ) : (
        <p className="text-[10.5px] mt-2" style={{ color: "var(--text-subtle)" }}>
          No persona yet — add facts (Interview or Paste, in the main Brain view) then Rebuild.
        </p>
      )}
    </div>
  );
}

function PersonaTier({ label, text, empty }: { label: string; text: string; empty: string }) {
  return (
    <div>
      <div className="text-[9.5px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-subtle)" }}>{label}</div>
      <div
        className="text-[11.5px] leading-[1.5] max-h-[280px] overflow-y-auto whitespace-pre-wrap"
        style={{ color: text ? "var(--text)" : "var(--text-subtle)" }}
      >
        {text || empty}
      </div>
    </div>
  );
}

function AiSection({ canManage }: { canManage: boolean }) {
  const { data } = useAiSettings();
  const patch = usePatchAiSettings();
  const [key, setKey] = useState("");
  if (!data) return null;

  return (
    <div>
      <SectionLabel>AI provider</SectionLabel>
      <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--text-muted)" }}>NVIDIA NIM</p>
      {canManage && (
        <div className="flex items-center gap-2">
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
            placeholder={data.byokKeySet ? "Key set — enter new to replace" : "Bring your own NVIDIA API key"}
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
      <SectionLabel>Knowledge base</SectionLabel>
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
function ModeRow({ label, hint, value, onChange, disabled }: {
  label: string;
  hint: Record<ChannelModeT, string>;
  value: ChannelModeT;
  onChange: (m: ChannelModeT) => void;
  disabled?: boolean;
}) {
  const modes: ChannelModeT[] = ["shadow", "assisted", "auto"];
  return (
    <div style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex gap-2">
        {modes.map((m) => (
          <button key={m} onClick={() => onChange(m)}
            className="flex-1 py-2 rounded-xl text-[11.5px] font-semibold capitalize"
            style={value === m
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { background: "var(--bg-inset)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            {m}
          </button>
        ))}
      </div>
      <p className="text-[10px] mt-2" style={{ color: "var(--text-subtle)" }}>{hint[value]}</p>
    </div>
  );
}
