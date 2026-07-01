"use client";

import { useCallback, useRef, useState } from "react";

export type ConnectState =
  | { status: "idle" }
  | { status: "busy" }
  | { status: "error"; reason: string }
  | { status: "conflict"; accountId: string; username: string };

/**
 * Popup-based IG OAuth connect, shared by ConnectGate, the Settings account
 * tab, and the sidebar switcher — one place to get success/error/conflict
 * signalling right instead of three copies drifting apart.
 */
export function useConnectAccount(onConnected: () => void) {
  const [state, setState] = useState<ConnectState>({ status: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback((opts: { transfer?: boolean; forceSwitch?: boolean } = {}) => {
    setState({ status: "busy" });
    const w = 600, h = 760;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const params = new URLSearchParams();
    if (opts.transfer) params.set("transfer", "1");
    if (opts.forceSwitch) params.set("switch", "1");
    const qs = params.toString();
    const connectUrl = `/api/ig/connect${qs ? `?${qs}` : ""}`;
    const popup = window.open(connectUrl, "mira_ig_oauth", `width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) { window.location.href = connectUrl; return; }

    const finish = (next: ConnectState) => {
      window.removeEventListener("message", onMessage);
      if (pollRef.current) clearInterval(pollRef.current);
      setState(next);
      if (next.status === "idle") onConnected();
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.source !== "mira-oauth") return;
      const d = e.data as { status: string; reason?: string; accountId?: string; user?: string };
      if (d.status === "conflict") finish({ status: "conflict", accountId: d.accountId || "", username: d.user || "" });
      else if (d.status === "error") finish({ status: "error", reason: d.reason || "Connection failed" });
      else finish({ status: "idle" });
    };
    window.addEventListener("message", onMessage);
    pollRef.current = setInterval(() => {
      if (popup.closed) {
        fetch("/api/ig/status")
          .then((r) => r.json())
          .then((d) => finish(d.connected ? { status: "idle" } : { status: "error", reason: "Connection cancelled" }))
          .catch(() => finish({ status: "error", reason: "Connection cancelled" }));
      }
    }, 700);
  }, [onConnected]);

  const reset = useCallback(() => setState({ status: "idle" }), []);
  return { state, connect, reset };
}
