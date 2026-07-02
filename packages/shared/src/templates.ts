// Template registry — PURE, no deps. Shared between web (template picker + resolver)
// and mobile (CustomizeSheet template carousel). IDs are stable — never rename them.

export type TemplateMeta = {
  id: string;
  name: string;
  blurb: string;
};

export const STOREFRONT_TEMPLATES: TemplateMeta[] = [
  { id: "t01-editorial", name: "Editorial",  blurb: "Clean editorial layout with hero, featured rail, and discover bento" },
  { id: "t02-brutalist", name: "Brutalist",  blurb: "Raw black-border grid, uppercase type, zero border-radius, bold accent bars" },
  { id: "t03-luxe",      name: "Luxe",       blurb: "Warm serif luxury — thin dividers, generous whitespace, centered elegance" },
  { id: "t04-neon",      name: "Neon",       blurb: "Dark background with glowing accent borders and neon-wash product cards" },
  { id: "t05-playful",   name: "Playful",    blurb: "Bubbly rounded cards, candy accent patches, fun typography" },
  { id: "t06-magazine",  name: "Magazine",   blurb: "Editorial feature grid — first product spans full-width like a cover story" },
  { id: "t07-drop",      name: "Drop",       blurb: "Single-hero full-bleed drop page — cinematic product moment, strip below" },
  { id: "t08-market",    name: "Market",     blurb: "Dense 4-column marketplace grid, compact cards, filter-bar header" },
  { id: "t09-boutique",  name: "Boutique",   blurb: "Maximum whitespace, large square images, one or two columns, minimal chrome" },
  { id: "t10-typo",      name: "Typography", blurb: "Products as giant type — name at 8vw, price right-aligned, dividers only" },
];

export const DEFAULT_TEMPLATE: string = STOREFRONT_TEMPLATES[0].id;

export function resolveTemplateId(v: unknown): string {
  return STOREFRONT_TEMPLATES.some((t) => t.id === v) ? (v as string) : DEFAULT_TEMPLATE;
}
