"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plug, MessageCircle, Sparkles, Link2, ArrowRight, ShieldCheck } from "lucide-react";
import { MiraLogo } from "./MiraLogo";
import { useConnectAccount } from "@/lib/api/connectAccount";

const FEATURES = [
  { icon: <MessageCircle size={15} />, text: "Auto-reply to comments in your voice" },
  { icon: <Sparkles size={15} />, text: "Learns your answers once, reuses them everywhere" },
  { icon: <Link2 size={15} />, text: "DMs links to anyone who asks" },
];

/** Full-screen gate shown until an Instagram account is connected. */
export function ConnectGate() {
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ accountId: string; username: string } | null>(null);
  const [tokenMode, setTokenMode] = useState(false);
  const [token, setToken] = useState("");
  const [canReconnect, setCanReconnect] = useState(false);
  const [tokenBusy, setTokenBusy] = useState(false);

  const { state: connectState, connect: doConnect } = useConnectAccount(() => window.location.reload());
  const busy = connectState.status === "busy" || tokenBusy;

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("ig") === "error") {
      setError(decodeURIComponent(p.get("reason") || "Connection failed"));
    } else if (p.get("ig") === "conflict") {
      setConflict({ accountId: p.get("account") || "", username: p.get("user") || "" });
    }
    fetch("/api/ig/status")
      .then((r) => r.json())
      .then((d) => setCanReconnect(!!d.canReconnect))
      .catch(() => {});
  }, []);

  // Banners come from either the URL (popup-blocked fallback redirect, above)
  // or the live connect attempt — no need to mirror one into the other.
  const displayError = connectState.status === "error" ? connectState.reason : error;
  const displayConflict = connectState.status === "conflict"
    ? { accountId: connectState.accountId, username: connectState.username }
    : conflict;

  function connect(forceSwitch = false) {
    setError(null);
    setConflict(null);
    doConnect({ forceSwitch });
  }

  async function reconnect() {
    if (busy) return;
    setError(null);
    setConflict(null);
    setTokenBusy(true);
    try {
      const r = await fetch("/api/ig/token-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await r.json();
      if (j.ok) window.location.reload();
      else {
        setError(j.error || "Reconnect failed");
        setTokenBusy(false);
      }
    } catch {
      setError("Reconnect failed");
      setTokenBusy(false);
    }
  }

  async function connectWithToken() {
    const t = token.trim();
    if (!t || busy) return;
    setError(null);
    setConflict(null);
    setTokenBusy(true);
    try {
      const r = await fetch("/api/ig/token-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      });
      const j = await r.json();
      if (j.ok) {
        window.location.reload();
      } else {
        setError(j.error || "Token rejected");
        setTokenBusy(false);
      }
    } catch {
      setError("Connection failed");
      setTokenBusy(false);
    }
  }

  return (
    <div
      className="h-screen w-screen flex items-center justify-center px-6 relative overflow-hidden"
      style={{ background: "var(--bg-frame)" }}
    >
      {/* warm ambient glows */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 620,
          height: 620,
          top: "-12%",
          right: "-8%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 26%, transparent), transparent 68%)",
          animation: "drift 16s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 520,
          height: 520,
          bottom: "-16%",
          left: "-10%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)",
          animation: "drift 22s ease-in-out infinite reverse",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 170, damping: 22 }}
        className="relative w-full max-w-[440px]"
      >
        {/* heading */}
        <div className="flex flex-col items-center text-center mb-7">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.05 }}
          >
            <MiraLogo size={60} pulse />
          </motion.div>
          <h1
            className="display mt-6"
            style={{ fontSize: "clamp(36px, 6vw, 50px)", letterSpacing: "-0.05em" }}
          >
            Connect Instagram
          </h1>
          <p
            className="text-[14px] mt-3 leading-relaxed max-w-[330px]"
            style={{ color: "var(--text-muted)" }}
          >
            Mira manages your Instagram comments and DMs. Connect your account to
            begin.
          </p>
        </div>

        {/* connect card */}
        <div
          className="rounded-[2rem] p-6"
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-elev)",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              <Plug size={19} />
            </div>
            <div>
              <div className="text-[14px] font-bold">Instagram Business</div>
              <div className="text-[12px]" style={{ color: "var(--text-subtle)" }}>
                Comments · DMs · Insights
              </div>
            </div>
          </div>

          <div className="space-y-2.5 mb-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                className="flex items-center gap-3 text-[13px]"
                style={{ color: "var(--text-muted)" }}
              >
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                >
                  {f.icon}
                </span>
                {f.text}
              </motion.div>
            ))}
          </div>

          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl px-3.5 py-2.5 mb-3 text-[12px] leading-5"
              style={{
                background: "color-mix(in srgb, #b3402e 12%, transparent)",
                color: "#9a3525",
              }}
            >
              {displayError.slice(0, 200)}
            </motion.div>
          )}

          {displayConflict && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl px-3.5 py-2.5 mb-3 text-[12px] leading-5"
              style={{ background: "color-mix(in srgb, #b3402e 12%, transparent)", color: "#9a3525" }}
            >
              @{displayConflict.username || displayConflict.accountId} is already managed in another
              workspace. Ask them to invite you, or transfer it here.
              <button
                onClick={() => doConnect({ transfer: true })}
                disabled={busy}
                className="block mt-1.5 font-bold hover:underline disabled:opacity-50"
              >
                Transfer to my workspace →
              </button>
            </motion.div>
          )}

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 24 }}
            onClick={canReconnect ? reconnect : () => connect(false)}
            disabled={busy}
            className="w-full h-13 rounded-2xl flex items-center justify-center gap-2 text-[14.5px] font-bold disabled:opacity-70"
            style={{
              height: 52,
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            {busy
              ? canReconnect
                ? "Reconnecting…"
                : "Waiting for Instagram…"
              : canReconnect
              ? "Reconnect"
              : "Connect Instagram"}
            {!busy && <ArrowRight size={17} />}
          </motion.button>

          {/* switch to a different Instagram account */}
          {canReconnect && (
            <button
              onClick={() => connect(true)}
              disabled={busy}
              className="w-full mt-2.5 h-10 rounded-2xl text-[13px] font-semibold disabled:opacity-50"
              style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
            >
              Connect different account
            </button>
          )}

          {/* escape hatch — connect with an access token, no OAuth */}
          <div className="mt-3.5 pt-3.5" style={{ borderTop: "1px solid var(--border)" }}>
            {!tokenMode ? (
              <button
                onClick={() => setTokenMode(true)}
                className="w-full text-center text-[12px] hover:underline"
                style={{ color: "var(--text-subtle)" }}
              >
                Have an access token? Connect with it instead
              </button>
            ) : (
              <div className="space-y-2.5">
                <textarea
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste Instagram access token"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-transparent text-[12px] outline-none resize-none"
                  style={{ border: "1px solid var(--border-strong)" }}
                />
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={connectWithToken}
                  disabled={busy || !token.trim()}
                  className="w-full h-10 rounded-xl text-[13px] font-bold disabled:opacity-50"
                  style={{ background: "var(--bg-inset)", color: "var(--text)" }}
                >
                  {busy ? "Connecting…" : "Connect with token"}
                </motion.button>
              </div>
            )}
          </div>
        </div>

        <div
          className="flex items-center justify-center gap-1.5 mt-5 text-[11.5px]"
          style={{ color: "var(--text-subtle)" }}
        >
          <ShieldCheck size={13} />
          Runs locally. Your data never leaves this machine.
        </div>
        <div
          className="flex items-center justify-center gap-3 mt-2 text-[11.5px]"
          style={{ color: "var(--text-subtle)" }}
        >
          <a href="/privacy" className="hover:underline">Privacy</a>
          <span>·</span>
          <a href="/terms" className="hover:underline">Terms</a>
        </div>

        <button
          onClick={() => {
            try {
              localStorage.setItem("mira.preview", "1");
            } catch {
              /* ignore */
            }
            window.location.reload();
          }}
          className="w-full mt-4 text-center text-[12px] hover:underline"
          style={{ color: "var(--text-subtle)" }}
        >
          Preview the app without connecting →
        </button>
      </motion.div>
    </div>
  );
}
