"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar, type View } from "@/components/Sidebar";
import { Chat } from "@/components/Chat";
import { SettingsView } from "@/components/Views";
import { Workspace } from "@/components/Workspace";
import { Brain } from "@/components/Brain";
import { Dashboard } from "@/components/Dashboard";
import { ConnectGate } from "@/components/ConnectGate";
import { MiraLogo } from "@/components/MiraLogo";
import {
  loadThreads,
  saveThreads,
  loadSettings,
  loadActiveThread,
  saveActiveThread,
  DEFAULT_SETTINGS,
} from "@/lib/storage";
import type { Thread, Settings } from "@/lib/types";
import { uid } from "@/lib/utils";

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [view, setView] = useState<View>("dashboard");
  // null = checking, false = no Instagram account, true = connected
  const [connected, setConnected] = useState<boolean | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setThreads(loadThreads());
    setSettings(loadSettings());
    setActiveId(loadActiveThread());
    setHydrated(true);
    try {
      setPreview(localStorage.getItem("mira.preview") === "1");
    } catch {
      /* ignore */
    }
    fetch("/api/ig/status")
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (hydrated) saveThreads(threads);
  }, [threads, hydrated]);

  useEffect(() => {
    if (hydrated) saveActiveThread(activeId);
  }, [activeId, hydrated]);

  const sortedThreads = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
  const active = threads.find((t) => t.id === activeId) ?? null;

  function newChat() {
    const t: Thread = {
      id: uid(),
      title: "",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    setView("chat");
  }

  function selectThread(id: string) {
    setActiveId(id);
    setView("chat");
  }

  function deleteThread(id: string) {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function updateThread(t: Thread) {
    setThreads((prev) => prev.map((x) => (x.id === t.id ? t : x)));
  }

  useEffect(() => {
    if (hydrated && view === "chat" && !active) newChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, view]);

  // ── auth gate — the app is hidden until Instagram is connected ──
  if (connected === null) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <MiraLogo size={44} />
        </motion.div>
      </div>
    );
  }
  if (!connected && !preview) return <ConnectGate />;

  return (
    <div
      className="h-screen w-screen p-3.5"
      style={{ background: "var(--bg-frame)" }}
    >
      <div
        className="h-full w-full flex rounded-[32px] overflow-hidden"
        style={{
          background: "var(--bg)",
          boxShadow: "var(--shadow-pop)",
          border: "1px solid color-mix(in srgb, var(--text) 6%, transparent)",
        }}
      >
      <Sidebar
        threads={sortedThreads}
        activeThreadId={activeId}
        view={view}
        onNewChat={newChat}
        onSelectThread={selectThread}
        onDeleteThread={deleteThread}
        onSelectView={setView}
      />
      <main className="flex-1 min-w-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={view + (activeId || "")}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="absolute inset-0"
          >
            {view === "dashboard" && <Dashboard />}
            {view === "chat" && (
              <Chat thread={active} settings={settings} onUpdateThread={updateThread} />
            )}
            {view === "comments" && <Workspace />}
            {view === "brain" && <Brain />}
            {view === "settings" && <SettingsView settings={settings} onChange={setSettings} />}
          </motion.div>
        </AnimatePresence>
      </main>
      </div>
    </div>
  );
}
