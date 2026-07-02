// Demo catalog for t06-magazine — "MERIDIAN", a contemporary fashion label
// staged as a magazine issue. Editorial-fashion imagery; every URL verified 200.
import type { DemoSet } from "../fallback";

const u = (id: string) => `https://images.unsplash.com/${id}?q=80&w=1200&auto=format&fit=crop`;

const set: DemoSet = {
  settings: {
    storefrontTitle: "MERIDIAN",
    storefrontAccent: "#1a3cff",
    storefrontHeroHeadline: "The Collection Issue",
    storefrontHeroTagline: "Six looks, one thesis. The season cut on the bias. Ecru, ivory, ink.",
    storefrontHeroLayout: "split",
    storefrontHeroImageUrl: u("photo-1509631179647-0177331693ae"),
    storefrontShowFeatured: true,
    storefrontShowDiscover: true,
    storefrontShowAbout: true,
    storefrontAbout:
      "This issue is about the line — the one a shoulder makes, the one a hem draws, the one we will not cross on cloth. Six pieces survived the edit; wear them until the next issue finds you.",
    storefrontContactUrl: "https://instagram.com/meridian.press",
    storefrontBuyLabel: "Shop",
    storefrontCheckoutEnabled: true,
    storefrontCurrency: "INR",
    storefrontFeaturedIds: ["dm1", "dm2", "dm3"],
    storefrontTemplate: "t06-magazine",
  },
  products: [
    {
      id: "dm1",
      slug: "the-column-dress",
      title: "The Column Dress",
      subtitle: "Viscose crepe · Ivory",
      description:
        "A single uninterrupted line from shoulder to floor, cut in matte viscose crepe that holds its own weight. No darts, no hardware — the fall of the fabric does all the tailoring.",
      priceText: "₹18,500",
      priceMinor: 1850000,
      currency: "INR",
      imageUrl: u("photo-1515372039744-b8f02a3ae446"),
      images: [
        u("photo-1515372039744-b8f02a3ae446"),
        u("photo-1496747611176-843222e1e57c"),
        u("photo-1539008835657-9e8e9680c956"),
      ],
      available: true,
      ctaUrl: null,
    },
    {
      id: "dm2",
      slug: "wool-car-coat-ecru",
      title: "Wool Car Coat — Ecru",
      subtitle: "Undyed lambswool · Unisex",
      description:
        "Double-faced lambswool left in its undyed state, bracelet sleeves, a collar that stands on request. The coat you keep for twenty years and apologise to no one for.",
      priceText: "₹32,000",
      priceMinor: 3200000,
      currency: "INR",
      imageUrl: u("photo-1544022613-e87ca75a784a"),
      available: true,
      ctaUrl: null,
    },
    {
      id: "dm3",
      slug: "bias-silk-skirt",
      title: "Bias Silk Skirt",
      subtitle: "Sandwashed silk · Ink",
      description:
        "Cut on the true bias so the silk moves a half-second after you do. Sits at the hip, ends mid-calf, and catches every kind of light on the way down.",
      priceText: "₹12,800",
      priceMinor: 1280000,
      currency: "INR",
      imageUrl: u("photo-1594633312681-425c7b97ccd1"),
      available: true,
      ctaUrl: null,
    },
    {
      id: "dm4",
      slug: "archive-tee-003",
      title: "Archive Tee 003",
      subtitle: "Heavy jersey · Optic white",
      description:
        "The third revision of our only t-shirt: 240gsm combed cotton, a collar that refuses to ripple, shoulders that sit exactly where shoulders are.",
      priceText: "₹2,400",
      priceMinor: 240000,
      currency: "INR",
      imageUrl: u("photo-1521572163474-6864f9cf17ab"),
      available: true,
      ctaUrl: null,
    },
    {
      id: "dm5",
      slug: "leather-band-belt",
      title: "Leather Band Belt",
      subtitle: "Vegetable-tanned · Brass",
      description:
        "A three-centimetre band of vegetable-tanned leather that will outlive the trousers it holds. Solid brass buckle, edges burnished by hand.",
      priceText: "₹4,900",
      priceMinor: 490000,
      currency: "INR",
      imageUrl: u("photo-1624222247344-550fb60583dc"),
      available: true,
      ctaUrl: null,
    },
    {
      id: "dm6",
      slug: "look-07-preorder",
      title: "Look 07 — Pre-order",
      subtitle: "Photographed for Issue 002",
      description:
        "The closing look of next season, offered before the pictures exist. Cut, cloth and hem are already decided; the photographs arrive with Issue 002.",
      priceText: "₹26,000",
      priceMinor: 2600000,
      currency: "INR",
      imageUrl: null,
      available: true,
      ctaUrl: null,
    },
  ],
};

export default set;
