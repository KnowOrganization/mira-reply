// DM marketplace — product retrieval + grounding for the brain.
//
// PURE + in-memory: operates on the already-loaded store.products (no DB hit, no
// accountId — tenant is pinned by the store the caller loaded). The brain decides
// have-it / don't-have-it in WORDS from the block below; it can ONLY name products
// that appear here. A truthful miss ("don't carry that") is safe; a fuzzy
// false-yes is the failure we avoid — so matching is conservative keyword/alias.
import type { Product } from "./store";

export type CatalogIntent = "ask_specific" | "ask_catalog" | "none";

// Whole-catalog asks ("what do you sell", "show everything") — checked first.
const CATALOG_RE = /\b(catalog|catalogue|everything|full list|price list|all (your )?products?|what do you (have|sell|offer)|menu|kya milta|list bhejo|sab dikha)\b/i;
// Specific-product asks ("do you have X", "price of X", "got any X").
const SPECIFIC_RE = /\b(do you (have|sell|carry|stock)|got any|have you got|is there|available|in stock|price of|how much|kitne? ka|kitna|carry|stock)\b/i;

export function catalogIntent(text: string): CatalogIntent {
  const t = text || "";
  if (CATALOG_RE.test(t)) return "ask_catalog";
  if (SPECIFIC_RE.test(t)) return "ask_specific";
  return "none";
}

function tokens(s: string): string[] {
  return (s || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** Conservative keyword/alias match against title + aliases. Returns the best
 *  product or null. No embeddings (deferred) — a miss is safe, a false-yes isn't. */
export function lookupProducts(products: Product[], text: string): { match: Product | null; found: boolean } {
  const q = (text || "").toLowerCase();
  const qTokens = tokens(text);
  let best: Product | null = null;
  let bestScore = 0;
  for (const p of products) {
    let score = 0;
    const title = (p.title || "").toLowerCase();
    if (title && q.includes(title)) score += 10;                  // full title in the query
    for (const a of p.aliases || []) {
      const al = a.toLowerCase();
      if (al && q.includes(al)) score += 8;                       // full alias in the query
    }
    const hay = new Set(tokens([p.title, ...(p.aliases || [])].join(" ")));
    for (const t of qTokens) if (t.length >= 3 && hay.has(t)) score += 2; // token overlap
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return bestScore >= 2 ? { match: best, found: true } : { match: null, found: false };
}

const CLOSED_SET_RULE =
  "STORE RULE: you ONLY sell the products listed in the PRODUCT section below. " +
  "Anything not listed there, you do NOT carry — say so honestly and never invent a product, price, or buy-link. " +
  "Never make up stock you don't have.";

function priceOf(p: Product): string {
  return p.priceText?.trim() || "price on request";
}

/** Grounding block injected into the DM system prompt. Returns "" when there's
 *  nothing relevant (intent none, or specific-ask with no products at all). */
export function catalogBlock(intent: CatalogIntent, match: Product | null, products: Product[]): string {
  const available = products.filter((p) => p.available);

  if (intent === "ask_catalog") {
    if (!available.length) {
      return `${CLOSED_SET_RULE}\n\nPRODUCT: you have no products listed right now — tell them honestly you don't have a catalog up yet.`;
    }
    const lines = available.slice(0, 20).map((p) => {
      const link = p.ctaUrl?.trim() ? ` — ${p.ctaUrl.trim()}` : "";
      return `- ${p.title} — ${priceOf(p)}${link}`;
    });
    return `${CLOSED_SET_RULE}\n\nYOUR CATALOG (the ONLY products you sell — present these, don't invent others):\n${lines.join("\n")}`;
  }

  if (intent === "ask_specific") {
    if (match) {
      const link = match.ctaUrl?.trim() ? ` Buy link: ${match.ctaUrl.trim()}` : "";
      const stock = match.available
        ? `IN STOCK — ${priceOf(match)}.${link} If they want it, share the link warmly.`
        : `OUT OF STOCK right now — be honest it's currently sold out; offer to show what else you have.`;
      return `${CLOSED_SET_RULE}\n\nPRODUCT MATCH (you DO carry this): ${match.title} — ${stock}`;
    }
    // asked about a specific item we don't carry
    return `${CLOSED_SET_RULE}\n\nPRODUCT MATCH: none — you do NOT carry what they're asking about. Say so honestly and (if natural) offer to show what you do have. Do NOT invent a product.`;
  }

  return "";
}
