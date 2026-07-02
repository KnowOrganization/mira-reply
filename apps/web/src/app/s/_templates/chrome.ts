// Per-template "chrome" — pure data (NO component imports) consumed by the
// shared cart / checkout / success pages so they inherit the template's feel
// without pulling all 10 template modules into the client bundle.
// Values mirror each template's design spec; adjust alongside rebuilds.
import { TEMPLATE_FONTS, type TemplateFonts } from "./_shared/fonts";

export type TemplateChrome = {
  fonts: TemplateFonts;
  /** page background */
  bg: string;
  /** primary text color */
  text: string;
  /** hairlines / dividers */
  border: string;
  /** border-radius for cards & inputs (px) */
  radius: number;
  /** button look — accent colors flow via --sf-accent at runtime */
  button: React.CSSProperties;
  /** dark chrome → light-on-dark form fields */
  dark: boolean;
};

const CHROME: Record<string, TemplateChrome> = {
  "t01-editorial": {
    fonts: TEMPLATE_FONTS["t01-editorial"],
    bg: "#f6f2ea",
    text: "#1c1a17",
    border: "rgba(28,26,23,.14)",
    radius: 2,
    button: { background: "#1c1a17", color: "#f6f2ea", letterSpacing: "0.04em" },
    dark: false,
  },
  "t02-brutalist": {
    fonts: TEMPLATE_FONTS["t02-brutalist"],
    bg: "#e8e6e1",
    text: "#0a0a0a",
    border: "#0a0a0a",
    radius: 0,
    button: {
      background: "var(--sf-accent, #ff4d00)",
      color: "var(--sf-accent-fg, #fff)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 700,
    },
    dark: false,
  },
  "t03-luxe": {
    fonts: TEMPLATE_FONTS["t03-luxe"],
    bg: "#0e0d0b",
    text: "#ece7dd",
    border: "rgba(236,231,221,.16)",
    radius: 0,
    button: {
      background: "transparent",
      color: "#ece7dd",
      border: "1px solid rgba(236,231,221,.4)",
      textTransform: "uppercase",
      letterSpacing: "0.18em",
      fontSize: 11,
    },
    dark: true,
  },
  "t04-neon": {
    fonts: TEMPLATE_FONTS["t04-neon"],
    bg: "#070912",
    text: "#e8ecff",
    border: "rgba(232,236,255,.14)",
    radius: 10,
    button: {
      background: "var(--sf-accent, #00e5ff)",
      color: "var(--sf-accent-fg, #000)",
      fontWeight: 700,
      boxShadow: "0 0 18px color-mix(in srgb, var(--sf-accent, #00e5ff) 55%, transparent)",
    },
    dark: true,
  },
  "t05-playful": {
    fonts: TEMPLATE_FONTS["t05-playful"],
    bg: "#fff6ec",
    text: "#3a2b20",
    border: "rgba(58,43,32,.14)",
    radius: 18,
    button: {
      background: "var(--sf-accent, #ff5fa2)",
      color: "var(--sf-accent-fg, #fff)",
      fontWeight: 800,
      borderRadius: 999,
    },
    dark: false,
  },
  "t06-magazine": {
    fonts: TEMPLATE_FONTS["t06-magazine"],
    bg: "#fbfaf8",
    text: "#111",
    border: "rgba(17,17,17,.14)",
    radius: 0,
    button: {
      background: "#111",
      color: "#fbfaf8",
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      fontSize: 12,
    },
    dark: false,
  },
  "t07-drop": {
    fonts: TEMPLATE_FONTS["t07-drop"],
    bg: "#050505",
    text: "#f5f5f5",
    border: "rgba(245,245,245,.14)",
    radius: 2,
    button: {
      background: "var(--sf-accent, #ccff00)",
      color: "var(--sf-accent-fg, #000)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontWeight: 800,
    },
    dark: true,
  },
  "t08-market": {
    fonts: TEMPLATE_FONTS["t08-market"],
    bg: "#faf4ec",
    text: "#2b2419",
    border: "rgba(43,36,25,.16)",
    radius: 10,
    button: {
      background: "var(--sf-accent, #e07b39)",
      color: "var(--sf-accent-fg, #fff)",
      fontWeight: 700,
    },
    dark: false,
  },
  "t09-boutique": {
    fonts: TEMPLATE_FONTS["t09-boutique"],
    bg: "#f7f1ee",
    text: "#3e3733",
    border: "rgba(62,55,51,.14)",
    radius: 8,
    button: {
      background: "#3e3733",
      color: "#f7f1ee",
      letterSpacing: "0.08em",
      fontSize: 13,
    },
    dark: false,
  },
  "t10-typo": {
    fonts: TEMPLATE_FONTS["t10-typo"],
    bg: "#f2efe9",
    text: "#171512",
    border: "rgba(23,21,18,.16)",
    radius: 0,
    button: {
      background: "#171512",
      color: "#f2efe9",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      fontSize: 12,
    },
    dark: false,
  },
};

export function getChrome(id: string): TemplateChrome {
  return CHROME[id] ?? CHROME["t01-editorial"];
}
