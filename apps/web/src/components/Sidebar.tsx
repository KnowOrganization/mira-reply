"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MessageSquare,
  MessagesSquare,
  LayoutDashboard,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  LogOut,
  LogIn,
  Sparkles,
  Sun,
  Moon,
  Brain as BrainIcon,
  Zap,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { MiraLogo } from "./MiraLogo";
import type { Thread } from "@/lib/types";
import { useStatus, useClarifications, useDisconnect, qk, type IgStatus } from "@/lib/api/hooks";
import { SectionLabel } from "./ui";

type View = "dashboard" | "chat" | "comments" | "brain" | "settings" | "automations";

type Props = {
  threads: Thread[];
  activeThreadId: string | null;
  view: View;
  onNewChat: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  onSelectView: (v: View) => void;
};

const SPRING = { type: "spring" as const, stiffness: 320, damping: 30 };

export function Sidebar({
  threads,
  activeThreadId,
  view,
  onNewChat,
  onSelectThread,
  onDeleteThread,
  onSelectView,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const qc = useQueryClient();

  const { data: status } = useStatus<IgStatus>({ refetchInterval: 30_000 });
  const { data: clarData } = useClarifications<{ open?: unknown[] }>({ refetchInterval: 30_000 });
  const disconnectMut = useDisconnect();

  const account = status?.account ? { username: status.account.username } : null;
  const pendingCount = status?.pendingCount ?? 0;
  const openClar = (clarData?.open ?? []).length;

  // SSE-driven freshness — refetch status + clarifications on each relevant event
  useEffect(() => {
    const es = new EventSource("/api/ig/stream");
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === "draft" || ev.type === "sent") {
          qc.invalidateQueries({ queryKey: qk.status });
          qc.invalidateQueries({ queryKey: qk.clarifications });
        }
      } catch {}
    };
    return () => es.close();
  }, [qc]);

  async function logout() {
    if (!confirm("Log out of Instagram?")) return;
    await disconnectMut.mutateAsync().catch(() => {});
    window.location.href = "/";
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 212 }}
      transition={SPRING}
      className="h-full flex flex-col shrink-0"
      style={{ background: "var(--bg-sidebar)" }}
    >
      {/* header */}
      <div className="flex items-center justify-between h-16 px-4">
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.16 }}
            >
              <MiraLogo size={24} showWordmark />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setCollapsed((c) => !c)}
          className="p-2 rounded-xl transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-inset)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </motion.button>
      </div>

      {/* new chat */}
      <div className="px-3">
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          onClick={onNewChat}
          className={cn(
            "w-full flex items-center gap-2 h-9 rounded-lg text-[13px] font-semibold",
            collapsed ? "justify-center px-0" : "px-3"
          )}
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <Plus size={16} strokeWidth={2.4} />
          {!collapsed && <span>New chat</span>}
        </motion.button>
      </div>

      {/* main nav */}
      <nav className="px-3 mt-3 space-y-0.5">
        <NavItem
          icon={<LayoutDashboard size={16} />}
          label="Dashboard"
          active={view === "dashboard"}
          collapsed={collapsed}
          onClick={() => onSelectView("dashboard")}
        />
        <NavItem
          icon={<MessagesSquare size={16} />}
          label="Workspace"
          active={view === "comments"}
          collapsed={collapsed}
          badge={pendingCount + openClar > 0 ? pendingCount + openClar : undefined}
          alert={openClar > 0}
          onClick={() => onSelectView("comments")}
        />
        <NavItem
          icon={<BrainIcon size={16} />}
          label="Brain"
          active={view === "brain"}
          collapsed={collapsed}
          onClick={() => onSelectView("brain")}
        />
        <NavItem
          icon={<Zap size={16} />}
          label="Automations"
          active={view === "automations"}
          collapsed={collapsed}
          onClick={() => onSelectView("automations")}
        />
      </nav>

      {!collapsed && (
        <>
          <div className="px-1 mt-2"><SectionLabel>Chats</SectionLabel></div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 space-y-0.5">
            {threads.length === 0 && (
              <div
                className="px-3 py-2 text-xs"
                style={{ color: "var(--text-subtle)" }}
              >
                No chats yet
              </div>
            )}
            <AnimatePresence initial={false}>
              {threads.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                >
                  <ThreadRow
                    thread={t}
                    active={view === "chat" && activeThreadId === t.id}
                    onSelect={() => onSelectThread(t.id)}
                    onDelete={() => onDeleteThread(t.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* brand card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-3 mb-3 mt-3 rounded-xl p-3.5"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              <Sparkles size={14} />
            </div>
            <div
              className="text-[12.5px] font-semibold leading-tight"
              style={{ color: "var(--accent-deep)" }}
            >
              Replies that sound like you
            </div>
            <div
              className="text-[11.5px] mt-1 leading-snug"
              style={{ color: "var(--text-muted)" }}
            >
              Unique every time. Never flagged.
            </div>
          </motion.div>
        </>
      )}

      {collapsed && <div className="flex-1" />}

      {/* footer */}
      <div className="px-3 py-3 space-y-0.5">
        {account ? (
          collapsed ? (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={logout}
              title={`@${account.username} — log out`}
              className="w-full h-8 flex items-center justify-center rounded-md transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-inset)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              aria-label="Log out"
            >
              <LogOut size={16} />
            </motion.button>
          ) : (
            <div
              className="flex items-center gap-2.5 px-2.5 h-9 rounded-lg"
              style={{ background: "var(--bg-inset)" }}
            >
              <span className="glow-dot shrink-0" />
              <span
                className="truncate flex-1 text-[12.5px] font-semibold"
                style={{ color: "var(--text)" }}
              >
                @{account.username}
              </span>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={logout}
                title="Log out"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-elev)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                aria-label="Log out"
              >
                <LogOut size={14} />
              </motion.button>
            </div>
          )
        ) : (
          <a
            href="/api/ig/connect"
            title="Sign in with Instagram"
            className={cn(
              "w-full flex items-center gap-2 h-9 rounded-lg text-[13px] font-semibold transition active:scale-[0.98]",
              collapsed ? "justify-center px-0" : "px-3"
            )}
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <LogIn size={16} />
            {!collapsed && <span>Sign in</span>}
          </a>
        )}
        <ThemeToggle collapsed={collapsed} />
        <NavItem
          icon={<SettingsIcon size={16} />}
          label="Settings"
          active={view === "settings"}
          collapsed={collapsed}
          onClick={() => onSelectView("settings")}
        />
      </div>
    </motion.aside>
  );
}

