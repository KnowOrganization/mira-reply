// Demo catalog for t01-editorial — "The Print Room".
// Field Notes Press: a small Fort Kochi print studio selling numbered editions.
// Every image URL verified 200 via curl (images.unsplash.com, imgix params).
import type { DemoSet } from "../fallback";

const IMG = "?q=80&w=1200&auto=format&fit=crop";

const set: DemoSet = {
  settings: {
    storefrontTitle: "Field Notes Press",
    storefrontAccent: "#c0392b",
    storefrontHeroHeadline: "Editions from the field",
    storefrontHeroTagline:
      "Small-run giclée and silver-gelatin prints — numbered, stamped and shipped from Fort Kochi.",
    storefrontHeroLayout: "split",
    storefrontHeroImageUrl:
      "https://images.unsplash.com/photo-1577720580479-7d839d829c73?q=80&w=1600&auto=format&fit=crop",
    storefrontFeaturedIds: ["d1", "d3", "d5"],
    storefrontShowFeatured: true,
    storefrontShowDiscover: true,
    storefrontShowAbout: true,
    storefrontAbout:
      "Field Notes Press is a two-person print studio working out of an old spice warehouse in Fort Kochi. Every plate is proofed on cotton rag, checked against the negative under north light, and numbered in pencil before it ships. We print slowly, in editions small enough that we remember each one.",
    storefrontBuyLabel: "Buy",
    storefrontCheckoutEnabled: true,
    storefrontCurrency: "INR",
  },
  products: [
    {
      id: "d1",
      slug: "dawn-at-varkala",
      title: "Dawn at Varkala — Giclée Print",
      subtitle: "Edition of 50 · A3 on cotton rag",
      description:
        "Shot at 5:40 in the morning from the cliff path, before the fishing boats went out. Printed as a giclée on 310 gsm cotton rag with a wide plate margin for framing.",
      priceText: "₹3,200",
      priceMinor: 320000,
      currency: "INR",
      imageUrl: `https://images.unsplash.com/photo-1505118380757-91f5f5632de0${IMG}`,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d2",
      slug: "study-in-ochre-no-4",
      title: "Study in Ochre No. 4",
      subtitle: "Edition of 25 · A2 pigment print",
      description:
        "The fourth in a series of pigment studies mixed from Kerala laterite and raw umber. Each print is checked against the original panel under north light before it is numbered.",
      priceText: "₹4,800",
      priceMinor: 480000,
      currency: "INR",
      imageUrl: `https://images.unsplash.com/photo-1604147706283-d7119b5b822c${IMG}`,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d3",
      slug: "monsoon-series-triptych",
      title: "Monsoon Series — Triptych",
      subtitle: "Set of three · A3 each",
      description:
        "Three windows, three weeks of rain — a slow study of the same pane as the monsoon settled in. Sold as a set of three A3 plates, numbered as a single edition.",
      priceText: "₹14,000",
      priceMinor: 1400000,
      currency: "INR",
      imageUrl: `https://images.unsplash.com/photo-1428592953211-077101b2021b${IMG}`,
      images: [
        `https://images.unsplash.com/photo-1428592953211-077101b2021b${IMG}`,
        `https://images.unsplash.com/photo-1515694346937-94d85e41e6f0${IMG}`,
        `https://images.unsplash.com/photo-1501691223387-dd0500403074${IMG}`,
      ],
      available: true,
      ctaUrl: null,
    },
    {
      id: "d4",
      slug: "the-cartographers-sketch",
      title: "The Cartographer's Sketch",
      subtitle: "Open edition · A4 facsimile",
      description:
        "A facsimile of a surveyor's working sketch we found folded inside a 1930s atlas — creases, compass marks and pencil corrections intact. Printed in open edition on toned stock.",
      priceText: "₹1,800",
      priceMinor: 180000,
      currency: "INR",
      imageUrl: `https://images.unsplash.com/photo-1524661135-423995f22d0b${IMG}`,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d5",
      slug: "silver-gelatin-old-delhi",
      title: "Silver Gelatin: Old Delhi",
      subtitle: "Hand-printed · Edition of 12",
      description:
        "Hand-printed in the darkroom from the original negative — Chandni Chowk at noon, all smoke and awnings. Twelve prints only; each is dodged and burned individually, so no two match.",
      priceText: "₹9,500",
      priceMinor: 950000,
      currency: "INR",
      imageUrl: `https://images.unsplash.com/photo-1587474260584-136574528ed5${IMG}&sat=-100`,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d6",
      slug: "unnumbered-proof",
      title: "Unnumbered Proof",
      subtitle: "Artist's proof · Unique",
      description:
        "The one that never made the edition — a working proof pulled while the inks were still being balanced. Unique, unnumbered, and signed on the verso.",
      priceText: "₹2,600",
      priceMinor: 260000,
      currency: "INR",
      imageUrl: null,
      available: true,
      ctaUrl: null,
    },
  ],
};

export default set;
