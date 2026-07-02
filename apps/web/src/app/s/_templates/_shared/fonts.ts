// Per-template Google font pairs. ALL pairs live here with preload: false —
// the registry static-imports every template, so preload: true would inject
// <link rel="preload"> for ~20 font binaries on every storefront route.
// With preload: false only the @font-face CSS ships; browsers download font
// binaries lazily, and only for font-family values actually used by rendered
// text — i.e. only the active template's pair ever loads.
//
// Each template applies TEMPLATE_FONTS[id].className on its root element and
// consumes the fonts via the per-font CSS variables below.
import {
  Fraunces,
  Work_Sans,
  Archivo_Black,
  Space_Mono,
  Cormorant_Garamond,
  Jost,
  Unbounded,
  Space_Grotesk,
  Shrikhand,
  Quicksand,
  Bodoni_Moda,
  Inter_Tight,
  Anton,
  Barlow,
  Bricolage_Grotesque,
  Instrument_Sans,
  Prata,
  Karla,
  Anybody,
  Newsreader,
} from "next/font/google";

// ── t01-editorial · "The Print Room" ─────────────────────────────────────────
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  preload: false,
  display: "swap",
  variable: "--font-fraunces",
});
const workSans = Work_Sans({
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-work-sans",
});

// ── t02-brutalist · "The Schematic" ──────────────────────────────────────────
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  preload: false,
  display: "swap",
  variable: "--font-archivo-black",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
  display: "swap",
  variable: "--font-space-mono",
});

// ── t03-luxe · "The Vitrine" ─────────────────────────────────────────────────
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  preload: false,
  display: "swap",
  variable: "--font-cormorant",
});
const jost = Jost({
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-jost",
});

// ── t04-neon · "The Grid" ────────────────────────────────────────────────────
const unbounded = Unbounded({
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-unbounded",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-space-grotesk",
});

// ── t05-playful · "The Sticker Shop" ─────────────────────────────────────────
const shrikhand = Shrikhand({
  subsets: ["latin"],
  weight: "400",
  preload: false,
  display: "swap",
  variable: "--font-shrikhand",
});
const quicksand = Quicksand({
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-quicksand",
});

// ── t06-magazine · "The Issue" ───────────────────────────────────────────────
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  preload: false,
  display: "swap",
  variable: "--font-bodoni",
});
const interTight = Inter_Tight({
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-inter-tight",
});

// ── t07-drop · "The Countdown" ───────────────────────────────────────────────
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  preload: false,
  display: "swap",
  variable: "--font-anton",
});
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  preload: false,
  display: "swap",
  variable: "--font-barlow",
});

// ── t08-market · "The Bazaar" ────────────────────────────────────────────────
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-bricolage",
});
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-instrument-sans",
});

// ── t09-boutique · "The Ritual" ──────────────────────────────────────────────
const prata = Prata({
  subsets: ["latin"],
  weight: "400",
  preload: false,
  display: "swap",
  variable: "--font-prata",
});
const karla = Karla({
  subsets: ["latin"],
  style: ["normal", "italic"],
  preload: false,
  display: "swap",
  variable: "--font-karla",
});

// ── t10-typo · "The Index" ───────────────────────────────────────────────────
const anybody = Anybody({
  subsets: ["latin"],
  axes: ["wdth"],
  preload: false,
  display: "swap",
  variable: "--font-anybody",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  preload: false,
  display: "swap",
  variable: "--font-newsreader",
});

export type TemplateFonts = {
  /** join of both variable classNames — put on the template root */
  className: string;
  /** CSS font-family value for display type */
  display: string;
  /** CSS font-family value for body type */
  body: string;
};

export const TEMPLATE_FONTS: Record<string, TemplateFonts> = {
  "t01-editorial": {
    className: `${fraunces.variable} ${workSans.variable}`,
    display: "var(--font-fraunces), Georgia, serif",
    body: "var(--font-work-sans), system-ui, sans-serif",
  },
  "t02-brutalist": {
    className: `${archivoBlack.variable} ${spaceMono.variable}`,
    display: "var(--font-archivo-black), Impact, sans-serif",
    body: "var(--font-space-mono), ui-monospace, monospace",
  },
  "t03-luxe": {
    className: `${cormorant.variable} ${jost.variable}`,
    display: "var(--font-cormorant), Georgia, serif",
    body: "var(--font-jost), system-ui, sans-serif",
  },
  "t04-neon": {
    className: `${unbounded.variable} ${spaceGrotesk.variable}`,
    display: "var(--font-unbounded), system-ui, sans-serif",
    body: "var(--font-space-grotesk), system-ui, sans-serif",
  },
  "t05-playful": {
    className: `${shrikhand.variable} ${quicksand.variable}`,
    display: "var(--font-shrikhand), Georgia, serif",
    body: "var(--font-quicksand), system-ui, sans-serif",
  },
  "t06-magazine": {
    className: `${bodoni.variable} ${interTight.variable}`,
    display: "var(--font-bodoni), 'Didot', Georgia, serif",
    body: "var(--font-inter-tight), system-ui, sans-serif",
  },
  "t07-drop": {
    className: `${anton.variable} ${barlow.variable}`,
    display: "var(--font-anton), Impact, sans-serif",
    body: "var(--font-barlow), system-ui, sans-serif",
  },
  "t08-market": {
    className: `${bricolage.variable} ${instrumentSans.variable}`,
    display: "var(--font-bricolage), system-ui, sans-serif",
    body: "var(--font-instrument-sans), system-ui, sans-serif",
  },
  "t09-boutique": {
    className: `${prata.variable} ${karla.variable}`,
    display: "var(--font-prata), Georgia, serif",
    body: "var(--font-karla), system-ui, sans-serif",
  },
  "t10-typo": {
    className: `${anybody.variable} ${newsreader.variable}`,
    display: "var(--font-anybody), system-ui, sans-serif",
    body: "var(--font-newsreader), Georgia, serif",
  },
};

export function getTemplateFonts(id: string): TemplateFonts {
  return TEMPLATE_FONTS[id] ?? TEMPLATE_FONTS["t01-editorial"];
}
