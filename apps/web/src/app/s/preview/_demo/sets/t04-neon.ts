// Demo catalog for t04-neon — "NULLWAVE", a synthwave OS shipping digital
// goods: presets, LUTs, UI kits, samples, wallpapers. All image URLs verified
// 200 via curl. "Source Files — Lifetime" ships imageUrl:null on purpose to
// demo the AWAITING VISUAL FEED monogram treatment.
import type { DemoSet } from "../fallback";

const set: DemoSet = {
  settings: {
    storefrontTitle: "NULLWAVE",
    storefrontAccent: "#00e5ff",
    storefrontHeroHeadline: "Run the afterglow",
    storefrontHeroTagline:
      "Presets, plugins and tools for night-shift creators. Built on the grid, delivered instantly.",
    storefrontHeroLayout: "minimal",
    storefrontShowFeatured: true,
    storefrontShowDiscover: true,
    storefrontShowAbout: true,
    storefrontAbout:
      "NULLWAVE is a one-person software label transmitting from a rooftop in Bengaluru. Every program is hand-built, tested at 2AM and updated for life.",
    storefrontContactUrl: "https://instagram.com/nullwave",
    // NOTE: creative spec asked for buyLabel "Get" — StorefrontSettingsInput
    // types buyLabel as "Buy" | "Shop" | "Order", so "Buy" ships here and the
    // template's own CTAs carry the GET language ("GET — INSTALL").
    storefrontBuyLabel: "Buy",
    storefrontCheckoutEnabled: true,
    storefrontCurrency: "INR",
    storefrontFeaturedIds: ["dn1", "dn4"],
  },
  products: [
    {
      id: "dn1",
      slug: "synthline-preset-pack-vol-3",
      title: "Synthline Preset Pack Vol. 3",
      subtitle: "120 presets · Serum + Vital",
      description:
        "One hundred and twenty hand-tuned patches for neon leads, tape-warped pads and rolling arpeggios. Drag, drop, glow — macros pre-mapped on every patch.",
      priceText: "₹1,499",
      priceMinor: 149900,
      currency: "INR",
      imageUrl:
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
      images: [
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop",
      ],
      available: true,
      ctaUrl: null,
    },
    {
      id: "dn2",
      slug: "glitchcore-lut-bundle",
      title: "Glitchcore LUT Bundle",
      subtitle: "35 LUTs · .cube format",
      description:
        "Thirty-five color grades that push footage into chromatic-aberration territory — VHS teal, sodium haze, terminal green. Works in Resolve, Premiere and CapCut.",
      priceText: "₹999",
      priceMinor: 99900,
      currency: "INR",
      imageUrl:
        "https://images.unsplash.com/photo-1550537687-c91072c4792d?q=80&w=1200&auto=format&fit=crop",
      available: true,
      ctaUrl: null,
    },
    {
      id: "dn3",
      slug: "retro-terminal-ui-kit",
      title: "Retro Terminal UI Kit",
      subtitle: "Figma + React components",
      description:
        "A full phosphor-glow interface system: 96 components, CRT scanline effects and a themable token set. Ships as Figma library plus typed React source.",
      priceText: "₹2,499",
      priceMinor: 249900,
      currency: "INR",
      imageUrl:
        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop",
      available: true,
      ctaUrl: null,
    },
    {
      id: "dn4",
      slug: "808-vault-sample-library",
      title: "808 Vault — Sample Library",
      subtitle: "1.2 GB · 24-bit WAV",
      description:
        "Four hundred booming 808s, analog drum hits and dusk-soaked textures recorded through real tape saturation. Root-note labelled, loop-ready, royalty-free forever.",
      priceText: "₹1,899",
      priceMinor: 189900,
      currency: "INR",
      imageUrl:
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop",
      available: true,
      ctaUrl: null,
    },
    {
      id: "dn5",
      slug: "neon-city-wallpaper-set",
      title: "Neon City Wallpaper Set",
      subtitle: "12 scenes · up to 5K",
      description:
        "Twelve rain-slicked cityscapes rendered for desktop, ultrawide and phone. Includes dimmed AMOLED variants so the grid follows you after hours.",
      priceText: "₹499",
      priceMinor: 49900,
      currency: "INR",
      imageUrl:
        "https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=1200&auto=format&fit=crop",
      available: true,
      ctaUrl: null,
    },
    {
      id: "dn6",
      slug: "source-files-lifetime",
      title: "Source Files — Lifetime",
      subtitle: "Every program · forever",
      description:
        "One key, the whole vault: every current and future NULLWAVE release, raw project files included. Lifetime updates pushed straight to your inbox.",
      priceText: "₹4,999",
      priceMinor: 499900,
      currency: "INR",
      imageUrl: null,
      available: true,
      ctaUrl: null,
    },
  ],
};

export default set;
