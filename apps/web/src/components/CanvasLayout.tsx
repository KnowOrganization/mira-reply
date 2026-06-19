"use client";

import { useEffect, useState } from "react";
import {
  Home, Zap, MessageSquare, Users, Bot, BarChart2, Radio,
  CreditCard, Settings, ChevronDown, LogOut, Headphones,
  Crown, Images, MessagesSquare, AtSign, Tag, UserCheck,
  BookOpen, Sparkles, Mic2, TrendingUp, Heart,
  MessageCircle, Send, Camera, BrainCircuit, Gem,
} from "lucide-react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MiraLogo } from "./MiraLogo";
import { PostCanvas } from "./PostCanvas";
import { MiraFeed } from "./MiraFeed";
import { useStatus, type IgStatus } from "@/lib/api/hooks";

// Heavy, non-default views — split out of the dashboard bundle so the first
// paint never parses the automations node-graph or the settings panel. They
// load on demand: automations only when its view is selected, settings only
// when opened.
const AutomationsView = dynamic(() => import("./AutomationsView").then((m) => m.AutomationsView), {
  ssr: false,
  loading: () => <PanelBoot />,
});
const SettingsPanel = dynamic(() => import("./SettingsPanel").then((m) => m.SettingsPanel), {
  ssr: false,
});
const NeuralBrainCanvas = dynamic(() => import("./NeuralBrainCanvas").then((m) => m.NeuralBrainCanvas), {
  ssr: false,
  loading: () => <PanelBoot />,
});
const InboxView = dynamic(() => import("./InboxView").then((m) => m.InboxView), {
  ssr: false,
  loading: () => <PanelBoot />,
});
const OpportunitiesView = dynamic(() => import("./OpportunitiesView").then((m) => m.OpportunitiesView), {
  ssr: false,
  loading: () => <PanelBoot />,
});

type TopView =
  | "dashboard"
  | "brain"
  | "automations"
  | "inbox"
  | "opportunities"
  | "contacts"
  | "ai-studio"
  | "analytics"
  | "channels"
  | "billing"
  | "settings";

type SubView = string;

interface NavGroup {
  id: TopView;
  icon: React.ReactNode;
  label: string;
  sub?: { id: SubView; label: string; icon?: React.ReactNode }[];
  badge?: string;
  soon?: boolean;
}

const NAV: NavGroup[] = [
  { id: "dashboard", icon: <Home size={15} />, label: "Dashboard" },
  { id: "brain", icon: <BrainCircuit size={15} />, label: "Brain" },
  { id: "opportunities", icon: <Gem size={15} />, label: "Opportunities" },
  {
    id: "automations", icon: <Zap size={15} />, label: "Automations",
    sub: [
      { id: "all", label: "All Automations", icon: <Zap size={12} /> },
      { id: "create", label: "Create New", icon: <Sparkles size={12} /> },
      { id: "templates", label: "Templates", icon: <BookOpen size={12} /> },
      { id: "history", label: "Execution History", icon: <BarChart2 size={12} /> },
    ],
  },
  {
    id: "inbox", icon: <MessageSquare size={15} />, label: "Inbox",
    sub: [
      { id: "dms", label: "DMs", icon: <MessagesSquare size={12} /> },
      { id: "comments", label: "Comments", icon: <MessageCircle size={12} /> },
      { id: "mentions", label: "Mentions", icon: <AtSign size={12} /> },
    ],
  },
  {
    id: "contacts", icon: <Users size={15} />, label: "Contacts", soon: true,
    sub: [
      { id: "all", label: "All Contacts", icon: <Users size={12} /> },
      { id: "leads", label: "Leads", icon: <UserCheck size={12} /> },
      { id: "customers", label: "Customers", icon: <Crown size={12} /> },
      { id: "tags", label: "Tags", icon: <Tag size={12} /> },
    ],
  },
  {
    id: "ai-studio", icon: <Bot size={15} />, label: "AI Studio", soon: true,
    sub: [
      { id: "assistant", label: "AI Assistant", icon: <Bot size={12} /> },
      { id: "agents", label: "AI Agents", icon: <Sparkles size={12} /> },
      { id: "content", label: "Content Generator", icon: <Mic2 size={12} /> },
      { id: "brand", label: "Brand Voice", icon: <Heart size={12} /> },
    ],
  },
  {
    id: "analytics", icon: <BarChart2 size={15} />, label: "Analytics", soon: true,
    sub: [
      { id: "overview", label: "Overview", icon: <BarChart2 size={12} /> },
      { id: "engagement", label: "Engagement", icon: <Heart size={12} /> },
      { id: "conversions", label: "Conversions", icon: <TrendingUp size={12} /> },
    ],
  },
  {
    id: "channels", icon: <Radio size={15} />, label: "Channels", soon: true,
    sub: [
      { id: "instagram", label: "Instagram", icon: <Camera size={12} /> },
      { id: "facebook", label: "Facebook", icon: <MessageCircle size={12} /> },
      { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle size={12} /> },
      { id: "telegram", label: "Telegram", icon: <Send size={12} /> },
    ],
  },
];

