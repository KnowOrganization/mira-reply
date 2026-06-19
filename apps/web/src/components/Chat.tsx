"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Square } from "lucide-react";
import { cn, uid } from "@/lib/utils";
import { MiraLogo } from "./MiraLogo";
import type { Message, Thread, Settings } from "@/lib/types";

type Props = {
  thread: Thread | null;
  settings: Settings;
  onUpdateThread: (t: Thread) => void;
};

export function Chat({ thread, settings, onUpdateThread }: Props) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread?.messages.length, streaming]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const empty = !thread || thread.messages.length === 0;

  async function send() {
    const text = input.trim();
    if (!text || streaming || !thread) return;

    const userMsg: Message = { id: uid(), role: "user", content: text, createdAt: Date.now() };
    const assistantMsg: Message = { id: uid(), role: "assistant", content: "", createdAt: Date.now() };

    const next: Thread = {
      ...thread,
      title: thread.messages.length === 0 ? text.slice(0, 40) : thread.title,
      messages: [...thread.messages, userMsg, assistantMsg],
      updatedAt: Date.now(),
    };
    onUpdateThread(next);
    setInput("");
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ig/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          messages: next.messages
            .filter((m) => m.role !== "system" && m.id !== assistantMsg.id)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(err || `Request failed: ${res.status}`);
      }

      const { reply, actions } = (await res.json()) as {
        reply: string;
        actions?: string[];
      };
      const body =
        (reply || "(no reply)") +
        (actions && actions.length
          ? `\n\n_· ran: ${actions.join(", ")}_`
          : "");
      onUpdateThread({
        ...next,
        messages: next.messages.map((m) =>
          m.id === assistantMsg.id ? { ...m, content: body } : m
        ),
        updatedAt: Date.now(),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      const errored: Thread = {
        ...next,
        messages: next.messages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `⚠ ${msg}\n\nMake sure Ollama is running.` }
            : m
        ),
      };
      onUpdateThread(errored);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="h-12 border-b flex items-center px-4" style={{ borderColor: "var(--border)" }}>
        <div className="text-sm font-medium tracking-tight truncate">
          {thread?.title || "New chat"}
        </div>
        <div className="ml-auto text-[11px]" style={{ color: "var(--text-subtle)" }}>
          {settings.model}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {empty ? (
          <Empty />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {thread!.messages.map((m) => (
              <Bubble key={m.id} message={m} streaming={streaming} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div
            className="rounded-xl border flex items-end gap-2 p-2.5 transition focus-within:border-strong"
            style={{ background: "var(--bg-elev)", borderColor: "var(--border-strong)" }}
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Message Mira…"
              className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-6 px-2 py-1.5 placeholder:text-[var(--text-subtle)]"
              style={{ color: "var(--text)" }}
              disabled={streaming}
            />
            {streaming ? (
              <button
                onClick={stop}
                className="h-9 w-9 rounded-xl flex items-center justify-center transition"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                aria-label="Stop"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!input.trim()}
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center transition",
                  !input.trim() && "opacity-40 cursor-not-allowed"
                )}
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                aria-label="Send"
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
          <div
            className="text-[10.5px] mt-2 text-center"
            style={{ color: "var(--text-subtle)" }}
          >
            Local model · Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty() {
  const [digest, setDigest] = useState<{
    inbox: number;
    repliedAuto: number;
    pending: number;
    needsInput: number;
    topTheme: { name: string; count: number } | null;
  } | null>(null);

  useEffect(() => {
    fetch("/api/ig/digest").then((r) => r.json()).then(setDigest).catch(() => {});
  }, []);

  const suggestions = [
    "What are people asking on my last reel?",
    "Set Munnar as the location for my last reel",
    "Show me open clarifications",
    "Top 3 most common questions on my account",
  ];

  return (
    <div className="h-full flex items-center justify-center px-4 relative overflow-hidden">
      {/* ambient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 35%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%)",
        }}
      />
      <div className="text-center max-w-2xl w-full relative">
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          className="flex justify-center mb-7"
        >
          <MiraLogo size={88} pulse />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="display mb-3"
          style={{
            fontSize: "clamp(60px, 9vw, 104px)",
            letterSpacing: "-0.055em",
            color: "var(--text)",
          }}
        >
          Mira
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4 }}
          className="text-[14.5px] mb-9 max-w-md mx-auto leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          Your personal Instagram AI. <span style={{ color: "var(--text)" }}>Knows everything about your account.</span>
        </motion.p>
        {digest && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border p-3.5 mb-5 text-left"
            style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
          >
            <div className="text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: "var(--text-subtle)" }}>
              Today
            </div>
            <div className="text-[12.5px] leading-5" style={{ color: "var(--text-muted)" }}>
              <b style={{ color: "var(--text)" }}>{digest.inbox}</b> new comments,{" "}
              <b style={{ color: "var(--text)" }}>{digest.repliedAuto}</b> auto-replied,{" "}
              <b style={{ color: "var(--text)" }}>{digest.pending}</b> pending,{" "}
              <b style={{ color: "var(--text)" }}>{digest.needsInput}</b> need your input.
              {digest.topTheme && (
                <>
                  {" "}Top theme: <b>{digest.topTheme.name}</b> ({digest.topTheme.count}).
                </>
              )}
            </div>
          </motion.div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
          {suggestions.map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.04 }}
              className="text-[12.5px] text-left rounded-lg border px-3 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer transition"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              onClick={() => {
                const ta = document.querySelector("textarea") as HTMLTextAreaElement | null;
                if (ta) {
                  ta.value = s;
                  ta.dispatchEvent(new Event("input", { bubbles: true }));
                  ta.focus();
                }
              }}
            >
              {s}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bubble({ message, streaming }: { message: Message; streaming: boolean }) {
  const isUser = message.role === "user";
  const isEmpty = !message.content;

  if (isUser) {
    return (
      <div className="flex justify-end fade-in">
        <div
          className="max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap"
          style={{ background: "var(--user-bubble)", color: "var(--user-bubble-fg)" }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 fade-in">
      <div className="shrink-0 mt-0.5">
        <MiraLogo size={26} />
      </div>
      <div className="flex-1 min-w-0 text-[15px] leading-7 whitespace-pre-wrap" style={{ color: "var(--text)" }}>
        {isEmpty && streaming ? (
          <span className="inline-flex items-center gap-1">
            <span className="dot-pulse" />
            <span className="dot-pulse" />
            <span className="dot-pulse" />
          </span>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}
