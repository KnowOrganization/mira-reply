"use client";

import { useEffect } from "react";

/**
 * Landing page for the OAuth popup. Tells the opener window the result and
 * closes itself. If opened directly (no popup), navigates to the app instead.
 */
export default function OAuthComplete() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const status = p.get("ig") || "connected";
    const reason = p.get("reason") || "";
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { source: "mira-oauth", status, reason },
          window.location.origin
        );
        window.close();
        return;
      }
    } catch {
      /* cross-origin opener — fall through to a normal redirect */
    }
    const q =
      status === "error" ? `?ig=error&reason=${encodeURIComponent(reason)}` : "";
    window.location.replace("/" + q);
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-sans)",
        fontSize: "13px",
      }}
    >
      Finishing up…
    </div>
  );
}
