"use client";

import { useEffect, useRef, useState } from "react";
import { useFeed } from "@/lib/api/hooks";

type FeedEvent = {
  id: string;
  kind: "comment_replied" | "dm_sent" | "link_sent" | "follow_pending" | "skipped";
  username?: string;
  postTitle?: string;
  detail?: string;
  ts: number;
};

const KIND_META: Record<FeedEvent["kind"], { icon: string; color: string; label: string }> = {
  link_sent:       { icon: "🔗", color: "#3b82f6", label: "link sent" },
  comment_replied: { icon: "↩",  color: "#a78bfa", label: "replied" },
  dm_sent:         { icon: "📩", color: "#60a5fa", label: "DM sent" },
  follow_pending:  { icon: "⏳", color: "#fbbf24", label: "waiting" },
  skipped:         { icon: "—",  color: "#444",    label: "skipped" },
};

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

const LS_KEY = "mira_feed_events";

function loadFromStorage(): FeedEvent[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]") as FeedEvent[]; } catch { return []; }
}
function saveToStorage(events: FeedEvent[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(events.slice(0, 500))); } catch {}
}

export function MiraFeed() {
  const [events, setEvents]   = useState<FeedEvent[]>([]);
  const [paused, setPaused]   = useState(false);
  const [offset, setOffset]   = useState(0); // which 10 to show (for slow loop)
  const seenIds = useRef<Set<string>>(new Set());

  // load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    stored.forEach((e) => seenIds.current.add(e.id));
    setEvents(stored);
  }, []);

  // poll server every 5s
  const { data: feedData } = useFeed<{ events: FeedEvent[] }>({ refetchInterval: 5000 });

  // merge any unseen server events into local state + localStorage
  useEffect(() => {
    const fresh = feedData?.events;
    if (!fresh) return;
    const newOnes = fresh.filter((e) => !seenIds.current.has(e.id));
    if (newOnes.length === 0) return;
    newOnes.forEach((e) => seenIds.current.add(e.id));
    setEvents((prev) => {
      const merged = [...newOnes, ...prev].slice(0, 500);
      saveToStorage(merged);
      return merged;
    });
  }, [feedData]);

  // slow loop — advance offset every 3s
  useEffect(() => {
    if (paused || events.length <= 10) return;
    const id = setInterval(() => {
      setOffset((o) => (o + 1) % Math.max(1, events.length - 9));
    }, 3000);
    return () => clearInterval(id);
  }, [paused, events.length]);

  const visible = events.slice(offset, offset + 10);

  return (
    <div
      className="h-full flex flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: "#555" }}>
          Live Activity
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: paused ? "#333" : "#3b82f6", boxShadow: paused ? "none" : "0 0 6px #3b82f6" }}
          />
          <span className="text-[10px]" style={{ color: "#444" }}>{paused ? "paused" : "live"}</span>
        </div>
      </div>

      {/* events */}
      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
        {visible.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] text-center" style={{ color: "#333" }}>
              No activity yet.<br />Click "Reply all" on a post.
            </p>
          </div>
        ) : (
          visible.map((ev, i) => {
            const meta = KIND_META[ev.kind];
            const opacity = 1 - (i * 0.07); // subtle fade for older items
            return (
              <div
                key={ev.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-700"
                style={{
                  background: "#111",
                  border: "1px solid #1e1e1e",
                  opacity: Math.max(0.3, opacity),
                }}
              >
                <span className="text-[14px] w-5 text-center shrink-0">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    {ev.username && (
                      <span className="text-[11px] truncate" style={{ color: "#666" }}>
                        @{ev.username}
                      </span>
                    )}
                  </div>
                  {ev.detail && ev.kind !== "skipped" && (
                    <p className="text-[10px] truncate mt-0.5" style={{ color: "#3a3a3a" }}>
                      {ev.detail}
                    </p>
                  )}
                </div>
                <span className="text-[10px] shrink-0" style={{ color: "#333" }}>
                  {ago(ev.ts)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* counter */}
      {events.length > 0 && (
        <div className="mt-3 text-center">
          <span className="text-[10px]" style={{ color: "#333" }}>
            {events.length} total events
          </span>
        </div>
      )}
    </div>
  );
}
