// Public template preview — /s/preview/<template-id>.
// No auth, no DB. Renders the chosen template with its curated demo catalog
// (getDemoSet — per-template sets under ../_demo/sets, shared fallback otherwise).
// The requested template id is forced into resolveStorefrontConfig; unknown ids
// fall back to t01-editorial via resolveTemplateId.
//
// slug is `preview/<template-id>` so template-built links (`/s/${slug}/p/${id}`)
// resolve to the preview detail route below this one.
//
// AddToCart safety: AddToCart always calls useCart() unconditionally (before any
// conditional render). Without a CartProvider the call would throw. We wrap the
// Listing in a cheap <CartProvider slug="preview"> to satisfy the hook.
import { resolveTemplateId, resolveStorefrontConfig, STOREFRONT_TEMPLATES } from "@shaiz/shared";
import { getTemplate } from "../../_templates/registry";
import { CartProvider } from "../../_lib/cart";
import { getDemoSet } from "../_demo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ template: string }>;
}) {
  const { template } = await params;
  const id = resolveTemplateId(template);
  const meta = STOREFRONT_TEMPLATES.find((t) => t.id === id);
  const { settings } = getDemoSet(id);
  return {
    title: `${meta?.name ?? id} · ${settings.storefrontTitle ?? "Storefront"} preview`,
    description: meta?.blurb ?? "Storefront template preview",
  };
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ template: string }>;
}) {
  const { template } = await params;
  const templateId = resolveTemplateId(template);
  const { settings, products } = getDemoSet(templateId);

  // Build demo config, forcing the requested template id.
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

  const { Listing } = getTemplate(config.templateId);

  return (
    <CartProvider slug="preview">
      <Listing config={config} products={products} slug={`preview/${templateId}`} />
    </CartProvider>
  );
}
