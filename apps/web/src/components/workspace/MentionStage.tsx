"use client";

import { motion } from "framer-motion";
import {
  ExternalLink,
  Loader2,
  RefreshCw,
  AtSign,
  Heart,
  MessageCircle,
} from "lucide-react";
import { ago } from "./utils";
import type { Mention } from "./types";

function MentionCard({ m, onClick }: { m: Mention; onClick: () => void }) {
  const label =
    m.kind === "comment"
      ? "comment"
      : m.kind === "caption"
      ? "caption"
      : "photo tag";
  return (
    <motion.button
      layout
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "var(--bg-elev)",
        boxShadow: "var(--shadow-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="aspect-square w-full overflow-hidden relative"
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
          <div className="w-full h-full flex items-center justify-center">
            <AtSign size={22} style={{ color: "var(--text-subtle)" }} />
          </div>
        )}
        <span
          className="absolute top-2 left-2 text-[9.5px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
          }}
        >
          {label}
        </span>
        {!m.read && (
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{ background: "var(--accent)" }}
          />
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold truncate">
            @{m.fromUsername || "unknown"}
          </span>
          <span
            className="text-[10px] shrink-0"
            style={{ color: "var(--text-subtle)" }}
          >
            {ago(m.ts)}
          </span>
        </div>
        <div
          className="text-[11.5px] line-clamp-2"
          style={{ color: "var(--text-muted)" }}
        >
          {m.commentText || m.mediaCaption || "(no text)"}
        </div>
        <div
          className="flex items-center gap-3 text-[10.5px] pt-1"
          style={{ color: "var(--text-subtle)" }}
        >
          {typeof m.likeCount === "number" && (
            <span className="flex items-center gap-1">
              <Heart size={11} /> {m.likeCount}
            </span>
          )}
          {typeof m.commentsCount === "number" && (
            <span className="flex items-center gap-1">
              <MessageCircle size={11} /> {m.commentsCount}
            </span>
          )}
          {m.permalink && (
            <a
              href={m.permalink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto flex items-center gap-1"
              style={{ color: "var(--accent)" }}
            >
              open <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function MentionDetail({
  mention,
  onBack,
}: {
  mention: Mention;
  onBack: () => void;
}) {
  return (
    <div
      className="flex-1 min-w-0 flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={onBack}
          className="text-[12px] font-semibold flex items-center gap-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to mentions
        </button>
        {mention.permalink && (
          <a
            href={mention.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-semibold flex items-center gap-1.5"
            style={{ color: "var(--accent)" }}
          >
            Open on Instagram <ExternalLink size={12} />
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <span
              className="text-[10.5px] px-2 py-1 rounded-md font-semibold uppercase tracking-wide"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-deep)",
              }}
            >
              {mention.kind === "comment"
                ? "comment mention"
                : mention.kind === "caption"
                ? "caption mention"
                : "photo tag"}
            </span>
            <span
              className="text-[11.5px]"
              style={{ color: "var(--text-subtle)" }}
            >
              {ago(mention.ts)}
            </span>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-elev)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {mention.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mention.thumbnailUrl}
                alt=""
                className="w-full max-h-[520px] object-cover"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <div className="p-5 space-y-3">
              <div className="text-[14px] font-bold">
                @{mention.fromUsername || "unknown"}
              </div>
              {mention.mediaCaption && (
                <div
                  className="text-[13px] whitespace-pre-wrap"
                  style={{ color: "var(--text-muted)" }}
                >
                  {mention.mediaCaption}
                </div>
              )}

              {mention.commentText && (
                <div
                  className="rounded-xl p-3 text-[12.5px]"
                  style={{
                    background: "var(--bg-inset)",
                    color: "var(--text)",
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-wider mb-1 font-semibold"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    Comment
                  </div>
                  {mention.commentText}
                </div>
              )}

              <div
                className="flex items-center gap-5 pt-2 text-[12px]"
                style={{ color: "var(--text-subtle)" }}
              >
                {typeof mention.likeCount === "number" && (
                  <span className="flex items-center gap-1.5">
                    <Heart size={13} /> {mention.likeCount} likes
                  </span>
                )}
                {typeof mention.commentsCount === "number" && (
                  <span className="flex items-center gap-1.5">
                    <MessageCircle size={13} /> {mention.commentsCount} comments
                  </span>
                )}
                {mention.mediaType && (
                  <span
                    className="text-[10.5px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: "var(--bg-inset)" }}
                  >
                    {mention.mediaType}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-bold tabular-nums text-[13px]" style={{ color: "var(--text)" }}>
        {n}
      </span>
      <span style={{ color: "var(--text-subtle)" }}>{label}</span>
    </div>
  );
}

export function MentionStage({
  mention,
  mentions,
  refreshing,
  onRefresh,
  onSelectMention,
}: {
  mention: Mention | null;
  mentions: Mention[];
  refreshing: boolean;
  onRefresh: () => void;
  onSelectMention: (id: string) => void;
}) {
  const list = mentions.slice().sort((a, b) => b.ts - a.ts);
  if (mention) {
    return (
      <MentionDetail mention={mention} onBack={() => onSelectMention("")} />
    );
  }
  const totalLikes = list.reduce((a, m) => a + (m.likeCount || 0), 0);
  const totalComments = list.reduce((a, m) => a + (m.commentsCount || 0), 0);
  const uniqueAuthors = new Set(list.map((m) => m.fromUsername).filter(Boolean))
    .size;

  return (
    <div
      className="flex-1 min-w-0 flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <div className="text-[15px] font-bold flex items-center gap-2">
            <AtSign size={16} />
            Mentions
          </div>
          <div
            className="text-[11.5px] mt-0.5"
            style={{ color: "var(--text-subtle)" }}
          >
            Posts that @-mention or photo-tag your account.
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={refreshing}
          className="h-9 px-3 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-60"
          style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
        >
          {refreshing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          Refresh
        </motion.button>
      </div>

      <div
        className="flex items-center gap-6 px-6 py-3 border-b text-[12px]"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elev)",
        }}
      >
        <Stat n={list.length} label="mentions" />
        <Stat n={uniqueAuthors} label="accounts" />
        <Stat n={totalLikes} label="likes" />
        <Stat n={totalComments} label="comments" />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {list.length === 0 ? (
          <div
            className="h-full flex items-center justify-center text-[12.5px]"
            style={{ color: "var(--text-subtle)" }}
          >
            No mentions yet. Hit Refresh.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((m) => (
              <MentionCard
                key={m.id}
                m={m}
                onClick={() => onSelectMention(m.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
