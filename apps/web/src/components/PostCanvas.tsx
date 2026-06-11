"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, ExternalLink, Plus, Trash2, ChevronDown, ChevronUp, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { usePosts, usePatchPost, qk } from "@/lib/api/hooks";

// ── types ─────────────────────────────────────────────────────────────────

type PostLink = {
  id: string;
  label: string;
  url: string;
  type: "location" | "song" | "gear" | "shop" | "other";
};

type Post = {
  id: string;
  caption: string;
  mediaType: string;
  permalink?: string;
  thumbnailUrl?: string;
  timestamp: string;
  notes: string;
  links: PostLink[];
  updatedAt: number;
};

// ── helpers ───────────────────────────────────────────────────────────────

function hashtags(caption: string): string[] {
  return (caption.match(/#\w+/g) || []).slice(0, 4);
}

function stripTags(caption: string): string {
  return caption.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
}

const LINK_TYPES = ["location", "song", "gear", "shop", "other"] as const;

// ── PostCanvas ────────────────────────────────────────────────────────────

export function PostCanvas() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading: loading } = usePosts<{ posts?: Post[] }>();
  const posts = useMemo(
    () =>
      (data?.posts || [])
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [data]
  );

  // auto-expand the most recent post once, on first load
  useEffect(() => {
    if (posts.length > 0 && !expandedId) setExpandedId(posts[0].id);
  }, [posts, expandedId]);

  const refresh = () => qc.invalidateQueries({ queryKey: qk.posts });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin" style={{ color: "#333" }} />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-[13px]" style={{ color: "#444" }}>No posts synced yet.</p>
        <p className="text-[11px]" style={{ color: "#333" }}>Open Settings → Sync posts</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3 scrollbar-thin">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          expanded={expandedId === post.id}
          onToggle={() => setExpandedId((id) => id === post.id ? null : post.id)}
          onRefresh={refresh}
        />
      ))}
    </div>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────

