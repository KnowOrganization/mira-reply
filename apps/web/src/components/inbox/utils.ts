export function fmtAgo(ts: number | null | undefined): string {
  if (!ts) return "";
  const d = Date.now() - ts;
  if (d < 60_000) return "now";
  if (d < 3600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86400_000) return `${Math.floor(d / 3600_000)}h`;
  return `${Math.floor(d / 86400_000)}d`;
}

export function windowLeft(expiresAt: number | null, now: number): { label: string; open: boolean } {
  if (!expiresAt || expiresAt <= now) return { label: "window closed", open: false };
  const ms = expiresAt - now;
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return { label: h > 0 ? `${h}h ${m}m left` : `${m}m left`, open: true };
}
