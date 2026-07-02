// Public product detail — /s/<slug>/<product> (matched by product slug or id).
// The destination of DM carousel "View" buttons; shareable; SEO/OG per product.
import { notFound } from "next/navigation";
import type { StorefrontConfig } from "@shaiz/shared";
import { ProductDetail, type SfProduct } from "../../_components/Storefront";

export const dynamic = "force-dynamic";

type DetailData = { store: { title: string; slug: string }; config: StorefrontConfig; product: SfProduct; more: SfProduct[] };

async function fetchProduct(slug: string, product: string): Promise<DetailData | null> {
  const base = process.env.API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${base}/api/store/${encodeURIComponent(slug)}/${encodeURIComponent(product)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as DetailData;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; product: string }> }) {
  const { slug, product } = await params;
  const data = await fetchProduct(slug, product);
  if (!data) return { title: "Product" };
  const desc = data.product.subtitle || data.product.description?.slice(0, 140) || `${data.product.title} at ${data.config.title}`;
  return {
    title: `${data.product.title} · ${data.config.title}`,
    description: desc,
    openGraph: {
      title: data.product.title,
      description: desc,
      images: data.product.imageUrl ? [data.product.imageUrl] : undefined,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string; product: string }> }) {
  const { slug, product } = await params;
  const data = await fetchProduct(slug, product);
  if (!data) notFound();
  return (
    <ProductDetail
      config={data.config}
      product={data.product}
      more={data.more}
      shopHref={`/s/${slug}`}
      moreHref={(p) => `/s/${slug}/${p.slug || p.id}`}
    />
  );
}
