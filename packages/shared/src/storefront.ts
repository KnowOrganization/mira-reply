// Storefront config resolver — PURE, no deps. The single source of defaults +
// derives + sanitization for the public storefront. Called by BOTH the public
// API (apps/api store route) AND the in-Mira customizer live preview, so the
// preview equals production by construction (same function, two callers).

export type StorefrontSettingsInput = {
  storefrontTitle?: string;
  storefrontHeroHeadline?: string;
  storefrontHeroTagline?: string;
  storefrontHeroImageUrl?: string;
  storefrontHeroLayout?: "split" | "minimal";
  storefrontAccent?: string;
  storefrontFeaturedIds?: string[];
  storefrontShowFeatured?: boolean;
  storefrontShowDiscover?: boolean;
  storefrontShowAbout?: boolean;
  storefrontAbout?: string;
  storefrontContactUrl?: string;
  storefrontBuyLabel?: "Buy" | "Shop" | "Order";
};

// Minimal product shape the resolver needs (the API/customizer pass real rows).
export type StorefrontProductLite = { id: string; available: boolean; imageUrl?: string | null };

export type StorefrontConfig = {
  title: string;
  heroHeadline: string;
  heroTagline: string;
  heroImageUrl: string | null;
  heroLayout: "split" | "minimal";
  accent: string;
  accentFg: string; // black/white chosen for contrast against accent
  buyLabel: "Buy" | "Shop" | "Order";
  showFeatured: boolean;
  showDiscover: boolean;
  showAbout: boolean;
  about: string;
  contactUrl: string | null;
  featuredIds: string[];
};

export const DEFAULT_ACCENT = "#4f6bed";

/** Valid 6-hex color or null. */
export function sanitizeHex(v: unknown): string | null {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null;
}

/** Absolute https URL or null (guards against http/javascript:/data: + junk). */
export function httpsOrNull(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Pick black or white text for best contrast against a hex bg (WCAG relative luminance). */
export function contrastFg(hex: string): string {
  const h = sanitizeHex(hex) || DEFAULT_ACCENT;
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  );
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return L > 0.42 ? "#111114" : "#ffffff";
}

export function resolveStorefrontConfig(
  s: StorefrontSettingsInput,
  products: StorefrontProductLite[]
): StorefrontConfig {
  const available = products.filter((p) => p.available);
  const availIds = new Set(available.map((p) => p.id));

  // featured: owner's order, intersected with real available ids; else first 4.
  const owned = (s.storefrontFeaturedIds || []).filter((id) => availIds.has(id));
  const featuredIds = owned.length ? owned : available.slice(0, 4).map((p) => p.id);

  const title = (s.storefrontTitle || "").trim() || "Shop";
  const accent = sanitizeHex(s.storefrontAccent) || DEFAULT_ACCENT;

  // hero image fallback chain: explicit → first featured w/ image → first product w/ image → none
  const firstFeaturedImg = featuredIds.map((id) => available.find((p) => p.id === id)?.imageUrl).find((u) => httpsOrNull(u));
  const firstProductImg = available.map((p) => p.imageUrl).find((u) => httpsOrNull(u));
  const heroImageUrl = httpsOrNull(s.storefrontHeroImageUrl) || httpsOrNull(firstFeaturedImg) || httpsOrNull(firstProductImg) || null;

  return {
    title,
    heroHeadline: (s.storefrontHeroHeadline || "").trim() || title,
    heroTagline: (s.storefrontHeroTagline || "").trim(),
    heroImageUrl,
    heroLayout: s.storefrontHeroLayout === "minimal" ? "minimal" : "split",
    accent,
    accentFg: contrastFg(accent),
    buyLabel: s.storefrontBuyLabel === "Shop" || s.storefrontBuyLabel === "Order" ? s.storefrontBuyLabel : "Buy",
    showFeatured: s.storefrontShowFeatured !== false,
    showDiscover: s.storefrontShowDiscover !== false,
    showAbout: !!s.storefrontShowAbout && !!(s.storefrontAbout || "").trim(),
    about: (s.storefrontAbout || "").trim(),
    contactUrl: httpsOrNull(s.storefrontContactUrl),
    featuredIds,
  };
}
