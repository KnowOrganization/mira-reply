// Self-test for applyCartItems — pure, no DB needed.
// Run: bun packages/db/src/cart-check.ts  (DATABASE_URL can be anything; no query fires)
//
// Tests the money-critical computation path: unknown/unavailable/null-price
// items MUST be skipped; amounts MUST be server-computed from DB prices (qty
// from client, price from DB — client never dictates the per-unit amount).

// Simulate loading the pure helper. Import the compiled module via @shaiz/db
// so we test the actual exported function, not a copy.
import { applyCartItems } from "./repos";

const prods = [
  { id: "p1", available: true,  priceMinor: 100,  currency: "INR", title: "Shirt",  variants: [] },
  { id: "p2", available: false, priceMinor: 200,  currency: "INR", title: "Skirt",  variants: [] }, // unavailable — skip
  { id: "p3", available: true,  priceMinor: null, currency: "INR", title: "Belt",   variants: [] }, // no price — skip
  { id: "p4", available: true,  priceMinor: 50,   currency: "INR", title: "Socks",  variants: [{ id: "v1", label: "Red S" }] },
];

const items = [
  { productId: "p1", qty: 3 },                      // 3 × 100 = 300 paise
  { productId: "p2", qty: 1 },                      // unavailable — must skip
  { productId: "p3", qty: 1 },                      // null priceMinor — must skip
  { productId: "ghost", qty: 5 },                   // unknown id — must skip
  { productId: "p4", qty: 2, variantId: "v1" },    // 2 × 50 = 100 paise, variant label "Red S"
];

const r = applyCartItems(prods, items);

let passed = true;

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error("FAIL:", msg); passed = false; }
}

assert(r.amountTotal === 400,       `total: expected 400 paise got ${r.amountTotal}`);
assert(r.currency === "INR",        `currency: expected INR got ${r.currency}`);
assert(r.lineItems.length === 2,    `lineItems.length: expected 2 got ${r.lineItems.length}`);

const line1 = r.lineItems[0];
assert(line1.productId === "p1",    `line1.productId: expected p1 got ${line1.productId}`);
assert(line1.qty === 3,             `line1.qty: expected 3 got ${line1.qty}`);
assert(line1.priceMinor === 100,    `line1.priceMinor: expected 100 got ${line1.priceMinor}`);
assert(line1.titleSnapshot === "Shirt", `line1.title: expected Shirt got ${line1.titleSnapshot}`);

const line2 = r.lineItems[1];
assert(line2.productId === "p4",        `line2.productId: expected p4 got ${line2.productId}`);
assert(line2.variantLabel === "Red S",  `line2.variantLabel: expected "Red S" got ${line2.variantLabel}`);
assert(line2.qty === 2,                 `line2.qty: expected 2 got ${line2.qty}`);

// Edge: empty cart → amountTotal 0, empty lineItems
const empty = applyCartItems(prods, []);
assert(empty.amountTotal === 0,    `empty.amountTotal: expected 0`);
assert(empty.lineItems.length === 0, `empty.lineItems: expected 0`);

// Edge: qty < 1 should be clamped to 1
const clamped = applyCartItems(prods, [{ productId: "p1", qty: 0 }]);
assert(clamped.lineItems[0].qty === 1, `clamped qty: expected 1 got ${clamped.lineItems[0].qty}`);
assert(clamped.amountTotal === 100,    `clamped total: expected 100 got ${clamped.amountTotal}`);

if (passed) {
  console.log("computeCartTotal (applyCartItems) self-test PASSED —", r);
} else {
  process.exit(1);
}
