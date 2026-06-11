"use client";

import type { Thread, Settings } from "./types";

const THREADS_KEY = "mira.threads.v1";
const SETTINGS_KEY = "mira.settings.v1";
const ACTIVE_KEY = "mira.active.v1";

export const DEFAULT_SETTINGS: Settings = {
  model: "qwen2.5:7b-instruct",
  ollamaHost: "http://localhost:11434",
  systemPrompt:
    "You are Mira — a personal AI for the user's Instagram account. " +
    "Default reply language: English. Switch to Hinglish/Roman Hindi only if the user writes in it. " +
    "Be casual, short, human-like. No corporate tone, no 'As an AI', no em-dashes, no filler. " +
    "Reference the account snapshot directly. Keep replies tight.",
};

export function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    return raw ? (JSON.parse(raw) as Thread[]) : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: Thread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function loadActiveThread(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveThread(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}
