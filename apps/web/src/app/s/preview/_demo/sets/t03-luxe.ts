// Demo catalog for t03-luxe — "The Vitrine". Maison Or: haute joaillerie shown
// in a near-black vitrine under one beam of light. Every Unsplash URL below was
// verified 200 (curl -L) on 2026-07-02.
import type { DemoSet } from "../fallback";

const u = (id: string) => `https://images.unsplash.com/${id}?q=80&w=1200&auto=format&fit=crop`;

const set: DemoSet = {
  settings: {
    storefrontTitle: "Maison Or",
    storefrontAccent: "#c9a227",
    storefrontHeroHeadline: "Light, held in gold",
    storefrontHeroTagline: "Haute joaillerie for the hour after midnight",
    storefrontHeroLayout: "minimal",
    // Dark layered gold chains w/ crescent pendant — sits dim behind the hero light bloom.
    storefrontHeroImageUrl: u("photo-1599643478518-a784e5dc4c8f"),
    storefrontShowFeatured: true,
    storefrontShowDiscover: true,
    storefrontShowAbout: true,
    storefrontAbout:
      "Maison Or works in small rooms and long silences — every piece is drawn, cast and finished by a single pair of hands. We make very little, very slowly, for those who wear light rather than jewellery.",
    storefrontContactUrl: "https://instagram.com/maison.or.atelier",
    storefrontBuyLabel: "Order",
    storefrontCheckoutEnabled: true,
    storefrontCurrency: "INR",
    storefrontFeaturedIds: ["d31", "d32", "d34"],
    storefrontTemplate: "t03-luxe",
  },
  products: [
    {
      id: "d31",
      slug: "seance-ring-18k",
      title: "Séance Ring — 18k",
      subtitle: "Round brilliant · pavé halo",
      description:
        "A single stone set low into a hand-engraved band, cut to gather whatever light the room allows. Made to order in the atelier over six weeks.",
      priceText: "₹84,000",
      priceMinor: 8400000,
      currency: "INR",
      imageUrl: u("photo-1605100804763-247f67b3557e"), // ring on black velvet
      available: true,
      ctaUrl: null,
    },
    {
      id: "d32",
      slug: "comet-drop-earrings",
      title: "Comet Drop Earrings",
      subtitle: "Morganite · rose gold",
      description:
        "Two pale stones that fall away from the ear like slow fireworks. Worn best with nothing else at all.",
      priceText: "₹56,000",
      priceMinor: 5600000,
      currency: "INR",
      imageUrl: u("photo-1629224316810-9d8805b95e76"), // rose-gold drop earrings
      images: [
        u("photo-1629224316810-9d8805b95e76"),
        u("photo-1617038220319-276d3cfab638"), // gold twists in raking light
        u("photo-1603974372039-adc49044b6bd"), // gold hoops on a dark mirror
      ],
      available: true,
      ctaUrl: null,
    },
    {
      id: "d33",
      slug: "serpent-chain",
      title: "Serpent Chain",
      subtitle: "Solid 22k · 42 cm",
      description:
        "Heavy, articulated links that move like a living thing against the collarbone. Closed with the maison's engraved barrel clasp.",
      priceText: "₹1,45,000",
      priceMinor: 14500000,
      currency: "INR",
      imageUrl: u("photo-1602173574767-37ac01994b2a"), // chunky gold chain
      available: true,
      ctaUrl: null,
    },
    {
      id: "d34",
      slug: "nocturne-cuff",
      title: "Nocturne Cuff",
      subtitle: "Diamond pavé · white gold",
      description:
        "Seventy-two stones set edge to edge in a rigid crescent — the darkest room's brightest object.",
      priceText: "₹2,80,000",
      priceMinor: 28000000,
      currency: "INR",
      imageUrl: u("photo-1573408301185-9146fe634ad0"), // diamond bracelet on black
      available: true,
      ctaUrl: null,
    },
    {
      id: "d35",
      slug: "signet-bespoke",
      title: "Signet — Bespoke",
      subtitle: "Engraved to commission",
      description:
        "Your mark, cut by hand into a polished 18k face. Allow eight weeks; bring only the initials that matter.",
      priceText: "₹98,000",
      priceMinor: 9800000,
      currency: "INR",
      imageUrl: u("photo-1608042314453-ae338d80c427"), // gold signet rings on stone
      available: true,
      ctaUrl: null,
    },
    {
      id: "d36",
      slug: "atelier-piece-no-9",
      title: "Atelier Piece No. 9",
      subtitle: "One of one",
      description:
        "The ninth study from this year's bench — photographed nowhere, shown only by appointment.",
      priceText: "₹24,000",
      priceMinor: 2400000,
      currency: "INR",
      imageUrl: null, // deliberate: demos the engraved-monogram vitrine tile
      available: true,
      ctaUrl: null,
    },
  ],
};

export default set;