function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("mira.theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light" : "Switch to dark"}
      className={cn(
        "w-full flex items-center gap-2.5 h-8 rounded-md text-[13px] font-medium transition-colors",
        collapsed ? "justify-center px-0" : "px-2"
      )}
      style={{ color: "var(--text-muted)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-inset)"; e.currentTarget.style.color = "var(--text)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
    >
      <span className="shrink-0 flex items-center justify-center" style={{ color: "var(--text-subtle)" }}>
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
      {!collapsed && (
        <span className="truncate flex-1 text-left">
          {dark ? "Light mode" : "Dark mode"}
        </span>
      )}
    </button>
  );
}

function NavItem({
  icon,
  label,
  active,
  collapsed,
  badge,
  alert,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  badge?: number;
  alert?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "relative w-full flex items-center gap-2.5 h-8 rounded-md text-[13px] font-medium transition-colors",
        collapsed ? "justify-center px-0" : "px-2"
      )}
      style={
        active
          ? { background: "var(--bg-inset)", color: "var(--text)" }
          : { color: "var(--text-muted)" }
      }
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-inset)"; e.currentTarget.style.color = "var(--text)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = active ? "var(--text)" : "var(--text-muted)"; }}
    >
      <span
        className="shrink-0 flex items-center justify-center relative"
        style={{ color: active ? "var(--accent)" : "var(--text-subtle)" }}
      >
        {icon}
        {alert && (
          <span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
            style={{ background: "var(--accent)", boxShadow: "0 0 0 2px var(--bg-sidebar)" }}
          />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="truncate flex-1 text-left">{label}</span>
          {badge && badge > 0 && (
            <span
              className="text-[10.5px] px-1.5 py-0.5 rounded-md font-semibold tabular-nums shrink-0"
              style={
                alert
                  ? { background: "var(--accent)", color: "var(--accent-fg)" }
                  : { background: "var(--bg-elev)", color: "var(--text-muted)", border: "1px solid var(--border)" }
              }
            >
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}

function ThreadRow({
  thread,
  active,
  onSelect,
  onDelete,
}: {
  thread: Thread;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-2.5 h-8 px-2 rounded-md text-[13px] cursor-pointer transition-colors"
      style={
        active
          ? { background: "var(--bg-inset)", color: "var(--text)", fontWeight: 500 }
          : { color: "var(--text-muted)" }
      }
      onClick={onSelect}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-inset)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <MessageSquare
        size={14}
        className="shrink-0"
        style={{ color: active ? "var(--accent)" : "var(--text-subtle)" }}
      />
      <span className="truncate flex-1">{thread.title || "New chat"}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 transition p-1 rounded-md"
        style={{ color: "var(--text-subtle)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elev)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        aria-label="Delete chat"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export type { View };
