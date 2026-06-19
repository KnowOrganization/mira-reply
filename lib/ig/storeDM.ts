// DM marketplace — carousel send + store postback handling.
//
// The catalog is ENGINE-rendered from real product rows (never the LLM): a
// deterministic generic-template carousel. Buttons link out to each product's
// ctaUrl (and, once the storefront is published, a "View" link to /s/<slug>).
// Mobile-only carousel → always paired with a plain-text link fallback.
import type { IgStore, Product } from "./store";
import { readStore } from "./store";
import { tryDM, tryDMGenericTemplate } from "./dm";
import type { GenericElement, ButtonTemplateButton } from "./graph";
import { publish } from "./bus";

const FUNNEL = { skipRateGate: true };

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
}

function storefrontUrl(store: IgStore, productSlug?: string | null): string | null {
  const slug = store.settings.storefrontSlug;
  if (!store.settings.storefrontEnabled || !slug || !baseUrl()) return null;
  return `${baseUrl()}/s/${slug}${productSlug ? `#p-${productSlug}` : ""}`;
}

function elementFor(store: IgStore, p: Product): GenericElement {
  const buttons: ButtonTemplateButton[] = [];
  const view = storefrontUrl(store, p.slug || p.id);
  if (view) buttons.push({ type: "web_url", title: "View", url: view });
  if (p.ctaUrl?.trim()) buttons.push({ type: "web_url", title: "Buy", url: p.ctaUrl.trim() });
  return {
    title: p.title,
    subtitle: [p.priceText?.trim(), p.subtitle?.trim()].filter(Boolean).join(" · "),
    imageUrl: p.imageUrl?.trim() || undefined,
    buttons,
  };
}

function textFallback(store: IgStore, items: Product[]): string {
  const lines = items.slice(0, 10).map((p) => {
    const price = p.priceText?.trim() ? ` — ${p.priceText.trim()}` : "";
    const link = p.ctaUrl?.trim() ? ` ${p.ctaUrl.trim()}` : "";
    return `• ${p.title}${price}${link}`;
  });
  const shop = storefrontUrl(store);
  if (shop) lines.push(`See everything: ${shop}`);
  return lines.join("\n");
}

/** Send the catalog as a card carousel (+ text lead-in, + desktop text fallback).
 *  `filterTag` narrows to products whose aliases include the tag. */
export async function sendCatalog(store: IgStore, recipientId: string, filterTag?: string): Promise<{ ok: boolean }> {
  let available = store.products.filter((p) => p.available);
  if (filterTag) {
    const t = filterTag.toLowerCase();
    available = available.filter((p) => (p.aliases || []).some((a) => a.toLowerCase() === t) || p.title.toLowerCase().includes(t));
  }
  if (!available.length) {
    await tryDM(recipientId, "I don't have anything listed right now, but check back soon!", FUNNEL);
    return { ok: false };
  }

  // lead-in text bubble — also carries the storefront link so desktop-web (no
  // carousel) users get a working path.
  const shop = storefrontUrl(store);
  const leadIn = filterTag ? `Here's what I've got in ${filterTag} 👇` : "Here's everything I've got 👇";
  await tryDM(recipientId, shop ? `${leadIn}\n${shop}` : leadIn, FUNNEL);

  // up to 10 cards; if more and the storefront is live, card 10 = "See all →".
  let cards: GenericElement[];
  if (available.length > 10 && shop) {
    cards = available.slice(0, 9).map((p) => elementFor(store, p));
    cards.push({ title: `See all ${available.length} products →`, subtitle: "Open the full shop", buttons: [{ type: "web_url", title: "Open shop", url: shop }] });
  } else {
    cards = available.slice(0, 10).map((p) => elementFor(store, p));
    if (available.length > 10) publish({ type: "log", level: "info", msg: `catalog: ${available.length} products, showing first 10 (no storefront link set)`, ts: Date.now() });
  }

  const r = await tryDMGenericTemplate(recipientId, cards, FUNNEL);
  if (r.ok) return { ok: true };
  if (r.rateLimited) return { ok: false }; // caller/queue can retry; don't double-send text

  // carousel rejected (e.g. desktop/api quirk) → plain-text fallback
  await tryDM(recipientId, textFallback(store, available), FUNNEL);
  return { ok: true };
}

/** Route a STORE_* postback. STORE_ALL → full catalog; STORE_CAT_<tag> → filtered. */
export async function handleStorePostback(accountId: string, recipientId: string, payload: string): Promise<boolean> {
  const m = payload.match(/^STORE_(ALL|CAT)_?(.*)$/);
  if (!m) return false;
  const store = await readStore(accountId);
  if (!store.account) return false;
  const tag = m[1] === "CAT" ? (m[2] || "").trim() : undefined;
  await sendCatalog(store, recipientId, tag || undefined);
  return true;
}
