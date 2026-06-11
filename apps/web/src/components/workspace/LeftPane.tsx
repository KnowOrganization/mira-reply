"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Images, AtSign } from "lucide-react";
import { SPRING, ago, stripTags } from "./utils";
import { Avatar } from "./Avatar";
import type { QItem, Clar, Post, Mention, PostInfoT } from "./types";

function PaneTab({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-9 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
      style={
        active
          ? {
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow: "var(--shadow-card)",
            }
          : { color: "var(--text-muted)" }
      }
    >
      {icon}
      {label}
      <span className="opacity-70 tabular-nums">{badge}</span>
    </button>
  );
}

export function LeftPane({
  pane,
  setPane,
  items,
  tab,
  setTab,
  selId,
  onSelectItem,
  counts,
  posts,
  selPost,
  onSelectPost,
  clars,
  names,
  postInfo,
  mentions,
  selMention,
  onSelectMention,
  mentionUnread,
}: {
  pane: "inbox" | "posts" | "mentions";
  setPane: (p: "inbox" | "posts" | "mentions") => void;
  items: QItem[];
  tab: "all" | "low" | "asks";
  setTab: (t: "all" | "low" | "asks") => void;
  selId: string | null;
  onSelectItem: (id: string) => void;
  counts: { all: number; low: number; asks: number };
  posts: Post[];
  selPost: string | null;
  onSelectPost: (id: string) => void;
  clars: Clar[];
  names: Record<string, string>;
  postInfo: (id?: string) => PostInfoT | undefined;
  mentions: Mention[];
  selMention: string | null;
  onSelectMention: (id: string) => void;
  mentionUnread: number;
}) {
  return (
    <div
      className="w-[316px] shrink-0 border-r flex flex-col"
      style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
    >
      {/* pane toggle */}
      <div className="px-3 pt-3">
        <div
          className="flex p-1 rounded-2xl"
          style={{ background: "var(--bg-inset)" }}
        >
          <PaneTab
            active={pane === "inbox"}
            onClick={() => setPane("inbox")}
            icon={<Inbox size={14} />}
            label="Needs you"
            badge={counts.asks + counts.low}
          />
          <PaneTab
            active={pane === "posts"}
            onClick={() => setPane("posts")}
            icon={<Images size={14} />}
            label="Posts"
            badge={posts.length}
          />
          <PaneTab
            active={pane === "mentions"}
            onClick={() => setPane("mentions")}
            icon={<AtSign size={14} />}
            label="Mentions"
            badge={mentionUnread || mentions.length}
          />
        </div>
      </div>

      {pane === "inbox" ? (
        <>
          <div className="px-5 pt-4 pb-2">
            <p
              className="text-[11.5px]"
              style={{ color: "var(--text-subtle)" }}
            >
              Decisions Mira couldn&apos;t make alone
            </p>
            <div className="flex gap-1 mt-2.5">
              {(
                [
                  { k: "all", label: "All" },
                  { k: "low", label: "Drafts" },
                  { k: "asks", label: "Direct asks" },
                ] as const
              ).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold transition-colors"
                  style={
                    tab === t.k
                      ? { background: "var(--accent)", color: "var(--accent-fg)" }
                      : { background: "var(--bg-inset)", color: "var(--text-muted)" }
                  }
                >
                  {t.label}
                  <span className="ml-1 opacity-70 tabular-nums">
                    {counts[t.k]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3 space-y-1.5">
            {items.length === 0 && (
              <div
                className="text-[12px] text-center py-10"
                style={{ color: "var(--text-subtle)" }}
              >
                Nothing waiting. All clear.
              </div>
            )}
            <AnimatePresence initial={false}>
              {items.map((q) => {
                const isDraft = q.type === "draft";
                const userId = isDraft ? q.draft.fromUserId : q.clar.fromUserId;
                const uname =
                  (isDraft ? q.draft.fromUsername : q.clar.fromUsername) ||
                  names[userId] ||
                  userId.slice(0, 8);
                const text = isDraft ? q.draft.inboundText : q.clar.commentText;
                const postId = isDraft ? q.draft.postId : q.clar.postId;
                const cap = postInfo(postId)?.caption || "";
                const active = q.id === selId;
                return (
                  <motion.button
                    key={q.id}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={SPRING}
                    onClick={() => onSelectItem(q.id)}
                    className="w-full text-left rounded-2xl p-3 transition-colors"
                    style={
                      active
                        ? {
                            background: "var(--bg-elev)",
                            boxShadow: "var(--shadow-card)",
                            border:
                              "1px solid color-mix(in srgb, var(--accent) 34%, transparent)",
                          }
                        : {
                            background: "transparent",
                            border: "1px solid transparent",
                          }
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={uname} size={26} />
                      <span className="text-[12.5px] font-bold truncate">
                        @{uname}
                      </span>
                      <span
                        className="ml-auto text-[10px] shrink-0"
                        style={{ color: "var(--text-subtle)" }}
                      >
                        {ago(q.at)}
                      </span>
                    </div>
                    <div
                      className="text-[12.5px] mt-1.5 line-clamp-2 leading-snug"
                      style={{ color: "var(--text)" }}
                    >
                      {text}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                        style={
                          isDraft
                            ? {
                                background: "var(--bg-inset)",
                                color: "var(--text-muted)",
                              }
                            : {
                                background: "var(--accent-soft)",
                                color: "var(--accent-deep)",
                              }
                        }
                      >
                        {isDraft ? "draft" : "asks you"}
                      </span>
                      {cap && (
                        <span
                          className="text-[10.5px] truncate"
                          style={{ color: "var(--text-subtle)" }}
                        >
                          on "{stripTags(cap).slice(0, 28) || "post"}"
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      ) : pane === "mentions" ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pt-3 pb-3 space-y-1.5">
          {mentions.length === 0 && (
            <div
              className="text-[12px] text-center py-10"
              style={{ color: "var(--text-subtle)" }}
            >
              No mentions yet. Hit Refresh in the panel.
            </div>
          )}
          {mentions
            .slice()
            .sort((a, b) => b.ts - a.ts)
            .map((m) => {
              const active = m.id === selMention;
              const label =
                m.kind === "comment"
                  ? "comment"
                  : m.kind === "caption"
                  ? "caption"
                  : "photo tag";
              return (
                <motion.button
                  key={m.id}
                  layout
                  onClick={() => onSelectMention(m.id)}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-left rounded-2xl p-2.5 flex items-start gap-2.5 transition-colors"
                  style={
                    active
                      ? {
                          background: "var(--bg-elev)",
                          boxShadow: "var(--shadow-card)",
                          border:
                            "1px solid color-mix(in srgb, var(--accent) 34%, transparent)",
                        }
                      : {
                          background: "transparent",
                          border: "1px solid transparent",
                        }
                  }
                >
                  <div
                    className="w-12 h-12 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: "var(--bg-inset)" }}
                  >
                    {m.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <AtSign size={16} style={{ color: "var(--text-subtle)" }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent-deep)",
                        }}
                      >
                        {label}
                      </span>
                      {!m.read && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "var(--accent)" }}
                        />
                      )}
                    </div>
                    <div className="text-[12px] font-semibold line-clamp-1 mt-1">
                      @{m.fromUsername || "unknown"}
                    </div>
                    <div
                      className="text-[11px] line-clamp-2 mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {m.commentText || m.mediaCaption || "(no text)"}
                    </div>
                    <div
                      className="text-[9.5px] mt-1"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {ago(m.ts)}
                    </div>
                  </div>
                </motion.button>
              );
            })}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pt-3 pb-3 space-y-1.5">
          {posts.length === 0 && (
            <div
              className="text-[12px] text-center py-10"
              style={{ color: "var(--text-subtle)" }}
            >
              No posts. Hit Sync above.
            </div>
          )}
          {posts.map((p) => {
            const pend = clars.filter((c) => c.postId === p.id).length;
            const hasCtx = !!(p.notes || p.links?.length || p.qa.length);
            const active = p.id === selPost;
            return (
              <motion.button
                key={p.id}
                layout
                onClick={() => onSelectPost(p.id)}
                whileTap={{ scale: 0.98 }}
                className="w-full text-left rounded-2xl p-2.5 flex items-center gap-2.5 transition-colors"
                style={
                  active
                    ? {
                        background: "var(--bg-elev)",
                        boxShadow: "var(--shadow-card)",
                        border:
                          "1px solid color-mix(in srgb, var(--accent) 34%, transparent)",
                      }
                    : {
                        background: "transparent",
                        border: "1px solid transparent",
                      }
                }
              >
                <div
                  className="w-12 h-12 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: "var(--bg-inset)" }}
                >
                  {p.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span
                      className="text-[8px] font-bold"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {p.mediaType?.slice(0, 4)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold line-clamp-1">
                    {stripTags(p.caption) || "(no caption)"}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {hasCtx && (
                      <span
                        className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent-deep)",
                        }}
                      >
                        ✓ context
                      </span>
                    )}
                    {pend > 0 && (
                      <span
                        className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold"
                        style={{
                          background: "var(--accent)",
                          color: "var(--accent-fg)",
                        }}
                      >
                        {pend} ask{pend === 1 ? "" : "s"}
                      </span>
                    )}
                    <span
                      className="text-[9.5px]"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {new Date(p.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
