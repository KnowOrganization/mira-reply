// Demo catalog for t02-brutalist — "Volt Object Co." (tech/hardware spec-sheet).
// All image URLs curl-verified 200.
import type { DemoSet } from "../fallback";

const IMG = {
  keypad: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?q=80&w=1200&auto=format&fit=crop",
  keypad2: "https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=1200&auto=format&fit=crop",
  keypad3: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=1200&auto=format&fit=crop",
  charger: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?q=80&w=1200&auto=format&fit=crop",
  clock: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?q=80&w=1200&auto=format&fit=crop",
  cables: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop",
  stand: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=1200&auto=format&fit=crop",
};

const set: DemoSet = {
  settings: {
    storefrontTitle: "Volt Object Co.",
    storefrontAccent: "#ff4d00",
    storefrontHeroHeadline: "Volt Object Co.",
    storefrontHeroTagline: "Utilitarian hardware for people who read spec sheets for fun.",
    storefrontHeroImageUrl: IMG.keypad,
    storefrontShowFeatured: true,
    storefrontShowDiscover: true,
    storefrontShowAbout: true,
    storefrontAbout:
      "We machine, test and torture every unit before it ships. If it survives our bench, it survives your desk.",
    storefrontBuyLabel: "Order",
    storefrontCheckoutEnabled: true,
    storefrontCurrency: "INR",
    storefrontFeaturedIds: ["d21", "d23", "d25"],
  },
  products: [
    {
      id: "d21",
      slug: "vx-1-mechanical-keypad",
      title: "VX-1 Mechanical Keypad",
      subtitle: "Hot-swap · Gasket mount · CNC alu",
      description:
        "Nine programmable keys on a CNC-milled aluminium plate. Gasket-mounted PCB with hot-swap sockets. Ships with lubed linear switches.",
      priceText: "₹8,900",
      priceMinor: 890000,
      currency: "INR",
      imageUrl: IMG.keypad,
      images: [IMG.keypad, IMG.keypad2, IMG.keypad3],
      available: true,
      ctaUrl: null,
    },
    {
      id: "d22",
      slug: "field-charger-20k",
      title: "Field Charger 20K",
      subtitle: "20,000 mAh · 65W PD · IP54",
      description:
        "A power bank built like a site tool. 65W USB-C PD in and out. Rubberised shell rated IP54 against dust and spray.",
      priceText: "₹4,200",
      priceMinor: 420000,
      currency: "INR",
      imageUrl: IMG.charger,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d23",
      slug: "split-flap-desk-clock",
      title: "Split-Flap Desk Clock",
      subtitle: "Electromechanical · 24h",
      description:
        "A genuine electromechanical split-flap display. Flips every minute with the sound you hope it makes. Steel chassis.",
      priceText: "₹18,500",
      priceMinor: 1850000,
      currency: "INR",
      imageUrl: IMG.clock,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d24",
      slug: "cable-kit-07",
      title: "Cable Kit 07",
      subtitle: "3× braided USB-C · 100W",
      description:
        "Three braided USB-C cables in 0.3m, 1m and 2m. E-marked for 100W. Sleeves survive 30,000 bend cycles on our rig.",
      priceText: "₹1,400",
      priceMinor: 140000,
      currency: "INR",
      imageUrl: IMG.cables,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d25",
      slug: "aluminium-stand-a2",
      title: "Aluminium Stand A2",
      subtitle: "6063 alloy · 22° fixed",
      description:
        "Single-piece 6063 aluminium laptop stand at a fixed 22 degrees. No hinges, no wobble, nothing to fail.",
      priceText: "₹3,600",
      priceMinor: 360000,
      currency: "INR",
      imageUrl: IMG.stand,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d26",
      slug: "firmware-license-digital",
      title: "Firmware License — Digital",
      subtitle: "VX series · lifetime updates",
      description:
        "Lifetime firmware updates and the configurator for every VX-series device. Delivered as a license key by email.",
      priceText: "₹999",
      priceMinor: 99900,
      currency: "INR",
      imageUrl: null,
      available: true,
      ctaUrl: null,
    },
  ],
};

export default set;
