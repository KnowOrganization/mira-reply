// Public storefront landing — mira.<domain>/s/<slug>. Server Component, request-
// time fetch from the public, field-whitelisted Elysia /api/store/:slug. Renders
// the SAME shared Storefront tree the in-Mira customizer previews.
import { notFound } from "next/navigation";
import type { StorefrontConfig } from "@shaiz/shared";
import { Storefront, type SfProduct } from "../_components/Storefront";

export const dynamic = "force-dynamic";

type StoreData = { store: { title: string; slug: string }; config: StorefrontConfig; products: SfProduct[] };

async function fetchStore(slug: string): Promise<StoreData | null> {
  const base = process.env.API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${base}/api/store/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as StoreData;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchStore(slug);
  if (!data) return { title: "Shop" };
  return {
    title: `${data.config.title} · Shop`,
    description: data.config.heroTagline || `Shop ${data.config.title}`,
    openGraph: {
      title: data.config.title,
      description: data.config.heroTagline || `Shop ${data.config.title}`,
      images: data.config.heroImageUrl ? [data.config.heroImageUrl] : undefined,
    },
  };
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchStore(slug);
  if (!data) notFound();
  return (
    <Storefront
      config={data.config}
      products={data.products}
      productHref={(p) => `/s/${slug}/${p.slug || p.id}`}
    />
  );
}
