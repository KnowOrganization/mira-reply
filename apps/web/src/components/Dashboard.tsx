"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/lib/api/hooks";
import {
  MessageCircle,
  Send,
  FileText,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Heart,
} from "lucide-react";

type Dash = {
  configured: boolean;
  connected: boolean;
  account: { username: string; connectedAt: number } | null;
  replyMode: string;
  today: {
    comments: number;
    autoReplied: number;
    drafted: number;
    sent: number;
    dmSent: number;
  } | null;
  pending: number;
  clarsOpen: number;
  clarsResolved: number;
  coverage: number;
  totalComments: number;
  totalReplies: number;
  days: { date: string; comments: number; replies: number }[];
  intents: Record<string, number>;
  hourly: number[];
  themes: Record<string, number>;
  knowledge: { total: number; reused: number; top: { q: string; hits: number } | null };
  antiBan: {
    sentToday: number;
    cap: number;
  };
  superfans: { username: string; igUserId: string; commentCount: number; repliedCount: number }[];
  topPosts: {
    id: string;
    caption: string;
    thumb?: string;
    permalink?: string;
    comments: number;
    interactions: number;
  }[];
};

function useCountUp(target: number, ms = 800): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function Dashboard() {
  const { data: raw } = useDashboard<Dash>({ refetchInterval: 60_000 });
  // only accept a fully-shaped dashboard payload (guards transient/empty responses)
  const d = raw && typeof raw.coverage === "number" ? raw : null;

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      <div
        className="h-12 border-b flex items-center px-4 gap-3 shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="text-sm font-medium tracking-tight">Dashboard</div>
        {d?.account && (
          <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
            @{d.account.username}
          </span>
        )}
        {d && (
          <span
            className="ml-auto text-[10.5px] px-2 py-0.5 rounded-full border"
            style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}
          >
            mode · {d.replyMode}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!d ? (
          <div className="p-10 text-center text-xs" style={{ color: "var(--text-subtle)" }}>
            Loading…
          </div>
        ) : !d.connected ? (
          <div className="p-10 text-center text-xs" style={{ color: "var(--text-subtle)" }}>
            Connect Instagram to see your dashboard.
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-7">
            <Hero d={d} />
            <TodayStrip d={d} />
            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
              <TimelineCard days={d.days} />
              <IntentCard intents={d.intents} />
            </div>
            <HoursCard hourly={d.hourly} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <KnowledgeCard d={d} />
              <AntiBanCard d={d} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SuperfansCard fans={d.superfans} />
              <TopPostsCard posts={d.topPosts} />
            </div>
            <ActivityLine d={d} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── hero ─────────────────────────────────────────────────────────────────
function Hero({ d }: { d: Dash }) {
  const cov = useCountUp(d.coverage);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border p-7 relative overflow-hidden"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-elev)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(75% 85% at 88% 4%, color-mix(in srgb, var(--accent) 17%, transparent), transparent 72%)",
        }}
      />
      <div className="relative">
        <div className="text-[12px]" style={{ color: "var(--text-subtle)" }}>
          {greet} — here&apos;s how Mira is handling things
        </div>
        <div className="flex items-end gap-3 mt-2">
          <div
            className="display"
            style={{
              fontSize: "clamp(56px, 8.5vw, 92px)",
              letterSpacing: "-0.05em",
              color: "var(--accent)",
            }}
          >
            {cov}%
          </div>
          <div className="pb-3 text-[13px] leading-5" style={{ color: "var(--text-muted)" }}>
            of comments
            <br />
            covered
          </div>
        </div>
        <div className="flex gap-5 mt-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
          <span>
            <b style={{ color: "var(--text)" }}>{d.totalReplies}</b> replies sent
          </span>
          <span>
            <b style={{ color: "var(--text)" }}>{d.totalComments}</b> comments seen
          </span>
          <span>
            <b style={{ color: "var(--text)" }}>{d.knowledge.total}</b> facts known
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── today ────────────────────────────────────────────────────────────────
function TodayStrip({ d }: { d: Dash }) {
  const t = d.today;
  const cells: { icon: React.ReactNode; label: string; value: number; accent?: boolean }[] = [
    { icon: <MessageCircle size={14} />, label: "New comments", value: t?.comments ?? 0 },
    { icon: <Send size={14} />, label: "Auto-replied", value: t?.autoReplied ?? 0 },
    { icon: <FileText size={14} />, label: "Pending", value: d.pending },
    { icon: <HelpCircle size={14} />, label: "Needs you", value: d.clarsOpen, accent: d.clarsOpen > 0 },
    { icon: <Heart size={14} />, label: "Links DM'd", value: t?.dmSent ?? 0 },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cells.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + i * 0.04 }}
          className="rounded-2xl border p-3.5"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-elev)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center gap-1.5" style={{ color: c.accent ? "var(--accent)" : "var(--text-subtle)" }}>
            {c.icon}
            <span className="text-[10.5px] uppercase tracking-[0.06em]">{c.label}</span>
          </div>
          <div
            className="text-[26px] font-semibold mt-1 tabular-nums"
            style={{ color: c.accent && c.value > 0 ? "var(--accent)" : "var(--text)" }}
          >
            {c.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── 14-day timeline ──────────────────────────────────────────────────────
function TimelineCard({ days }: { days: Dash["days"] }) {
  const max = Math.max(1, ...days.map((x) => x.comments));
  return (
    <Card title="Comments — last 14 days" icon={<TrendingUp size={13} />}>
      <div className="flex items-end gap-1.5 h-32 mt-1">
        {days.map((day) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="w-full flex flex-col justify-end items-center h-full relative">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{ height: `${(day.comments / max) * 100}%`, background: "var(--border-strong)", minHeight: day.comments ? 3 : 0 }}
              />
              <div
                className="w-[60%] rounded-t-sm absolute bottom-0"
                style={{ height: `${(day.replies / max) * 100}%`, background: "var(--accent)", minHeight: day.replies ? 3 : 0 }}
              />
            </div>
            <span className="text-[8.5px]" style={{ color: "var(--text-subtle)" }}>
              {day.date.slice(8)}
            </span>
          </div>
        ))}
      </div>
      <Legend
        items={[
          { color: "var(--border-strong)", label: "comments" },
          { color: "var(--accent)", label: "replies" },
        ]}
      />
    </Card>
  );
}

