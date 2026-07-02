// Demo data entry point for /s/preview/[template].
// getDemoSet(id) returns the per-template curated catalog from ./sets/*,
// falling back to the shared Aurora Goods set for unknown ids.
// Keep this file import-stable: batch work only ever edits ./sets/t0X-*.ts.
import { FALLBACK_SET, type DemoSet } from "./fallback";

import t01 from "./sets/t01-editorial";
import t02 from "./sets/t02-brutalist";
import t03 from "./sets/t03-luxe";
import t04 from "./sets/t04-neon";
import t05 from "./sets/t05-playful";
import t06 from "./sets/t06-magazine";
import t07 from "./sets/t07-drop";
import t08 from "./sets/t08-market";
import t09 from "./sets/t09-boutique";
import t10 from "./sets/t10-typo";

const SETS: Record<string, DemoSet> = {
  "t01-editorial": t01,
  "t02-brutalist": t02,
  "t03-luxe": t03,
  "t04-neon": t04,
  "t05-playful": t05,
  "t06-magazine": t06,
  "t07-drop": t07,
  "t08-market": t08,
  "t09-boutique": t09,
  "t10-typo": t10,
};

export function getDemoSet(templateId: string): DemoSet {
  return SETS[templateId] ?? FALLBACK_SET;
}

export { DEMO_SETTINGS, DEMO_PRODUCTS, FALLBACK_SET } from "./fallback";
export type { DemoSet } from "./fallback";