const BOTTOM_NAV: NavGroup[] = [
  { id: "billing", icon: <CreditCard size={15} />, label: "Billing", soon: true },
  { id: "settings", icon: <Settings size={15} />, label: "Settings" },
];

function getInitials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export function CanvasLayout() {
  const [account, setAccount] = useState<string>("");
  const [settingsOpen, setSettings] = useState(false);
  const [view, setView] = useState<TopView>(() => {
    if (typeof window === "undefined") return "dashboard";
    return (localStorage.getItem("mira_view") as TopView) ?? "dashboard";
  });
  const [subView, setSubView] = useState<SubView>("all");
  const [expanded, setExpanded] = useState<TopView | null>(() => {
    if (typeof window === "undefined") return null;
    const v = (localStorage.getItem("mira_view") as TopView) ?? "dashboard";
    const group = NAV.find((n) => n.id === v);
    return group?.sub ? v : null;
  });

  const { data: status } = useStatus<IgStatus>();
  useEffect(() => {
    if (status?.account?.username) setAccount(status.account.username);
  }, [status]);

  function navigate(id: TopView, sub?: SubView) {
    if (id === "settings") { setSettings(true); return; }
    const group = NAV.find((n) => n.id === id) ?? BOTTOM_NAV.find((n) => n.id === id);
    if (group?.soon) return;
    setView(id);
    localStorage.setItem("mira_view", id);
    if (sub) setSubView(sub);
    if (group?.sub) {
      if (sub) {
        setExpanded(id);
      } else {
        setExpanded((prev) => (prev === id ? null : id));
      }
    } else {
      setExpanded(null);
    }
  }

  function toggleExpand(id: TopView) {
    const group = NAV.find((n) => n.id === id);
    if (!group?.sub || group.soon) return;
    setExpanded((prev) => (prev === id ? null : id));
    if (view !== id) {
      setView(id);
      localStorage.setItem("mira_view", id);
      setSubView("all");
    }
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--bg-frame)" }}>

      {/* ── sidebar — hidden in automations (it has its own left panel) ── */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* logo + brand */}
        <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 9, borderBottom: "1px solid var(--border)" }}>
          <MiraLogo size={26} />
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>Mira</span>
        </div>

        {/* account card */}
        {account && (
          <div style={{ margin: "10px 10px 4px", padding: "9px 10px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--bg-inset)", border: "1px solid var(--bg-inset)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text)" }}>{getInitials(account)}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{account}</div>
              <div style={{ fontSize: 10, color: "var(--text-subtle)", marginTop: 1 }}>Instagram</div>
            </div>
          </div>
        )}

        {/* nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px 0" }} className="scrollbar-thin">
          {NAV.map((item) => {
            const active = view === item.id;
            const isExpanded = expanded === item.id;
            return (
              <div key={item.id}>
                <button
                  onClick={() => item.sub ? toggleExpand(item.id) : navigate(item.id)}
                  disabled={item.soon}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "7px 9px",
                    borderRadius: 9,
                    background: active && !item.soon ? "var(--accent-soft)" : "transparent",
                    border: "none",
                    cursor: item.soon ? "default" : "pointer",
                    color: item.soon ? "var(--text-subtle)" : active ? "var(--accent-deep)" : "var(--text-subtle)",
                    fontSize: 12.5,
                    fontWeight: active ? 600 : 500,
                    textAlign: "left",
                    transition: "all 0.12s",
                    marginBottom: 1,
                  }}
                  onMouseEnter={(e) => { if (!item.soon && !active) { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)"; } }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = item.soon ? "var(--text-subtle)" : active ? "var(--accent-deep)" : "var(--text-subtle)"; (e.currentTarget as HTMLElement).style.background = active && !item.soon ? "var(--accent-soft)" : "transparent"; }}
                >
                  <span style={{ flexShrink: 0, opacity: item.soon ? 0.3 : 1 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.soon && (
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-subtle)", background: "var(--border)", padding: "2px 5px", borderRadius: 4 }}>SOON</span>
                  )}
                  {item.sub && !item.soon && (
                    <ChevronDown size={11} style={{ flexShrink: 0, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s", opacity: 0.5 }} />
                  )}
                </button>

                {/* sub-items */}
                {item.sub && isExpanded && !item.soon && (
                  <div style={{ paddingLeft: 16, paddingBottom: 4 }}>
                    {item.sub.map((s) => {
                      const subActive = active && subView === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => navigate(item.id, s.id)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            padding: "5px 9px",
                            borderRadius: 7,
                            background: subActive ? "var(--accent-soft)" : "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: subActive ? "var(--accent-deep)" : "var(--text-subtle)",
                            fontSize: 11.5,
                            fontWeight: subActive ? 600 : 400,
                            textAlign: "left",
                            transition: "all 0.1s",
                            marginBottom: 1,
                          }}
                          onMouseEnter={(e) => { if (!subActive) { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)"; } }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = subActive ? "var(--accent-deep)" : "var(--text-subtle)"; (e.currentTarget as HTMLElement).style.background = subActive ? "var(--accent-soft)" : "transparent"; }}
                        >
                          {s.icon && <span style={{ opacity: 0.6 }}>{s.icon}</span>}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* divider */}
          <div style={{ margin: "10px 4px", borderTop: "1px solid var(--border)" }} />

          {BOTTOM_NAV.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                disabled={item.soon}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "7px 9px",
                  borderRadius: 9,
                  background: "transparent",
                  border: "none",
                  cursor: item.soon ? "default" : "pointer",
                  color: item.soon ? "var(--text-subtle)" : "var(--text-subtle)",
                  fontSize: 12.5,
                  fontWeight: 500,
                  textAlign: "left",
                  transition: "all 0.12s",
                  marginBottom: 1,
                }}
                onMouseEnter={(e) => { if (!item.soon) { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)"; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = item.soon ? "var(--text-subtle)" : "var(--text-subtle)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ flexShrink: 0, opacity: item.soon ? 0.3 : 1 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.soon && <span style={{ fontSize: 8.5, fontWeight: 700, color: "var(--text-subtle)", background: "var(--border)", padding: "2px 5px", borderRadius: 4 }}>SOON</span>}
              </button>
            );
          })}
        </nav>

        {/* bottom section */}
        <div style={{ padding: "10px 10px 14px", borderTop: "1px solid var(--border)" }}>
          {/* pro plan button */}
          <button style={{
            width: "100%", padding: "9px 0", borderRadius: 10,
            background: "var(--bg-inset)",
            border: "1px solid var(--bg-inset)", cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6, color: "var(--text)", fontSize: 12, fontWeight: 600,
            marginBottom: 8,
          }}>
            <Crown size={12} /> Pro Plan
          </button>

          {/* logout + support row */}
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{
              flex: 1, padding: "7px 0", borderRadius: 8,
              background: "var(--border)", border: "1px solid var(--border)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              gap: 5, color: "var(--text-subtle)", fontSize: 11, fontWeight: 500,
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >
              <LogOut size={11} /> Logout
            </button>
            <button style={{
              flex: 1, padding: "7px 0", borderRadius: 8,
              background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              gap: 5, color: "#22c55e", fontSize: 11, fontWeight: 500,
            }}>
              <Headphones size={11} /> Support
            </button>
          </div>
        </div>
      </aside>

      {/* ── main content ── */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        {view === "dashboard" && (
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0 flex flex-col relative canvas-bg">
              <div className="px-6 pt-5 pb-2 shrink-0">
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-subtle)" }}>Posts</span>
              </div>
              <PostCanvas />
            </div>
            <div className="w-[280px] shrink-0 flex flex-col px-5 py-5" style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-elev)" }}>
              <MiraFeed />
            </div>
          </div>
        )}

        {view === "brain" && (
          <div className="flex-1 min-h-0">
            <NeuralBrainCanvas />
          </div>
        )}

        {view === "automations" && (
          <div className="flex-1 min-h-0">
            <AutomationsView onBack={() => { setView("dashboard"); localStorage.setItem("mira_view", "dashboard"); setExpanded(null); }} />
          </div>
        )}

        {view === "inbox" && (
          <div className="flex-1 min-h-0">
            <InboxView />
          </div>
        )}

        {view === "opportunities" && (
          <div className="flex-1 min-h-0">
            <OpportunitiesView />
          </div>
        )}

        {(view === "contacts" || view === "ai-studio" || view === "analytics" || view === "channels" || view === "billing") && (
          <div className="flex-1 flex items-center justify-center flex-col gap-3" style={{ color: "var(--text-subtle)" }}>
            <Sparkles size={28} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Coming soon</span>
          </div>
        )}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettings(false)} onAccountChange={() => setAccount("")} />

      <style>{`
        .canvas-bg {
          background-color: var(--bg);
          background-image: radial-gradient(circle, var(--border) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .scrollbar-thin::-webkit-scrollbar { width: 3px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 2px; }
      `}</style>
    </div>
  );
}

// Loader shown in the main area while a lazily-loaded view chunk arrives. Uses
// the app theme tokens so it renders correctly in light mode.
function PanelBoot() {
  return (
    <div className="flex-1 h-full flex items-center justify-center" style={{ background: "var(--bg-frame)" }}>
      <motion.div animate={{ opacity: [0.25, 0.7, 0.25] }} transition={{ duration: 1.6, repeat: Infinity }}>
        <MiraLogo size={30} color="var(--text-subtle)" />
      </motion.div>
    </div>
  );
}
