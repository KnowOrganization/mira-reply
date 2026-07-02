// Public template preview — /s/preview/<template-id>.
// No auth, no DB. Renders the chosen template with shared DEMO_PRODUCTS / DEMO_SETTINGS
// so every preview is visually comparable. The requested template id is forced into
// resolveStorefrontConfig; unknown ids fall back to t01-editorial via resolveTemplateId.
//
// AddToCart safety: AddToCart always calls useCart() unconditionally (before any
// conditional render). Without a CartProvider the call would throw. We wrap the
// Listing in a cheap <CartProvider slug="preview"> to satisfy the hook.
// Since DEMO_SETTINGS.storefrontCheckoutEnabled = false and every demo product has
// ctaUrl = null, AddToCart hits the link-out branch and returns null — no cart UI
// is rendered, and cart.add() is never called.
import { resolveTemplateId, resolveStorefrontConfig, STOREFRONT_TEMPLATES } from "@shaiz/shared";
import { getTemplate } from "../../_templates/registry";
import { CartProvider } from "../../_lib/cart";
import { DEMO_SETTINGS, DEMO_PRODUCTS } from "../_demo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ template: string }>;
}) {
  const { template } = await params;
  const id = resolveTemplateId(template);
  const meta = STOREFRONT_TEMPLATES.find((t) => t.id === id);
  return {
    title: `${meta?.name ?? id} · Aurora Goods preview`,
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

  // Build demo config, forcing the requested template id.
  const demoProductLites = DEMO_PRODUCTS.map((p) => ({
    id: p.id,
    available: p.available,
    imageUrl: p.imageUrl,
    priceMinor: p.priceMinor,
    currency: p.currency,
  }));
  const config = resolveStorefrontConfig(
    { ...DEMO_SETTINGS, storefrontTemplate: templateId },
    demoProductLites,
  );

  const { Listing } = getTemplate(config.templateId);

  return (
    <CartProvider slug="preview">
      <Listing config={config} products={DEMO_PRODUCTS} slug="preview" />
    </CartProvider>
  );
}
