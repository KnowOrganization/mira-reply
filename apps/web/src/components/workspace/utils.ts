// ── constants ─────────────────────────────────────────────────────────────

export const SPRING = { type: "spring" as const, stiffness: 320, damping: 30 };
export const MODES = ["shadow", "assisted", "balanced", "auto"] as const;
export const MODE_HINT: Record<string, string> = {
  shadow: "Mira drafts silently. Nothing is sent.",
  assisted: "Mira drafts. You approve before sending.",
  balanced: "Mira sends the safe ones, drafts the rest.",
  auto: "Mira handles everything on its own.",
};
export const LINK_TYPES = ["location", "song", "gear", "shop", "other"] as const;

// ── pure helpers ──────────────────────────────────────────────────────────

export function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function dur(ms: number): string {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export function hashtags(caption: string): string[] {
  return (caption.match(/#[\p{L}\d_]+/gu) || []).slice(0, 4);
}

export function stripTags(caption: string): string {
  return caption.replace(/#[\p{L}\d_]+/gu, "").trim();
}

export const AV_TINTS = ["#c1623e", "#d99a5b", "#8a9a6b", "#b07d57", "#7a8a9a", "#c98a9b"];

export function tintFor(s: string): string {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n + s.charCodeAt(i)) % AV_TINTS.length;
  return AV_TINTS[n];
}