// ── intent donut ─────────────────────────────────────────────────────────
const INTENT_COLORS: Record<string, string> = {
  simple_acknowledgement: "#c1623e",
  question_general: "#d99a5b",
  question_post_specific: "#8a9a6b",
  link_request: "#b07d57",
  personal_relationship: "#c98a9b",
  business_inquiry: "#7a8a9a",
  unclear: "#b3a48c",
};
function IntentCard({ intents }: { intents: Record<string, number> }) {
  const entries = Object.entries(intents).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((n, [, v]) => n + v, 0) || 1;
  let acc = 0;
  const R = 32;
  const C = 2 * Math.PI * R;
  return (
    <Card title="Reply intents" icon={<Sparkles size={13} />}>
      {entries.length === 0 ? (
        <Empty>No replies yet.</Empty>
      ) : (
        <div className="flex items-center gap-4 mt-1">
          <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0">
            <circle cx="42" cy="42" r={R} fill="none" stroke="var(--border)" strokeWidth="11" />
            {entries.map(([k, v]) => {
              const frac = v / total;
              const seg = (
                <circle
                  key={k}
                  cx="42"
                  cy="42"
                  r={R}
                  fill="none"
                  stroke={INTENT_COLORS[k] || "#b3a48c"}
                  strokeWidth="11"
                  strokeDasharray={`${frac * C} ${C}`}
                  strokeDashoffset={-acc * C}
                  transform="rotate(-90 42 42)"
                />
              );
              acc += frac;
              return seg;
            })}
          </svg>
          <div className="flex-1 min-w-0 space-y-1">
            {entries.slice(0, 5).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-[11px]">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ background: INTENT_COLORS[k] || "#b3a48c" }}
                />
                <span className="truncate" style={{ color: "var(--text-muted)" }}>
                  {k.replace(/_/g, " ")}
                </span>
                <span className="ml-auto tabular-nums" style={{ color: "var(--text)" }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── hourly heatmap ───────────────────────────────────────────────────────
function HoursCard({ hourly }: { hourly: number[] }) {
  const max = Math.max(1, ...hourly);
  return (
    <Card title="When your audience comments" icon={<TrendingUp size={13} />}>
      <div className="flex gap-1 mt-1">
        {hourly.map((v, h) => (
          <div key={h} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm"
              style={{
                height: 26,
                background: "var(--accent)",
                opacity: 0.12 + (v / max) * 0.88,
              }}
              title={`${h}:00 — ${v} comments`}
            />
            {h % 6 === 0 && (
              <span className="text-[8px]" style={{ color: "var(--text-subtle)" }}>
                {h}h
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── knowledge ────────────────────────────────────────────────────────────
function KnowledgeCard({ d }: { d: Dash }) {
  return (
    <Card title="Knowledge" icon={<Sparkles size={13} />}>
      <div className="flex gap-5 mt-1">
        <Metric value={d.knowledge.total} label="facts known" />
        <Metric value={d.knowledge.reused} label="reused in replies" accent />
        <Metric value={d.clarsResolved} label="clarifications resolved" />
      </div>
      {d.knowledge.top && d.knowledge.top.hits > 0 && (
        <div className="mt-3 text-[11.5px] rounded-lg border p-2.5" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          Most reused: <b style={{ color: "var(--text)" }}>{d.knowledge.top.q}</b> — answered{" "}
          {d.knowledge.top.hits}× automatically.
        </div>
      )}
    </Card>
  );
}

// ── anti-ban health ──────────────────────────────────────────────────────
function AntiBanCard({ d }: { d: Dash }) {
  const { sentToday, cap } = d.antiBan;
  const pct = cap > 0 ? Math.min(100, Math.round((sentToday / cap) * 100)) : 0;
  const tone = pct < 60 ? "#2a7" : pct < 90 ? "#a86" : "#d14";
  return (
    <Card title="Account safety" icon={<ShieldCheck size={13} />}>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-[22px] font-medium tabular-nums" style={{ color: tone }}>
          {sentToday}
        </span>
        <span className="text-[12px]" style={{ color: "var(--text-subtle)" }}>
          / {cap} daily send cap
        </span>
      </div>
      <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} />
      </div>
      <div className="text-[11px] mt-2.5 leading-5" style={{ color: "var(--text-muted)" }}>
        Every reply is uniqueness-checked before sending. Sends are paced &
        jittered — no bursts.
      </div>
    </Card>
  );
}

// ── people ───────────────────────────────────────────────────────────────
function SuperfansCard({ fans }: { fans: Dash["superfans"] }) {
  return (
    <Card title="Top commenters" icon={<Heart size={13} />}>
      {fans.length === 0 ? (
        <Empty>No commenters yet.</Empty>
      ) : (
        <div className="space-y-1.5 mt-1">
          {fans.map((f, i) => (
            <div key={f.igUserId} className="flex items-center gap-2 text-[12px]">
              <span className="text-[10px] w-4 tabular-nums" style={{ color: "var(--text-subtle)" }}>
                {i + 1}
              </span>
              <span className="truncate" style={{ color: "var(--text)" }}>
                @{f.username || f.igUserId.slice(0, 8)}
              </span>
              <span className="ml-auto tabular-nums" style={{ color: "var(--text-muted)" }}>
                {f.commentCount} comment{f.commentCount === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TopPostsCard({ posts }: { posts: Dash["topPosts"] }) {
  return (
    <Card title="Top posts" icon={<TrendingUp size={13} />}>
      {posts.length === 0 ? (
        <Empty>No posts synced.</Empty>
      ) : (
        <div className="space-y-1.5 mt-1">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-md shrink-0 overflow-hidden"
                style={{ background: "var(--bg-sidebar)" }}
              >
                {p.thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumb} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                )}
              </div>
              <div className="text-[11.5px] truncate flex-1" style={{ color: "var(--text-muted)" }}>
                {p.caption?.slice(0, 48) || "(no caption)"}
              </div>
              <span className="text-[11px] tabular-nums shrink-0" style={{ color: "var(--text)" }}>
                {p.comments}💬
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── activity narration ───────────────────────────────────────────────────
function ActivityLine({ d }: { d: Dash }) {
  const t = d.today;
  const parts: string[] = [];
  if (t?.comments) parts.push(`saw ${t.comments} new comment${t.comments === 1 ? "" : "s"}`);
  if (t?.autoReplied) parts.push(`auto-replied to ${t.autoReplied}`);
  if (t?.drafted) parts.push(`drafted ${t.drafted} for you`);
  if (t?.dmSent) parts.push(`DM'd ${t.dmSent} link${t.dmSent === 1 ? "" : "s"}`);
  if (d.clarsOpen) parts.push(`flagged ${d.clarsOpen} for your input`);
  const sentence = parts.length
    ? `Today, Mira ${parts.slice(0, -1).join(", ")}${parts.length > 1 ? " and " : ""}${parts.slice(-1)}.`
    : "Quiet so far today — Mira is watching for new comments.";
  return (
    <div
      className="rounded-2xl border p-4 text-[12.5px] leading-5"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-elev)",
        color: "var(--text-muted)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <Sparkles size={12} className="inline mr-1.5 -mt-0.5" style={{ color: "var(--text-subtle)" }} />
      {sentence}
    </div>
  );
}

// ── shared bits ──────────────────────────────────────────────────────────
function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border p-5"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-elev)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.07em] mb-2"
        style={{ color: "var(--text-subtle)" }}
      >
        {icon}
        {title}
      </div>
      {children}
    </motion.div>
  );
}

function Metric({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  const v = useCountUp(value);
  return (
    <div>
      <div
        className="text-[22px] font-semibold tabular-nums leading-tight"
        style={{ color: accent && value > 0 ? "var(--accent)" : "var(--text)" }}
      >
        {v}
      </div>
      <div className="text-[10.5px]" style={{ color: "var(--text-subtle)" }}>
        {label}
      </div>
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex gap-3 mt-2">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-subtle)" }}>
          <span className="w-2 h-2 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11.5px] py-3 text-center" style={{ color: "var(--text-subtle)" }}>
      {children}
    </div>
  );
}
