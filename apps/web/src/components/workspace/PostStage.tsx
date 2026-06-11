"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  Send,
  Loader2,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  Link as LinkIcon,
  Wand2,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Eye,
  PlayCircle,
  Images,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { usePatchPost } from "@/lib/api/hooks";
import { SPRING, hashtags, stripTags } from "./utils";
import {
  Section,
  Muted,
  InsightStat,
  AddLinkForm,
  MiniClar,
  CommentRow,
} from "./PostStageShared";
import type { Post, Clar, Row, Insights } from "./types";

export function PostStage({
  post,
  clars,
  comments,
  loading,
  reload,
}: {
  post: Post | null;
  clars: Clar[];
  comments: Row[];
  loading: boolean;
  reload: () => Promise<void>;
}) {
  const [notes, setNotes] = useState(post?.notes || "");
  const [busy, setBusy] = useState(false);
  const [insBusy, setInsBusy] = useState(false);
  const [insights, setInsights] = useState<Insights | undefined>(post?.insights);
  const [paraOpen, setParaOpen] = useState(false);
  const [paragraph, setParagraph] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [replyAllBusy, setReplyAllBusy] = useState(false);
  const [replyAllResult, setReplyAllResult] = useState<string | null>(null);
  const patchPost = usePatchPost();

  async function stopReplyAll() {
    await api.post(`/api/ig/posts/${post?.id}/reply-all/stop`).catch(() => {});
  }
  const [commentPage, setCommentPage] = useState(0);
  const COMMENTS_PER_PAGE = 10;

  useEffect(() => {
    setNotes(post?.notes || "");
    setInsights(post?.insights);
    setParaOpen(false);
    setAddOpen(false);
    setCommentPage(0);
  }, [post?.id, post?.notes, post?.insights]);

  if (!post) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
        >
          <Images size={28} />
        </div>
        <div className="display" style={{ fontSize: 24 }}>
          No post selected
        </div>
        <p className="text-[12.5px]" style={{ color: "var(--text-subtle)" }}>
          Pick a post on the left to add links and context.
        </p>
      </div>
    );
  }

  async function save() {
    if (!post) return;
    setBusy(true);
    await patchPost.mutateAsync({ id: post.id, patch: { notes } }).catch(() => {});
    setBusy(false);
    toast.success("Notes saved");
    await reload();
  }
  async function fetchInsights() {
    if (!post) return;
    setInsBusy(true);
    const r = await api
      .get<{ insights?: Insights }>(`/api/ig/posts/${post.id}/insights`)
      .catch(() => ({} as { insights?: Insights }));
    setInsights(r.insights);
    setInsBusy(false);
  }
  async function extract() {
    if (!post || !paragraph.trim()) return;
    setExtracting(true);
    const r = await api
      .post<{ post?: unknown; extracted?: { links?: unknown[] } }>(`/api/ig/posts/${post.id}/extract`, {
        paragraph: paragraph.trim(),
      })
      .catch(() => ({} as { post?: unknown; extracted?: { links?: unknown[] } }));
    setExtracting(false);
    setParaOpen(false);
    setParagraph("");
    if (r.post) {
      toast.success(`Extracted ${r.extracted?.links?.length || 0} link(s)`);
      await reload();
    }
  }
  async function addLink(l: { label: string; url: string; type: string }) {
    if (!post) return;
    await patchPost.mutateAsync({ id: post.id, patch: { addLink: l } }).catch(() => {});
    setAddOpen(false);
    toast.success("Link added");
    await reload();
  }
  async function removeLink(id: string) {
    if (!post) return;
    await patchPost.mutateAsync({ id: post.id, patch: { removeLink: id } }).catch(() => {});
    await reload();
  }

  async function replyAll() {
    if (!post) return;
    setReplyAllBusy(true);
    setReplyAllResult(null);
    try {
      const j = await api.post<{ processed?: number; replied?: number; skipped?: number; error?: string }>(
        `/api/ig/posts/${post.id}/reply-all`
      );
      if (j.error) {
        setReplyAllResult(`Error: ${j.error}`);
        toast.error(j.error);
      } else {
        const msg = `Replied to ${j.replied ?? 0}, skipped ${j.skipped ?? 0} of ${j.processed ?? 0} comments`;
        setReplyAllResult(msg);
        toast.success(msg);
      }
    } catch (e) {
      const msg = `Failed: ${e instanceof Error ? e.message : String(e)}`;
      setReplyAllResult(msg);
      toast.error(msg);
    }
    setReplyAllBusy(false);
  }

  const tags = hashtags(post.caption);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-[680px] mx-auto px-8 py-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
          >
            {/* hero */}
            <div
              className="rounded-3xl overflow-hidden mb-5"
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {post.thumbnailUrl && (
                <div
                  className="w-full flex items-center justify-center"
                  style={{ background: "var(--bg-inset)", maxHeight: 300 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.thumbnailUrl}
                    alt=""
                    className="w-full object-contain"
                    style={{ maxHeight: 300 }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-bold leading-snug">
                      {stripTags(post.caption) || "Untitled post"}
                    </div>
                    {tags.length > 0 && (
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="text-[11px] font-semibold"
                            style={{ color: "var(--accent)" }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div
                      className="text-[11px] mt-1.5"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {new Date(post.timestamp).toLocaleDateString()} ·{" "}
                      {post.mediaType}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <div className="flex gap-1.5">
                      <button
                        onClick={replyAll}
                        disabled={replyAllBusy}
                        className="h-8 px-3 rounded-xl text-[11.5px] font-semibold flex items-center gap-1.5"
                        style={{
                          background: replyAllBusy ? "var(--bg-inset)" : "var(--accent-soft)",
                          color: replyAllBusy ? "var(--text-subtle)" : "var(--accent-deep)",
                          cursor: replyAllBusy ? "not-allowed" : "pointer",
                        }}
                      >
                        {replyAllBusy ? (
                          <><Loader2 size={11} className="animate-spin" /> Replying…</>
                        ) : (
                          <><Send size={11} /> Reply all</>
                        )}
                      </button>
                      {replyAllBusy && (
                        <button
                          onClick={stopReplyAll}
                          className="h-8 px-3 rounded-xl text-[11.5px] font-semibold flex items-center gap-1"
                          style={{ background: "color-mix(in srgb, #b3402e 15%, transparent)", color: "#c0392b" }}
                        >
                          Stop
                        </button>
                      )}
                    </div>
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-3 rounded-xl text-[11.5px] font-semibold flex items-center gap-1.5"
                        style={{
                          background: "var(--bg-inset)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <ExternalLink size={12} /> open
                      </a>
                    )}
                    {replyAllResult && (
                      <p className="text-[10.5px] text-center max-w-[120px]" style={{ color: "var(--text-subtle)" }}>
                        {replyAllResult}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* insights */}
            <Section
              title="Insights"
              action={
                <button
                  onClick={fetchInsights}
                  disabled={insBusy}
                  className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                >
                  {insBusy ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <RefreshCw size={11} />
                  )}
                  {insights ? "refresh" : "fetch"}
                </button>
              }
            >
              {insights ? (
                <div className="grid grid-cols-3 gap-2">
                  <InsightStat icon={<Heart size={12} />} label="Likes" v={insights.likes} />
                  <InsightStat icon={<MessageCircle size={12} />} label="Comments" v={insights.comments} />
                  <InsightStat icon={<Bookmark size={12} />} label="Saved" v={insights.saved} />
                  <InsightStat icon={<Share2 size={12} />} label="Shares" v={insights.shares} />
                  <InsightStat icon={<Eye size={12} />} label="Reach" v={insights.reach} />
                  {insights.plays !== undefined && (
                    <InsightStat icon={<PlayCircle size={12} />} label="Plays" v={insights.plays} />
                  )}
                </div>
              ) : (
                <Muted>Fetch to load reach, likes and saves.</Muted>
              )}
            </Section>

            {/* owner notes */}
            <Section
              title="Owner notes"
              action={
                <button
                  onClick={() => setParaOpen((o) => !o)}
                  className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                >
                  <Wand2 size={11} /> paragraph → extract
                </button>
              }
            >
              <AnimatePresence>
                {paraOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-2.5"
                  >
                    <textarea
                      value={paragraph}
                      onChange={(e) => setParagraph(e.target.value)}
                      rows={3}
                      placeholder="Paste a paragraph — 'Shot at Munnar tea estates on a KTM Duke 390 at sunrise. Song: Tum Hi Ho. Maps: https://...'"
                      className="w-full px-3 py-2.5 rounded-xl bg-transparent text-[13px] outline-none resize-y"
                      style={{ border: "1px solid var(--border-strong)" }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={extract}
                      disabled={extracting || !paragraph.trim()}
                      className="mt-2 h-9 px-3.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-40"
                      style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                    >
                      {extracting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Wand2 size={12} />
                      )}
                      Extract
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Free-form notes — Mira uses these to answer comments on this post."
                className="w-full px-3 py-2.5 rounded-xl bg-transparent text-[13.5px] outline-none resize-y"
                style={{ border: "1px solid var(--border-strong)" }}
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={save}
                disabled={busy || notes === post.notes}
                className="mt-2 h-9 px-3.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                {busy ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Save size={12} />
                )}
                Save notes
              </motion.button>
            </Section>

            {/* link vault */}
            <Section
              title={`Link vault · ${post.links?.length || 0}`}
              action={
                <button
                  onClick={() => setAddOpen((o) => !o)}
                  className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  <Plus size={11} /> add link
                </button>
              }
            >
              <AnimatePresence>
                {addOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-2.5"
                  >
                    <AddLinkForm onAdd={addLink} onCancel={() => setAddOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
              {(post.links || []).length === 0 && !addOpen && (
                <Muted>
                  No links yet. Add location / song / gear URLs — Mira DMs them
                  when someone asks on this post.
                </Muted>
              )}
              <div className="space-y-1.5">
                {(post.links || []).map((l) => (
                  <div
                    key={l.id}
                    className="group flex items-center gap-2.5 rounded-xl px-3 py-2"
                    style={{
                      background: "var(--bg-elev)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <LinkIcon size={13} style={{ color: "var(--accent)" }} />
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent-deep)",
                      }}
                    >
                      {l.type}
                    </span>
                    <span className="text-[12.5px] font-medium flex-1 truncate">
                      {l.label}
                    </span>
                    {l.url && (
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                    <button
                      onClick={() => removeLink(l.id)}
                      className="opacity-0 group-hover:opacity-100 transition"
                      style={{ color: "var(--text-muted)" }}
                      aria-label="Remove link"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </Section>

            {/* open clarifications on this post */}
            {clars.length > 0 && (
              <Section title="Mira needs your input">
                <div className="space-y-2">
                  {clars.map((c) => (
                    <MiniClar key={c.id} clar={c} reload={reload} />
                  ))}
                </div>
              </Section>
            )}

            {/* knowledge */}
            <Section title={`Knowledge · ${post.qa.length}`}>
              {post.qa.length === 0 ? (
                <Muted>
                  Nothing learned yet. Answers Mira learns get saved here.
                </Muted>
              ) : (
                <div className="space-y-1.5">
                  {post.qa
                    .slice()
                    .reverse()
                    .map((qa, i) => (
                      <div
                        key={i}
                        className="rounded-xl px-3 py-2.5"
                        style={{
                          background: "var(--bg-elev)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          className="text-[11px] font-semibold mb-0.5"
                          style={{ color: "var(--text-subtle)" }}
                        >
                          {qa.q}
                        </div>
                        <div className="text-[13px]">{qa.a}</div>
                      </div>
                    ))}
                </div>
              )}
            </Section>

            {/* comments — paginated */}
            {(() => {
              const sorted = comments.slice().sort((a, b) => b.ts - a.ts);
              const totalPages = Math.ceil(sorted.length / COMMENTS_PER_PAGE);
              const page = Math.min(commentPage, Math.max(0, totalPages - 1));
              const pageComments = sorted.slice(page * COMMENTS_PER_PAGE, (page + 1) * COMMENTS_PER_PAGE);
              return (
                <Section title={`Comments · ${comments.length}`}>
                  {loading && comments.length === 0 ? (
                    <Muted>Loading comments…</Muted>
                  ) : comments.length === 0 ? (
                    <Muted>No comments on this post yet.</Muted>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {pageComments.map((c) => (
                          <CommentRow key={c.id} c={c} />
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                          <button
                            onClick={() => setCommentPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="h-8 px-3 rounded-xl text-[12px] font-semibold disabled:opacity-30"
                            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                          >
                            ← Prev
                          </button>
                          <span className="text-[11.5px]" style={{ color: "var(--text-subtle)" }}>
                            {page + 1} / {totalPages}
                          </span>
                          <button
                            onClick={() => setCommentPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            className="h-8 px-3 rounded-xl text-[12px] font-semibold disabled:opacity-30"
                            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </Section>
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
