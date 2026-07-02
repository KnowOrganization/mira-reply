// Demo data for /s/preview/[template] — PUBLIC, no auth, no DB.
// All 10 template previews share identical data so they are visually comparable.
import type { StorefrontSettingsInput } from "@shaiz/shared";
import type { SfProduct } from "../_templates/_shared/types";

export const DEMO_SETTINGS: StorefrontSettingsInput = {
  storefrontTitle: "Aurora Goods",
  storefrontAccent: "#7c3aed",
  storefrontHeroHeadline: "Aurora Goods",
  storefrontHeroTagline: "Curated finds for the modern home",
  storefrontHeroLayout: "split",
  storefrontHeroImageUrl: "https://picsum.photos/seed/aurora0/1200/800",
  storefrontShowFeatured: true,
  storefrontShowDiscover: true,
  storefrontShowAbout: true,
  storefrontAbout:
    "We handpick beautiful everyday objects — from ceramics to cozy textiles. Every piece ships from our studio in Bangalore.",
  storefrontBuyLabel: "Buy",
  // checkoutEnabled: false ensures AddToCart renders the link-out branch.
  // ctaUrl: null on every product → AddToCart returns null (no button rendered).
  // useCart() is still satisfied by the wrapping <CartProvider slug="preview">.
  storefrontCheckoutEnabled: false,
  storefrontCurrency: "INR",
};

export const DEMO_PRODUCTS: SfProduct[] = [
  {
    id: "dp1",
    slug: "linen-throw-cushion",
    title: "Linen Throw Cushion",
    subtitle: "Sage Green · 45cm",
    description:
      "Hand-loomed linen from certified farms. Removable cover, machine washable.",
    priceText: "₹1,299",
    priceMinor: 129900,
    currency: "INR",
    imageUrl: "https://picsum.photos/seed/aurora1/800/800",
    available: true,
    ctaUrl: null,
  },
  {
    id: "dp2",
    slug: "ceramic-coffee-mug",
    title: "Ceramic Coffee Mug",
    subtitle: "Matte White · 350ml",
    description:
      "Handthrown stoneware. Dishwasher safe. No two pieces are identical.",
    priceText: "₹899",
    priceMinor: 89900,
    currency: "INR",
    imageUrl: "https://picsum.photos/seed/aurora2/800/800",
    available: true,
    ctaUrl: null,
  },
  {
    id: "dp3",
    slug: "beeswax-pillar-candle",
    title: "Beeswax Pillar Candle",
    subtitle: "Natural · 8h burn",
    description:
      "100% pure beeswax. Clean burn, light honey scent. No paraffin, no additives.",
    priceText: "₹599",
    priceMinor: 59900,
    currency: "INR",
    imageUrl: "https://picsum.photos/seed/aurora3/800/800",
    available: true,
    ctaUrl: null,
  },
  {
    id: "dp4",
    slug: "brass-table-lamp",
    title: "Brass Table Lamp",
    subtitle: "Antique Finish · E27",
    description:
      "Solid brass body with a hand-spun shade. Pairs beautifully with Edison bulbs.",
    priceText: "₹4,499",
    priceMinor: 449900,
    currency: "INR",
    imageUrl: "https://picsum.photos/seed/aurora4/800/800",
    available: true,
    ctaUrl: null,
  },
  {
    id: "dp5",
    slug: "woven-jute-basket",
    title: "Woven Jute Basket",
    subtitle: "Natural · M / 30cm",
    description:
      "Hand-woven in Rajasthan. Sturdy enough for laundry, stylish enough for blankets.",
    priceText: "₹749",
    priceMinor: 74900,
    currency: "INR",
    imageUrl: "https://picsum.photos/seed/aurora5/800/800",
    available: true,
    ctaUrl: null,
  },
  {
    id: "dp6",
    slug: "indigo-block-print-scarf",
    title: "Indigo Block Print Scarf",
    subtitle: "Cotton · 180×50cm",
    description:
      "Hand block-printed using traditional Jaipur methods. Each piece is slightly unique.",
    priceText: "₹1,099",
    priceMinor: 109900,
    currency: "INR",
    imageUrl: "https://picsum.photos/seed/aurora6/800/800",
    available: true,
    ctaUrl: null,
  },
];
