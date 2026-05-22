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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MiraLogo } from "./MiraLogo";
import type { Thread } from "@/lib/types";

type View = "dashboard" | "chat" | "comments" | "brain" | "settings";

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
  const [account, setAccount] = useState<{ username: string } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [openClar, setOpenClar] = useState(0);

  useEffect(() => {
    const fetchStatus = () => {
      fetch("/api/ig/status")
        .then((r) => r.json())
        .then((d) => {
          setAccount(d.account ? { username: d.account.username } : null);
          setPendingCount(d.pendingCount ?? 0);
        })
        .catch(() => {});
      fetch("/api/ig/clarifications")
        .then((r) => r.json())
        .then((d) => setOpenClar((d.open ?? []).length))
        .catch(() => {});
    };
    fetchStatus();
    const t = setInterval(fetchStatus, 30_000);
    const es = new EventSource("/api/ig/stream");
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === "draft" || ev.type === "sent") fetchStatus();
      } catch {}
    };
    return () => {
      clearInterval(t);
      es.close();
    };
  }, []);

  async function logout() {
    if (!confirm("Log out of Instagram?")) return;
    try {
      await fetch("/api/ig/disconnect", { method: "POST" });
    } catch {
      /* ignore */
    }
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
            "w-full flex items-center gap-2.5 h-11 rounded-2xl text-[13.5px] font-semibold",
            collapsed ? "justify-center px-0" : "px-3.5"
          )}
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <Plus size={16} strokeWidth={2.6} />
          {!collapsed && <span>New chat</span>}
        </motion.button>
      </div>

      {/* main nav */}
      <nav className="px-3 mt-4 space-y-1.5">
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
      </nav>

      {!collapsed && (
        <>
          <div
            className="px-4 mt-7 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: "var(--text-subtle)" }}
          >
            Chats
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 space-y-1">
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
            className="card-soft mx-3 mb-3 mt-3 rounded-3xl p-4"
          >
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center mb-2.5"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              <Sparkles size={16} />
            </div>
            <div
              className="text-[13px] font-bold leading-tight"
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
      <div className="px-3 py-3 space-y-1.5">
        {account ? (
          collapsed ? (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={logout}
              title={`@${account.username} — log out`}
              className="w-full h-10 flex items-center justify-center rounded-2xl transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-inset)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              aria-label="Log out"
            >
              <LogOut size={16} />
            </motion.button>
          ) : (
            <div
              className="flex items-center gap-2.5 px-3 h-11 rounded-2xl"
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
              "w-full flex items-center gap-2 h-11 rounded-2xl text-[13.5px] font-semibold transition active:scale-[0.98]",
              collapsed ? "justify-center px-0" : "px-3.5"
            )}
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow: "var(--shadow-soft)",
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
    <motion.button
      whileHover={{ x: collapsed ? 0 : 2 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      onClick={toggle}
      title={dark ? "Switch to light" : "Switch to dark"}
      className={cn(
        "w-full flex items-center gap-3 h-12 rounded-2xl text-[13.5px] transition-colors",
        collapsed ? "justify-center px-0" : "px-2.5"
      )}
      style={{ color: "var(--text-muted)" }}
    >
      <span
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
      {!collapsed && (
        <span className="truncate flex-1 text-left">
          {dark ? "Light mode" : "Dark mode"}
        </span>
      )}
    </motion.button>
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
    <motion.button
      whileHover={!active ? { x: collapsed ? 0 : 2 } : undefined}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "relative w-full flex items-center gap-3 h-12 rounded-2xl text-[13.5px] transition-colors",
        collapsed ? "justify-center px-0" : "px-2.5"
      )}
      style={
        active
          ? {
              background: "var(--bg-elev)",
              color: "var(--text)",
              fontWeight: 700,
              boxShadow: "var(--shadow-card)",
            }
          : { color: "var(--text-muted)" }
      }
    >
      {/* icon tile */}
      <span
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center relative transition-colors"
        style={
          active
            ? { background: "var(--accent)", color: "var(--accent-fg)" }
            : { background: "var(--bg-inset)", color: "var(--text-muted)" }
        }
      >
        {icon}
        {alert && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 0 2px var(--bg-sidebar)",
            }}
          />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="truncate flex-1 text-left">{label}</span>
          {badge && badge > 0 && (
            <span
              className="text-[10.5px] px-2 py-0.5 rounded-full font-bold tabular-nums shrink-0"
              style={
                alert
                  ? { background: "var(--accent)", color: "var(--accent-fg)" }
                  : { background: "var(--bg-inset)", color: "var(--text-muted)" }
              }
            >
              {badge}
            </span>
          )}
        </>
      )}
    </motion.button>
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
    <motion.div
      whileHover={!active ? { x: 2 } : undefined}
      whileTap={{ scale: 0.98 }}
      transition={SPRING}
      className={cn(
        "group flex items-center gap-2.5 h-10 px-3 rounded-xl text-[13px] cursor-pointer transition-colors"
      )}
      style={
        active
          ? {
              background: "var(--bg-elev)",
              color: "var(--text)",
              fontWeight: 600,
              boxShadow: "var(--shadow-card)",
            }
          : { color: "var(--text-muted)" }
      }
      onClick={onSelect}
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
        className="opacity-0 group-hover:opacity-100 transition p-1 rounded-lg"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-inset)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        aria-label="Delete chat"
      >
        <Trash2 size={12} />
      </button>
    </motion.div>
  );
}

export type { View };
