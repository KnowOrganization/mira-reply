// Demo catalog for t09-boutique — "The Ritual" (Áura Skin).
// Soft-light skincare set; every Unsplash URL verified 200 on 2026-07-02.
import type { DemoSet } from "../fallback";

const U = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

const set: DemoSet = {
  settings: {
    storefrontTitle: "Áura Skin",
    storefrontAccent: "#b76e79",
    storefrontHeroHeadline: "Skin, unhurried",
    storefrontHeroTagline:
      "Small-batch skincare for slow mornings — botanicals, warm water, and a little more time than you think you have.",
    storefrontHeroLayout: "minimal",
    storefrontHeroImageUrl: U("photo-1544161515-4ab6ce6db874", 1600),
    storefrontShowFeatured: true,
    storefrontShowDiscover: true,
    storefrontShowAbout: true,
    storefrontAbout:
      "Áura began in a Goa bathroom with one copper bowl and a rosehip harvest. We still make everything in small batches, and we still believe ten quiet minutes can change a whole day.",
    storefrontBuyLabel: "Shop",
    storefrontCheckoutEnabled: true,
    storefrontCurrency: "INR",
    storefrontFeaturedIds: ["d9mask", "d9serum", "d9cream"],
  },
  products: [
    {
      id: "d9mask",
      slug: "enzyme-polish-mask",
      title: "Enzyme Polish Mask",
      subtitle: "Cleanse · Weekly reset",
      description:
        "Papaya enzymes and pale-pink kaolin lift the week off your skin without a single harsh grain. Five quiet minutes, then warm water.",
      priceText: "₹1,450",
      priceMinor: 145000,
      currency: "INR",
      imageUrl: U("photo-1611080626919-7cf5a9dbab5b"),
      available: true,
      ctaUrl: null,
    },
    {
      id: "d9serum",
      slug: "rosehip-recovery-serum",
      title: "Rosehip Recovery Serum",
      subtitle: "Treat · Night repair",
      description:
        "Cold-pressed rosehip and blue tansy, bottled within a week of harvest. Press three drops in while skin is still damp and let the night do the rest.",
      priceText: "₹2,450",
      priceMinor: 245000,
      currency: "INR",
      imageUrl: U("photo-1620916566398-39f1143ab7be"),
      images: [
        U("photo-1620916566398-39f1143ab7be"),
        U("photo-1601049676869-702ea24cfd58"),
        U("photo-1596755389378-c31d21fd1273"),
      ],
      available: true,
      ctaUrl: null,
    },
    {
      id: "d9cream",
      slug: "cloud-cream-moisturizer",
      title: "Cloud Cream Moisturizer",
      subtitle: "Seal · Daily comfort",
      description:
        "A whipped ceramide cream that lands like weather rather than weight. One warm fingertip, morning and night.",
      priceText: "₹1,850",
      priceMinor: 185000,
      currency: "INR",
      imageUrl: U("photo-1626784215021-2e39ccf971cd"),
      available: true,
      ctaUrl: null,
    },
    {
      id: "d9oil",
      slug: "bathing-ritual-oil",
      title: "Bathing Ritual Oil",
      subtitle: "Soak · Evening wind-down",
      description:
        "Sweet almond oil steeped with vetiver and neroli. Pour a capful under running water and stay a little longer than planned.",
      priceText: "₹1,250",
      priceMinor: 125000,
      currency: "INR",
      imageUrl: U("photo-1600334129128-685c5582fd35"),
      available: true,
      ctaUrl: null,
    },
    {
      id: "d9set",
      slug: "the-complete-ritual-set",
      title: "The Complete Ritual Set",
      subtitle: "All four steps · Gift-ready",
      description:
        "Every step of the ritual in one linen-wrapped box, with a small hand-printed guide to doing less, slowly.",
      priceText: "₹6,400",
      priceMinor: 640000,
      currency: "INR",
      imageUrl: U("photo-1571781926291-c477ebfd024b"),
      available: true,
      ctaUrl: null,
    },
    {
      id: "d9wait",
      slug: "sensitive-formula-waitlist",
      title: "Sensitive Formula — Waitlist",
      subtitle: "Coming soon · Fragrance-free",
      description:
        "Our gentlest formula yet, resting until it is ready. Reserve a jar and we will write to you first.",
      priceText: "₹950",
      priceMinor: 95000,
      currency: "INR",
      imageUrl: null,
      available: true,
      ctaUrl: null,
    },
  ],
};

export default set;
