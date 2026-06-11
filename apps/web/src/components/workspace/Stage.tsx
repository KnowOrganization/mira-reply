"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ExternalLink,
  Send,
  RotateCcw,
  Pencil,
  Loader2,
  HelpCircle,
  Check,
  ArrowRight,
} from "lucide-react";
import { SPRING, ago, hashtags, stripTags } from "./utils";
import { Avatar } from "./Avatar";
import { useDraftAction, useReprocess, useClarificationAction } from "@/lib/api/hooks";
import type { QItem, Draft, Clar, PostInfoT } from "./types";

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold"
      style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
    >
      {children}
    </span>
  );
}

export function PostCard({
  post,
  postId,
  onOpenPost,
}: {
  post?: PostInfoT;
  postId?: string;
  onOpenPost?: (id: string) => void;
}) {
  if (!post) return null;
  const tags = hashtags(post.caption);
  const title = stripTags(post.caption) || "Untitled post";
  return (
    <div
      className="rounded-2xl p-3.5 flex items-center gap-3.5 mb-4"
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <button
        onClick={() => postId && onOpenPost?.(postId)}
        className="w-16 h-16 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: "var(--bg-inset)" }}
        title="Open post"
      >
        {post.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumb}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="text-[9px] font-bold tracking-widest"
            style={{ color: "var(--text-subtle)" }}
          >
            POST
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold leading-snug line-clamp-1">
          {title}
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {tags.map((t) => (
              <span
                key={t}
                className="text-[10.5px] font-semibold"
                style={{ color: "var(--accent)" }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="text-[11px] mt-1" style={{ color: "var(--text-subtle)" }}>
          💬 {post.comments} comment{post.comments === 1 ? "" : "s"} cached
        </div>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        {postId && onOpenPost && (
          <button
            onClick={() => onOpenPost(postId)}
            className="h-8 px-3 rounded-xl text-[11.5px] font-semibold flex items-center gap-1.5"
            style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
          >
            Manage
          </button>
        )}
        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            className="h-8 px-3 rounded-xl text-[11.5px] font-semibold flex items-center gap-1.5"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
          >
            <ExternalLink size={12} /> open
          </a>
        )}
      </div>
    </div>
  );
}

export function CommentBlock({
  username,
  text,
  at,
}: {
  username: string;
  text: string;
  at: number;
}) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <Avatar name={username} size={34} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold">@{username}</span>
          <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
            {ago(at)}
          </span>
        </div>
        <div className="text-[14px] mt-0.5 leading-snug">{text}</div>
      </div>
    </div>
  );
}

export function ActionBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className="h-11 px-3.5 rounded-2xl text-[12.5px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
      style={{
        background: "var(--bg-elev)",
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </motion.button>
  );
}

function DraftStage({
  draft,
  post,
  onNext,
  onOpenPost,
  reload,
}: {
  draft: Draft;
  post?: PostInfoT;
  onNext: () => void;
  onOpenPost: (id: string) => void;
  reload: () => Promise<void>;
}) {
  const [text, setText] = useState(draft.draftText);
  const [busy, setBusy] = useState<null | "send" | "rewrite">(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const draftAction = useDraftAction();
  const reprocessMut = useReprocess();

  async function approve() {
    if (busy || !text.trim()) return;
    setBusy("send");
    await draftAction.mutateAsync({ id: draft.id, body: { action: "approve", text } }).catch(() => {});
    await reload();
    setBusy(null);
  }
  async function rewrite() {
    if (busy) return;
    setBusy("rewrite");
    await draftAction.mutateAsync({ id: draft.id, body: { action: "reject" } }).catch(() => {});
    await reprocessMut.mutateAsync(draft.threadOrMediaId).catch(() => {});
    await new Promise((r) => setTimeout(r, 1400));
    await reload();
    setBusy(null);
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div>
      <PostCard post={post} postId={draft.postId} onOpenPost={onOpenPost} />
      <CommentBlock
        username={draft.fromUsername || draft.fromUserId.slice(0, 8)}
        text={draft.inboundText}
        at={draft.createdAt}
      />

      <div
        className="rounded-2xl p-4 ml-[46px]"
        style={{
          background: "var(--accent-soft)",
          border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)",
        }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={12} style={{ color: "var(--accent-deep)" }} />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ color: "var(--accent-deep)" }}
          >
            Mira drafts
          </span>
          <span
            className="ml-auto text-[10px] capitalize"
            style={{ color: "var(--text-muted)" }}
          >
            {draft.intent.replace(/_/g, " ")}
          </span>
        </div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full bg-transparent text-[15px] leading-relaxed outline-none resize-none font-medium"
        />
        <div className="text-[10.5px] mt-1" style={{ color: "var(--text-muted)" }}>
          {text.length} chars · {words} word{words === 1 ? "" : "s"}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 ml-[46px]">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          onClick={approve}
          disabled={!!busy || !text.trim()}
          className="h-11 px-5 rounded-2xl text-[13.5px] font-bold flex items-center gap-2 disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          {busy === "send" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          Approve &amp; send
        </motion.button>
        <ActionBtn onClick={rewrite} disabled={!!busy}>
          {busy === "rewrite" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RotateCcw size={13} />
          )}
          Rewrite
        </ActionBtn>
        <ActionBtn onClick={() => ref.current?.focus()} disabled={!!busy}>
          <Pencil size={13} /> Edit
        </ActionBtn>
        <button
          onClick={onNext}
          disabled={!!busy}
          className="ml-auto text-[12px] font-semibold flex items-center gap-1 disabled:opacity-50"
          style={{ color: "var(--text-muted)" }}
        >
          Skip for now <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

