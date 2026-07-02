// PUBLIC storefront API — no authPlugin (like webhookRoute). Resolves slug →
// accountId ONCE server-side, pins every query to it, returns HAND-WRITTEN field
// whitelists (never the raw row — no accountId/embedding/aliases/timestamps).
// Serves only available products of a PUBLISHED store; 404 (not 403) on unknown/
// unpublished/missing so slugs/products can't be enumerated.
import { Elysia } from "elysia";
import { getAccountByStorefrontSlug, listProducts, getSettings } from "@shaiz/db";
import { resolveStorefrontConfig, type StorefrontSettingsInput } from "@shaiz/shared";

// Public product projection — exactly these fields, nothing else.
type StoreProduct = ReturnType<typeof toStoreProduct>;
function toStoreProduct(p: {
  id: string; title: string; subtitle: string; description: string;
  priceText: string | null; priceMinor: number | null; currency: string;
  imageUrl: string | null; images?: string[] | null; ctaUrl: string | null; slug: string | null;
}) {
  return {
    id: p.id, title: p.title, subtitle: p.subtitle, description: p.description,
    priceText: p.priceText, priceMinor: p.priceMinor, currency: p.currency,
    imageUrl: p.imageUrl,
    // gallery: https-only (DB may hold base64 data-URLs — megabytes in public JSON), capped
    images: (p.images ?? []).filter((u) => /^https:\/\//i.test(u)).slice(0, 8),
    ctaUrl: p.ctaUrl, slug: p.slug,
  };
}

export const storeRoute = new Elysia()
  // ── storefront landing data ────────────────────────────────────────────────
  .get("/api/store/:slug", async ({ params, set }) => {
    const slug = (params.slug || "").trim();
    if (!slug) { set.status = 404; return { error: "not found" }; }

    const accountId = await getAccountByStorefrontSlug(slug);
    if (!accountId) { set.status = 404; return { error: "not found" }; }

    const settings = (await getSettings(accountId)) as StorefrontSettingsInput | null;
    const all = await listProducts(accountId);
    const available = all.filter((p) => p.available);
    const config = resolveStorefrontConfig(settings ?? {}, available);

    return {
      store: { title: config.title, slug },
      config,
      products: available.map(toStoreProduct) as StoreProduct[],
    };
  })
  // ── single product detail ──────────────────────────────────────────────────
  .get("/api/store/:slug/:product", async ({ params, set }) => {
    const slug = (params.slug || "").trim();
    const key = (params.product || "").trim();
    if (!slug || !key) { set.status = 404; return { error: "not found" }; }

    const accountId = await getAccountByStorefrontSlug(slug);
    if (!accountId) { set.status = 404; return { error: "not found" }; }

    const settings = (await getSettings(accountId)) as StorefrontSettingsInput | null;
    const all = await listProducts(accountId);
    const available = all.filter((p) => p.available);
    const config = resolveStorefrontConfig(settings ?? {}, available);

    // match slug first (nicer urls), then id (slug is nullable / non-unique).
    const product = available.find((p) => p.slug && p.slug === key) || available.find((p) => p.id === key);
    if (!product) { set.status = 404; return { error: "not found" }; }

    const more = available.filter((p) => p.id !== product.id).slice(0, 4).map(toStoreProduct);

    return {
      store: { title: config.title, slug },
      config,
      product: toStoreProduct(product),
      more: more as StoreProduct[],
    };
  });
