// Public storefront — mira.<domain>/s/<slug>. Server Component, request-time
// fetch from the (public, field-whitelisted) Elysia /api/store/:slug. No auth,
// no app shell. The destination of "View" buttons sent in DM carousels; also the
// desktop/out-of-window fallback (carousels are mobile-only).
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type StoreProduct = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  priceText: string | null;
  imageUrl: string | null;
  ctaUrl: string | null;
  slug: string | null;
};
type StoreData = { store: { title: string; slug: string }; products: StoreProduct[] };

async function fetchStore(slug: string): Promise<StoreData | null> {
  const base = process.env.API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${base}/api/store/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as StoreData;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchStore(slug);
  return { title: data ? `${data.store.title} · Shop` : "Shop" };
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchStore(slug);
  if (!data) notFound();

  const { store, products } = data;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-frame)", color: "var(--text)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 20px 80px" }}>
        <header style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-subtle)" }}>Shop</div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", margin: "4px 0 0" }}>{store.title}</h1>
          <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>{products.length} {products.length === 1 ? "product" : "products"}</div>
        </header>

        {products.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-subtle)", fontSize: 14 }}>Nothing here yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {products.map((p) => (
              <article
                key={p.id}
                id={`p-${p.slug || p.id}`}
                style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", scrollMarginTop: 24 }}
              >
                <div style={{ aspectRatio: "1 / 1", background: "var(--bg-inset)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: "var(--text-subtle)", fontSize: 13 }}>No image</span>}
                </div>
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>{p.title}</h2>
                    {p.priceText && <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>{p.priceText}</span>}
                  </div>
                  {p.subtitle && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.subtitle}</div>}
                  {p.description && <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, margin: "2px 0 0" }}>{p.description}</p>}
                  {p.ctaUrl && (
                    <a
                      href={p.ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      style={{ marginTop: "auto", paddingTop: 12, display: "block" }}
                    >
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 38, borderRadius: 9, background: "var(--accent)", color: "var(--accent-fg)", fontSize: 13.5, fontWeight: 600 }}>
                        Buy
                      </span>
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <footer style={{ marginTop: 48, fontSize: 11.5, color: "var(--text-subtle)", textAlign: "center" }}>
          Powered by Mira
        </footer>
      </div>
    </main>
  );
}