function ClarStage({
  clar,
  post,
  onNext,
  onOpenPost,
  reload,
}: {
  clar: Clar;
  post?: PostInfoT;
  onNext: () => void;
  onOpenPost: (id: string) => void;
  reload: () => Promise<void>;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const clarAction = useClarificationAction();

  async function submit() {
    if (busy || !answer.trim()) return;
    setBusy(true);
    await clarAction.mutateAsync({ id: clar.id, body: { action: "answer", answer: answer.trim() } }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
    await reload();
    setBusy(false);
  }
  async function dismiss() {
    if (busy) return;
    setBusy(true);
    await clarAction.mutateAsync({ id: clar.id, body: { action: "skip" } }).catch(() => {});
    await reload();
    setBusy(false);
  }

  return (
    <div>
      <PostCard post={post} postId={clar.postId} onOpenPost={onOpenPost} />
      <CommentBlock
        username={clar.fromUsername || clar.fromUserId.slice(0, 8)}
        text={clar.commentText}
        at={clar.createdAt}
      />

      <div
        className="rounded-2xl p-4 ml-[46px]"
        style={{
          background: "var(--accent-soft)",
          border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)",
        }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <HelpCircle size={12} style={{ color: "var(--accent-deep)" }} />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ color: "var(--accent-deep)" }}
          >
            Mira needs you
          </span>
        </div>
        <div className="text-[14px] font-semibold leading-snug">
          {clar.question}
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={2}
          autoFocus
          placeholder={
            clar.kind === "link" ? "Paste the link…" : "Type the answer…"
          }
          className="w-full mt-2.5 px-3 py-2.5 rounded-xl bg-transparent text-[14px] outline-none resize-none"
          style={{
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
          }}
        />
      </div>

      <div className="flex items-center gap-2 mt-4 ml-[46px]">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          onClick={submit}
          disabled={busy || !answer.trim()}
          className="h-11 px-5 rounded-2xl text-[13.5px] font-bold flex items-center gap-2 disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Check size={15} />
          )}
          Save &amp; let Mira reply
        </motion.button>
        <ActionBtn onClick={dismiss} disabled={busy}>
          Dismiss
        </ActionBtn>
        <button
          onClick={onNext}
          disabled={busy}
          className="ml-auto text-[12px] font-semibold flex items-center gap-1 disabled:opacity-50"
          style={{ color: "var(--text-muted)" }}
        >
          Skip for now <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

export function Stage({
  item,
  index,
  total,
  postInfo,
  onNext,
  onOpenPost,
  reload,
}: {
  item: QItem | null;
  index: number;
  total: number;
  postInfo: (id?: string) => PostInfoT | undefined;
  onNext: () => void;
  onOpenPost: (id: string) => void;
  reload: () => Promise<void>;
}) {
  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
        >
          <Check size={28} />
        </div>
        <div className="display" style={{ fontSize: 24 }}>
          All clear
        </div>
        <p className="text-[12.5px]" style={{ color: "var(--text-subtle)" }}>
          Nothing needs you right now. Mira is on it.
        </p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-[680px] mx-auto px-8 py-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>
                {index + 1} of {total} ·{" "}
                {item.type === "draft" ? "draft to review" : "needs your answer"} ·{" "}
                {ago(item.at)}
              </span>
              <span
                className="ml-auto text-[10px] flex items-center gap-1"
                style={{ color: "var(--text-subtle)" }}
              >
                <Kbd>J</Kbd>
                <Kbd>K</Kbd>
                to navigate
              </span>
            </div>

            {item.type === "draft" ? (
              <DraftStage
                key={item.draft.id}
                draft={item.draft}
                post={postInfo(item.draft.postId)}
                onNext={onNext}
                onOpenPost={onOpenPost}
                reload={reload}
              />
            ) : (
              <ClarStage
                key={item.clar.id}
                clar={item.clar}
                post={postInfo(item.clar.postId)}
                onNext={onNext}
                onOpenPost={onOpenPost}
                reload={reload}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
