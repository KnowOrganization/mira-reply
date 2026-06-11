"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/storage";
import type { Settings } from "@/lib/types";
import { KnowledgeEditor } from "@/components/Knowledge";
import { useIgSettings, usePatchIgSettings } from "@/lib/api/hooks";

type IgSettings = {
  replyMode: "shadow" | "assisted" | "balanced" | "auto";
  skipOwnComments: boolean;
  autoReplySimpleAcks: boolean;
  autoDMLinks: boolean;
  cooldownMinutes: number;
};

export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="h-12 border-b flex items-center px-4" style={{ borderColor: "var(--border)" }}>
        <div className="text-sm font-medium tracking-tight">{title}</div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {body}
        </div>
      </div>
    </div>
  );
}

export function SettingsView({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
}) {
  const [chat, setChat] = useState(settings);

  useEffect(() => setChat(settings), [settings]);

  const { data: ig } = useIgSettings<IgSettings>();
  const patchIgSettings = usePatchIgSettings();

  function saveChat() {
    onChange(chat);
    saveSettings(chat);
    toast.success("Chat settings saved.");
  }

  function patchIg(patch: Partial<IgSettings>) {
    patchIgSettings.mutate(patch);
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="h-12 border-b flex items-center px-4" style={{ borderColor: "var(--border)" }}>
        <div className="text-sm font-medium tracking-tight">Settings</div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
          {/* Auto-Reply Settings */}
          {ig && (
            <Group title="Auto-Reply" hint="How Mira handles incoming comments and DMs.">
              <Toggle
                label="Skip my own comments"
                description="Don't process or draft replies for comments by you."
                checked={ig.skipOwnComments}
                onChange={(v) => patchIg({ skipOwnComments: v })}
              />
              <Toggle
                label="Auto-reply simple acknowledgements"
                description="Auto-send for emoji/short praise like 'wow', '🔥'. No draft queue."
                checked={ig.autoReplySimpleAcks}
                onChange={(v) => patchIg({ autoReplySimpleAcks: v })}
              />
              <Toggle
                label="Auto-DM saved links"
                description="When someone asks for a location/song link, send it via DM (1/user/24h cap)."
                checked={ig.autoDMLinks}
                onChange={(v) => patchIg({ autoDMLinks: v })}
              />
              <NumberRow
                label="Cooldown per user"
                description="Don't reply to same user more than once within window."
                suffix="min"
                value={ig.cooldownMinutes}
                onChange={(v) => patchIg({ cooldownMinutes: v })}
                min={0}
                max={1440}
              />
              <Row
                label="Reply mode"
                description="Shadow = draft only · Assisted = approve each · Balanced = auto acks + confident answers · Auto = send all"
              >
                <div className="flex gap-2 flex-wrap">
                  {(["shadow", "assisted", "balanced", "auto"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => patchIg({ replyMode: m })}
                      className="h-8 px-3 rounded-md border text-xs"
                      style={{
                        borderColor: "var(--border-strong)",
                        background: ig.replyMode === m ? "var(--bg-elev)" : "transparent",
                        color: ig.replyMode === m ? "var(--text)" : "var(--text-muted)",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Row>
            </Group>
          )}

          {/* Knowledge base */}
          <Group
            title="Knowledge — what Mira knows"
            hint="Facts Mira recalls on every post. Answered clarifications land here automatically."
          >
            <KnowledgeEditor />
          </Group>

          {/* Chat with Mira */}
          <Group title="Chat with Mira" hint="Configure local model + system prompt.">
            <Row label="Model">
              <input
                value={chat.model}
                onChange={(e) => setChat({ ...chat, model: e.target.value })}
                className="w-full h-9 px-3 rounded-md border bg-transparent text-sm outline-none focus:border-strong"
                style={{ borderColor: "var(--border-strong)" }}
              />
            </Row>
            <div className="flex gap-2 flex-wrap -mt-2">
              {["qwen2.5:7b-instruct", "qwen2.5:14b-instruct", "qwen2.5:3b-instruct", "llama3.2:3b"].map((m) => (
                <motion.button
                  key={m}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setChat({ ...chat, model: m })}
                  className="text-[11px] px-2 py-1 rounded-md border hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}
                >
                  {m}
                </motion.button>
              ))}
            </div>
            <Row label="Ollama host">
              <input
                value={chat.ollamaHost}
                onChange={(e) => setChat({ ...chat, ollamaHost: e.target.value })}
                className="w-full h-9 px-3 rounded-md border bg-transparent text-sm outline-none focus:border-strong"
                style={{ borderColor: "var(--border-strong)" }}
              />
            </Row>
            <Row label="Chat system prompt">
              <textarea
                value={chat.systemPrompt}
                onChange={(e) => setChat({ ...chat, systemPrompt: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 rounded-md border bg-transparent text-sm outline-none focus:border-strong resize-y"
                style={{ borderColor: "var(--border-strong)" }}
              />
              <button
                onClick={() => setChat({ ...chat, systemPrompt: DEFAULT_SETTINGS.systemPrompt })}
                className="text-[11px] mt-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Reset to default
              </button>
            </Row>
            <div>
              <button
                onClick={saveChat}
                className="h-8 px-4 rounded-md text-xs font-medium"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                Save chat settings
              </button>
            </div>
          </Group>

          <div
            className="rounded-xl border p-4 text-xs leading-6"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <div className="font-medium mb-1" style={{ color: "var(--text)" }}>
              Local model setup
            </div>
            <div>1. Install Ollama: https://ollama.com/download</div>
            <div>
              2. Pull: <code className="font-mono">ollama pull {chat.model}</code>
            </div>
            <div>3. Auto-starts on Mac app launch.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <div className="text-[13px] font-medium tracking-tight">{title}</div>
        {hint && (
          <div className="text-[11.5px] mt-0.5" style={{ color: "var(--text-subtle)" }}>
            {hint}
          </div>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:items-start">
      <div>
        <div className="text-[12.5px] font-medium">{label}</div>
        {description && (
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-subtle)" }}>
            {description}
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row label={label} description={description}>
      <button
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 rounded-full transition"
        style={{
          background: checked ? "var(--accent)" : "var(--border-strong)",
        }}
        aria-pressed={checked}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 32 }}
          className="absolute top-0.5 w-5 h-5 rounded-full"
          style={{
            background: "var(--bg)",
            left: checked ? 22 : 2,
          }}
        />
      </button>
    </Row>
  );
}

function NumberRow({
  label,
  description,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <Row label={label} description={description}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(parseInt(e.target.value || "0", 10))}
          className="h-8 w-24 px-2.5 rounded-md border bg-transparent text-sm outline-none focus:border-strong tabular-nums"
          style={{ borderColor: "var(--border-strong)" }}
        />
        {suffix && (
          <span className="text-[11.5px]" style={{ color: "var(--text-subtle)" }}>
            {suffix}
          </span>
        )}
      </div>
    </Row>
  );
}

