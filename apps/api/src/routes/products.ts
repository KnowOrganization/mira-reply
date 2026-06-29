// CRUD /api/ig/products[/:id] — DM marketplace catalog, scoped to the logged-in
// account. Checkout is link-out only (ctaUrl); Mira never processes payment.
import { Elysia } from "elysia";
import {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
} from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

// imageUrl / ctaUrl must be absolute https when provided (carousel + link-out
// require https; also a minimal guard against javascript:/data: and http.).
function badUrl(v: unknown): boolean {
  if (v == null || v === "") return false; // empty allowed
  if (typeof v !== "string") return true;
  try {
    const u = new URL(v);
    return u.protocol !== "https:";
  } catch {
    return true;
  }
}
function urlErrors(b: Record<string, any>): string | null {
  if (badUrl(b.imageUrl)) return "imageUrl must be a valid https URL";
  if (badUrl(b.ctaUrl)) return "ctaUrl must be a valid https URL";
  return null;
}

export const productsRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/products", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { products: await listProducts(auth.accountId) };
  }, { auth: true })
  .post("/api/ig/products", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as Record<string, any>;
    if (!b.title || !String(b.title).trim()) { set.status = 400; return { error: "title required" }; }
    const ue = urlErrors(b);
    if (ue) { set.status = 400; return { error: ue }; }
    const product = await createProduct(auth.accountId, b as any);
    set.status = 201;
    return { product };
  }, { requireRole: "agent" })
  .get("/api/ig/products/:id", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const product = await getProduct(auth.accountId, params.id);
    if (!product) { set.status = 404; return { error: "not found" }; }
    return { product };
  }, { auth: true })
  .patch("/api/ig/products/:id", async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as Record<string, any>;
    const ue = urlErrors(b);
    if (ue) { set.status = 400; return { error: ue }; }
    const product = await updateProduct(auth.accountId, params.id, b as any);
    if (!product) { set.status = 404; return { error: "not found" }; }
    return { product };
  }, { requireRole: "agent" })
  .delete("/api/ig/products/:id", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const ok = await deleteProduct(auth.accountId, params.id);
    if (!ok) { set.status = 404; return { error: "not found" }; }
    return { ok: true };
  }, { requireRole: "agent" });
