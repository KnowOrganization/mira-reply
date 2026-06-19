// PUBLIC storefront API — GET /api/store/:slug. NO authPlugin (like webhookRoute).
// Resolves slug → accountId ONCE server-side, pins every query to it, and returns
// a HAND-WRITTEN field whitelist (never the raw row — no accountId/embedding/
// timestamps leak). Serves only available products of a PUBLISHED store; 404
// (not 403) on an unknown/unpublished slug so slugs can't be enumerated.
import { Elysia } from "elysia";
import { getAccountByStorefrontSlug, listProducts, getSettings } from "@shaiz/db";

export const storeRoute = new Elysia().get("/api/store/:slug", async ({ params, set }) => {
  const slug = (params.slug || "").trim();
  if (!slug) { set.status = 404; return { error: "not found" }; }

  const accountId = await getAccountByStorefrontSlug(slug);
  if (!accountId) { set.status = 404; return { error: "not found" }; }

  const settings = await getSettings(accountId);
  const all = await listProducts(accountId);
  const products = all
    .filter((p) => p.available)
    .map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle,
      description: p.description,
      priceText: p.priceText,
      imageUrl: p.imageUrl,
      ctaUrl: p.ctaUrl,
      slug: p.slug,
    }));

  return {
    store: { title: settings?.storefrontTitle || "Shop", slug },
    products,
  };
});
