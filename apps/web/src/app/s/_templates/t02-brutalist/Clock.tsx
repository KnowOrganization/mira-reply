"use client";
// Live UTC clock — renders a stable placeholder on the server, fills in
// client-side (no Date.now() in SSR markup → no hydration mismatch).
import { useEffect, useState } from "react";

export default function Clock() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setT(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{t} UTC</span>;
}
