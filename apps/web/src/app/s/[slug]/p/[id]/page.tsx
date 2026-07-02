// Product detail — /s/<slug>/p/<id>. Server Component.
// Replaces the old [product] dynamic route; linked to by all 10 templates via
// `/s/${slug}/p/${product.id}`. Delegates to REGISTRY-resolved template Detail.
import { notFound } from "next/navigation";
import type { StorefrontConfig } from "@shaiz/shared";
import type { SfProduct } from "../../../_templates/_shared/types";
import { getTemplate } from "../../../_templates/registry";

export const dynamic = "force-dynamic";

type DetailData = {
  store: { title: string; slug: string };
  config: StorefrontConfig;
  product: SfProduct;
  more: SfProduct[];
};

async function fetchProduct(slug: string, id: string): Promise<DetailData | null> {
  const base = process.env.API_URL || "http://localhost:4000";
  try {
    const res = await fetch(
      `${base}/api/store/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return (await res.json()) as DetailData;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const data = await fetchProduct(slug, id);
  if (!data) return { title: "Product" };
  const desc =
    data.product.subtitle ||
    data.product.description?.slice(0, 140) ||
    `${data.product.title} at ${data.config.title}`;
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

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const data = await fetchProduct(slug, id);
  if (!data) notFound();
  const { Detail } = getTemplate(data.config.templateId);
  return (
    <Detail
      config={data.config}
      product={data.product}
      more={data.more}
      slug={slug}
    />
  );
}
