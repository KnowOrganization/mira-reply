// Demo catalog for t10-typo — "The Index". Studio Mund: a small ceramics /
// studio-objects practice. This is the flagship no-image template, so the
// catalog deliberately includes one image-null "second" to demo the italic
// annotation row, and one product with a 3-image gallery for the Detail
// specimen plate. Every image URL curl-verified 200.
import type { DemoSet } from "../fallback";

const set: DemoSet = {
  settings: {
    storefrontTitle: "Studio Mund",
    storefrontAccent: "#2f5233",
    storefrontHeroHeadline: "Objects for slow living",
    storefrontHeroTagline:
      "Hand-thrown, hand-finished — small batches from a two-wheel studio. Nothing leaves before it earns its place on a table.",
    storefrontHeroLayout: "minimal",
    storefrontShowFeatured: true,
    storefrontShowDiscover: true,
    storefrontShowAbout: true,
    storefrontAbout:
      "Studio Mund is a two-person pottery practice working out of a converted grain shed. We fire twice a month, make in small series, and list only what survives the kiln.",
    storefrontBuyLabel: "Order",
    storefrontCheckoutEnabled: true,
    storefrontCurrency: "INR",
    storefrontFeaturedIds: ["dt1", "dt3", "dt5"],
  },
  products: [
    {
      id: "dt1",
      slug: "stoneware-pour-over-set",
      title: "Stoneware Pour-Over Set",
      subtitle: "matte stoneware · dripper, carafe & cup",
      description:
        "A three-piece morning ritual: dripper, carafe and a low cup, thrown as one family in iron-flecked stoneware. The unglazed rim keeps the pour honest; the inside is glassed smooth for easy rinsing.",
      priceText: "₹3,400",
      priceMinor: 340000,
      currency: "INR",
      imageUrl:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=1200&auto=format&fit=crop",
      ],
      available: true,
      ctaUrl: null,
    },
    {
      id: "dt2",
      slug: "ash-wood-trivet",
      title: "Ash Wood Trivet",
      subtitle: "solid ash · hand-oiled",
      description:
        "Cut from a single board of ash and finished with three coats of food-safe oil. Sized to take the pour-over carafe, a saucepan, or a very hot opinion.",
      priceText: "₹1,150",
      priceMinor: 115000,
      currency: "INR",
      imageUrl:
        "https://images.unsplash.com/photo-1604762524889-3e2fcc145683?q=80&w=1200&auto=format&fit=crop",
      available: true,
      ctaUrl: null,
    },
    {
      id: "dt3",
      slug: "raku-bud-vase-n2",
      title: "Raku Bud Vase N°2",
      subtitle: "raku-fired · crackle glaze",
      description:
        "Pulled from the kiln glowing and smoked in sawdust — the crackle map on every N°2 is its own. Holds one stem with conviction, three at most.",
      priceText: "₹2,600",
      priceMinor: 260000,
      currency: "INR",
      imageUrl:
        "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?q=80&w=1200&auto=format&fit=crop",
      available: true,
      ctaUrl: null,
    },
    {
      id: "dt4",
      slug: "linen-table-runner",
      title: "Linen Table Runner",
      subtitle: "washed European linen · 180 cm",
      description:
        "Stonewashed linen in undyed oat, hemmed by hand. It creases beautifully and forgives turmeric — eventually.",
      priceText: "₹1,900",
      priceMinor: 190000,
      currency: "INR",
      imageUrl:
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop",
      available: true,
      ctaUrl: null,
    },
    {
      id: "dt5",
      slug: "brass-object-untitled",
      title: "Brass Object — Untitled",
      subtitle: "cast brass · one of eight",
      description:
        "A solid brass form cast from a hand-carved wax original. Paperweight, worry stone, small monument — we decline to decide. Edition of eight, stamped underneath.",
      priceText: "₹7,800",
      priceMinor: 780000,
      currency: "INR",
      imageUrl:
        "https://images.unsplash.com/photo-1519974719765-e6559eac2575?q=80&w=1200&auto=format&fit=crop",
      available: true,
      ctaUrl: null,
    },
    {
      id: "dt6",
      slug: "second-kiln-flaw",
      title: "Second — Kiln Flaw",
      subtitle: "hand-thrown stoneware, one of one",
      description:
        "A cup that leaned into the flame and came out marked for it. Fully functional, quietly imperfect, priced accordingly. No photograph — the flaw prefers to be met in person.",
      priceText: "₹900",
      priceMinor: 90000,
      currency: "INR",
      imageUrl: null,
      available: true,
      ctaUrl: null,
    },
  ],
};

export default set;