function PostCard({
  post,
  expanded,
  onToggle,
  onRefresh,
}: {
  post: Post;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [notes, setNotes]               = useState(post.notes || "");
  const [replyBusy, setReplyBusy]       = useState(false);
  const [addingLink, setAddingLink]     = useState(false);
  const [replyResult, setReplyResult]   = useState<string | null>(null);

  const patchPost = usePatchPost();
  const savingNotes = patchPost.isPending;

  useEffect(() => { setNotes(post.notes || ""); }, [post.id, post.notes]);

  const tags  = hashtags(post.caption);
  const title = stripTags(post.caption) || "Untitled post";
  const hasLink = post.links.length > 0;

  async function saveNotes() {
    await patchPost.mutateAsync({ id: post.id, patch: { notes } }).catch(() => {});
    toast.success("Notes saved");
  }

  async function removeLink(linkId: string) {
    await patchPost.mutateAsync({ id: post.id, patch: { removeLink: linkId } }).catch(() => {});
    onRefresh();
  }

  async function replyAll() {
    setReplyBusy(true);
    setReplyResult(null);
    try {
      const j = await api.post<{ processed?: number; replied?: number; skipped?: number; dmSent?: number; error?: string }>(
        `/api/ig/posts/${post.id}/reply-all`
      );
      if (j.error) { toast.error(j.error); setReplyResult(j.error); }
      else {
        const msg = `${j.dmSent ?? 0} DMs sent · ${j.replied ?? 0} replied · ${j.skipped ?? 0} skipped`;
        setReplyResult(msg);
        toast.success(msg);
      }
    } catch (e) {
      toast.error("Reply all failed");
      setReplyResult("failed");
    }
    setReplyBusy(false);
  }

  async function stopReplyAll() {
    await api.post(`/api/ig/posts/${post.id}/reply-all/stop`).catch(() => {});
    toast("Stopping...");
  }

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{ background: "#111", border: expanded ? "1px solid #2a2a2a" : "1px solid #1a1a1a" }}
    >
      {/* collapsed header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* thumbnail */}
        <div
          className="w-10 h-10 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: "#0d0d0d" }}
        >
          {post.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-[8px] font-bold tracking-widest" style={{ color: "#333" }}>POST</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate" style={{ color: "#e5e5e5" }}>{title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {hasLink ? (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "#3b82f6" }}>
                <LinkIcon size={9} /> {post.links[0].label}
              </span>
            ) : (
              <span className="text-[10px]" style={{ color: "#333" }}>no link</span>
            )}
            {tags.slice(0, 2).map((t) => (
              <span key={t} className="text-[10px]" style={{ color: "#3a3a3a" }}>{t}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {replyBusy && <Loader2 size={12} className="animate-spin" style={{ color: "#3b82f6" }} />}
          {expanded ? <ChevronUp size={14} style={{ color: "#444" }} /> : <ChevronDown size={14} style={{ color: "#444" }} />}
        </div>
      </button>

      {/* expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 space-y-4" style={{ borderTop: "1px solid #1a1a1a" }}>

              {/* reply all section */}
              <div className="pt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={replyAll}
                    disabled={replyBusy}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold disabled:opacity-50"
                    style={{ background: replyBusy ? "#1a1a1a" : "#3b82f6", color: "#fff" }}
                  >
                    {replyBusy ? <><Loader2 size={11} className="animate-spin" /> Replying…</> : <><Send size={11} /> Reply all</>}
                  </button>
                  {replyBusy && (
                    <button
                      onClick={stopReplyAll}
                      className="px-3 py-2 rounded-xl text-[12px] font-semibold"
                      style={{ background: "#1a1a1a", color: "#ef4444", border: "1px solid #2a1a1a" }}
                    >
                      Stop
                    </button>
                  )}
                  {post.permalink && (
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px]"
                      style={{ background: "#1a1a1a", color: "#555" }}
                    >
                      <ExternalLink size={11} /> open
                    </a>
                  )}
                </div>
                {replyResult && (
                  <p className="text-[11px] mt-2" style={{ color: "#555" }}>{replyResult}</p>
                )}
              </div>

              {/* link vault */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#333" }}>Link Vault</span>
                  <button
                    onClick={() => setAddingLink((v) => !v)}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg"
                    style={{ color: "#3b82f6", background: "#0d1a2a" }}
                  >
                    <Plus size={10} /> add
                  </button>
                </div>

                {post.links.length === 0 && !addingLink && (
                  <p className="text-[11px]" style={{ color: "#2a2a2a" }}>No links yet — add one to enable Reply all.</p>
                )}

                {post.links.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1.5"
                    style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
                  >
                    <LinkIcon size={11} style={{ color: "#3b82f6" }} />
                    <span className="text-[11.5px] font-semibold flex-1 truncate" style={{ color: "#e5e5e5" }}>{l.label}</span>
                    <a href={l.url} target="_blank" rel="noreferrer">
                      <ExternalLink size={10} style={{ color: "#555" }} />
                    </a>
                    <button onClick={() => removeLink(l.id)}>
                      <Trash2 size={10} style={{ color: "#333" }} />
                    </button>
                  </div>
                ))}

                {addingLink && (
                  <AddLinkForm
                    onAdd={async (l) => {
                      await patchPost.mutateAsync({ id: post.id, patch: { addLink: l } });
                      setAddingLink(false);
                      onRefresh();
                      toast.success("Link added");
                    }}
                    onCancel={() => setAddingLink(false)}
                  />
                )}
              </div>

              {/* owner notes */}
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase mb-2 block" style={{ color: "#333" }}>Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Context for Mira about this post…"
                  className="w-full px-3 py-2 rounded-xl text-[12px] outline-none resize-none bg-transparent"
                  style={{ border: "1px solid #1e1e1e", color: "#aaa", caretColor: "#3b82f6" }}
                />
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="mt-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold disabled:opacity-50"
                  style={{ background: "#1a1a1a", color: "#555" }}
                >
                  {savingNotes ? "Saving…" : "Save notes"}
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── AddLinkForm ───────────────────────────────────────────────────────────

function AddLinkForm({
  onAdd,
  onCancel,
}: {
  onAdd: (l: { label: string; url: string; type: string }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl]     = useState("");
  const [type, setType]   = useState<typeof LINK_TYPES[number]>("other");

  return (
    <div className="rounded-xl p-3 space-y-2 mt-2" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. YC LEVEL EDITING PROCESS)"
        className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-transparent outline-none"
        style={{ border: "1px solid #1e1e1e", color: "#e5e5e5" }}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-transparent outline-none"
        style={{ border: "1px solid #1e1e1e", color: "#e5e5e5" }}
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as typeof LINK_TYPES[number])}
        className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-transparent outline-none"
        style={{ border: "1px solid #1e1e1e", color: "#555", background: "#0d0d0d" }}
      >
        {LINK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <div className="flex gap-2">
        <button
          onClick={() => label && url && onAdd({ label, url, type })}
          disabled={!label || !url}
          className="flex-1 py-1.5 rounded-lg text-[11.5px] font-semibold disabled:opacity-40"
          style={{ background: "#3b82f6", color: "#fff" }}
        >
          Add link
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-[11.5px]"
          style={{ background: "#1a1a1a", color: "#555" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
