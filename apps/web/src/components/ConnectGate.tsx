"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plug, MessageCircle, Sparkles, Link2, ArrowRight, ShieldCheck } from "lucide-react";
import { MiraLogo } from "./MiraLogo";

const FEATURES = [
  { icon: <MessageCircle size={15} />, text: "Auto-reply to comments in your voice" },
  { icon: <Sparkles size={15} />, text: "Learns your answers once, reuses them everywhere" },
  { icon: <Link2 size={15} />, text: "DMs links to anyone who asks" },
];

/** Full-screen gate shown until an Instagram account is connected. */
export function ConnectGate() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tokenMode, setTokenMode] = useState(false);
  const [token, setToken] = useState("");
  const [canReconnect, setCanReconnect] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("ig") === "error") {
      setError(decodeURIComponent(p.get("reason") || "Connection failed"));
    }
    fetch("/api/ig/status")
      .then((r) => r.json())
      .then((d) => setCanReconnect(!!d.canReconnect))
      .catch(() => {});
  }, []);

  async function reconnect() {
    if (busy) return;
    setError(null);
    setBusy(true);
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
        setBusy(false);
      }
    } catch {
      setError("Reconnect failed");
      setBusy(false);
    }
  }

  function connect(forceSwitch = false) {
    setError(null);
    const w = 600;
    const h = 760;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    // Same-origin navigation → the BetterAuth session cookie is sent automatically,
    // so the backend reads the user from it (no token in the URL).
    const connectUrl = forceSwitch ? "/api/ig/connect?switch=1" : "/api/ig/connect";
    const popup = window.open(
      connectUrl,
      "mira_ig_oauth",
      `width=${w},height=${h},left=${left},top=${top}`
    );
    // popup blocked → fall back to a full-page redirect
    if (!popup) {
      window.location.href = connectUrl;
      return;
    }
    setBusy(true);

    let poll: ReturnType<typeof setInterval>;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.source !== "mira-oauth") return;
      done(e.data.status !== "error", e.data.reason);
    };
    const done = (ok: boolean, reason?: string) => {
      window.removeEventListener("message", onMessage);
      clearInterval(poll);
      if (ok) {
        window.location.reload(); // connected → gate re-checks → app
      } else {
        setBusy(false);
        if (reason) setError(String(reason));
      }
    };
    window.addEventListener("message", onMessage);
    // fallback — popup closed without signalling: re-check the connection
    poll = setInterval(() => {
      if (popup.closed) {
        fetch("/api/ig/status")
          .then((r) => r.json())
          .then((d) =>
            done(!!d.connected, d.connected ? undefined : "Connection cancelled")
          )
          .catch(() => done(false));
      }
    }, 700);
  }

  async function connectWithToken() {
    const t = token.trim();
    if (!t || busy) return;
    setError(null);
    setBusy(true);
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
        setBusy(false);
      }
    } catch {
      setError("Connection failed");
      setBusy(false);
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

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl px-3.5 py-2.5 mb-3 text-[12px] leading-5"
              style={{
                background: "color-mix(in srgb, #b3402e 12%, transparent)",
                color: "#9a3525",
              }}
            >
              {error.slice(0, 200)}
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
