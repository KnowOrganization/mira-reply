// Demo catalog for t07-drop — "STATIC CLUB" (dark streetwear drop).
// All image URLs curl-verified 200.
import type { DemoSet } from "../fallback";

const P = "?q=80&w=1200&auto=format&fit=crop";
const u = (id: string) => `https://images.unsplash.com/${id}${P}`;

const IMG = {
  hoodie: u("photo-1556821840-3a63f95609a7"),
  hoodie2: u("photo-1620799140408-edc6dcb6d633"),
  hoodie3: u("photo-1618354691373-d851c5c3a990"),
  tee: u("photo-1503341504253-dff4815485f1"),
  vest: u("photo-1552374196-c4e7ffc6e126"),
  socks: u("photo-1521572163474-6864f9cf17ab"),
  cap: u("photo-1588117260148-b47818741c74"),
};

const set: DemoSet = {
  settings: {
    storefrontTitle: "STATIC CLUB",
    storefrontAccent: "#ccff00",
    storefrontHeroHeadline: "STATIC CLUB",
    storefrontHeroTagline: "DROP 001 — WHEN IT'S GONE IT'S GONE",
    storefrontHeroImageUrl: IMG.hoodie,
    storefrontShowFeatured: true,
    storefrontShowDiscover: true,
    storefrontShowAbout: true,
    storefrontAbout:
      "WE MAKE ONE RUN AND WE NEVER MAKE IT AGAIN. NO RESTOCKS, NO RERUNS, NO APOLOGIES — IF YOU SLEEP, YOU MISS OUT.",
    storefrontContactUrl: "https://instagram.com/staticclub",
    storefrontBuyLabel: "Shop",
    storefrontCheckoutEnabled: true,
    storefrontCurrency: "INR",
    storefrontFeaturedIds: ["d71", "d73", "d75"],
  },
  products: [
    {
      id: "d71",
      slug: "sc-heavyweight-hoodie-volt",
      title: "SC Heavyweight Hoodie — Volt",
      subtitle: "480gsm loopback · Boxy · Volt embroidery",
      description:
        "A brick of a hoodie in 480gsm brushed loopback cotton. Dropped shoulders, boxed hem, and the SC crest chain-stitched in volt on the chest. Heavy enough to stand up on its own.",
      priceText: "₹7,500",
      priceMinor: 750000,
      currency: "INR",
      imageUrl: IMG.hoodie,
      images: [IMG.hoodie, IMG.hoodie2, IMG.hoodie3],
      available: true,
      ctaUrl: null,
    },
    {
      id: "d72",
      slug: "distortion-tee",
      title: "Distortion Tee",
      subtitle: "240gsm · Puff-print graphic · Oversized",
      description:
        "Oversized 240gsm tee with a warped, glitched-out back print that looks like the signal dropped mid-frame. Pre-washed so it stays put.",
      priceText: "₹2,200",
      priceMinor: 220000,
      currency: "INR",
      imageUrl: IMG.tee,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d73",
      slug: "utility-vest-2",
      title: "Utility Vest 2.0",
      subtitle: "Ripstop · 6 pockets · Magnetic storm flap",
      description:
        "A techy ripstop vest with six real pockets and a magnetic storm flap. Layer it over the hoodie and carry everything, look like you carry nothing.",
      priceText: "₹5,400",
      priceMinor: 540000,
      currency: "INR",
      imageUrl: IMG.vest,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d74",
      slug: "club-socks-3-pack",
      title: "Club Socks 3-Pack",
      subtitle: "Ribbed · Volt heel · One size",
      description:
        "Three pairs of thick ribbed crew socks with a volt-dipped heel and the club wordmark up the calf. The easy add to hit free shipping.",
      priceText: "₹900",
      priceMinor: 90000,
      currency: "INR",
      imageUrl: IMG.socks,
      available: false,
      ctaUrl: null,
    },
    {
      id: "d75",
      slug: "static-cap",
      title: "Static Cap",
      subtitle: "6-panel · Structured · Rubber badge",
      description:
        "A structured 6-panel cap in blackout twill with a raised rubber SC badge and a metal snap closure. Curved brim, broken in for you.",
      priceText: "₹1,800",
      priceMinor: 180000,
      currency: "INR",
      imageUrl: IMG.cap,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d76",
      slug: "friends-family-unreleased",
      title: "Friends & Family — Unreleased",
      subtitle: "Never on sale · Members only",
      description:
        "The piece we don't sell. Handed out to the people who show up. It has no photo because you weren't supposed to see it — get on the list.",
      priceText: null,
      priceMinor: null,
      currency: "INR",
      imageUrl: null,
      available: false,
      ctaUrl: "https://instagram.com/staticclub",
    },
  ],
};

export default set;
