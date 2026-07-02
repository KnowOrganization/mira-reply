// Public template DETAIL preview — /s/preview/<template-id>/p/<product-id-or-slug>.
// Mirrors the live [slug]/p/[id] route but sources the demo catalog, so a preview
// visitor can click into a product and see the template's Detail page.
import { notFound } from "next/navigation";
import { resolveTemplateId, resolveStorefrontConfig } from "@shaiz/shared";
import { getTemplate } from "../../../../_templates/registry";
import { CartProvider } from "../../../../_lib/cart";
import { getDemoSet } from "../../../_demo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ template: string; id: string }>;
}) {
  const { template, id } = await params;
  const templateId = resolveTemplateId(template);
  const { settings, products } = getDemoSet(templateId);
  const product = products.find((p) => p.slug === id) || products.find((p) => p.id === id);
  return {
    title: product
      ? `${product.title} · ${settings.storefrontTitle ?? "Storefront"} preview`
      : "Storefront template preview",
  };
}

export default async function PreviewDetailPage({
  params,
}: {
  params: Promise<{ template: string; id: string }>;
}) {
  const { template, id } = await params;
  const templateId = resolveTemplateId(template);
  const { settings, products } = getDemoSet(templateId);

  // match slug first (nicer urls), then id — same rule as the live store API.
  const product = products.find((p) => p.slug === id) || products.find((p) => p.id === id);
  if (!product) notFound();

  const demoProductLites = products.map((p) => ({
    id: p.id,
    available: p.available,
    imageUrl: p.imageUrl,
    priceMinor: p.priceMinor,
    currency: p.currency,
  }));
  const config = resolveStorefrontConfig(
    { ...settings, storefrontTemplate: templateId },
    demoProductLites,
  );

  const more = products.filter((p) => p.id !== product.id).slice(0, 4);
  const { Detail } = getTemplate(config.templateId);

  return (
    <CartProvider slug="preview">
      <Detail config={config} product={product} more={more} slug={`preview/${templateId}`} />
    </CartProvider>
  );
}
