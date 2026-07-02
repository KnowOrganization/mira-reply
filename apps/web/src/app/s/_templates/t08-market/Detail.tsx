// t08-market Detail — marketplace product page: image gallery left, buy box right.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { DetailProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();

export default function Detail({ config, product, more, slug }: DetailProps) {
  const images = [product.imageUrl, ...(product.images || [])].filter(Boolean).slice(0, 4);

  return (
    <div style={{
      ["--sf-accent" as string]: config.accent,
      ["--sf-accent-fg" as string]: config.accentFg,
      ["--sf-accent-soft" as string]: `${config.accent}18`,
      background: "#f0f2f5", color: "#0f1111", minHeight: "100vh",
      fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    } as React.CSSProperties}>
      <style>{`@media (max-width: 820px) { .mkt-det { grid-template-columns: 1fr !important; } }`}</style>

      <header style={{ background: "var(--sf-accent)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/s/${slug}`} style={{ fontSize: 16, fontWeight: 800, color: "var(--sf-accent-fg)", textDecoration: "none" }}>{config.title}</Link>
          <span style={{ color: "var(--sf-accent-fg)", opacity: 0.6, fontSize: 13 }}>/ {product.title}</span>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "16px auto", padding: "0 16px" }}>
        <div style={{ background: "#fff", borderRadius: 8, padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }} className="mkt-det">
          {/* image + thumbnails */}
          <div>
            <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "#f7f8fa", borderRadius: 6, marginBottom: 10 }}>
              <StoreImage src={product.imageUrl} alt={product.title} monogram={monogram(product.title)} eager style={{ width: "100%", height: "100%" }} />
            </div>
            {images.length > 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {images.slice(1).map((url, i) => (
                  <div key={i} style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "#f7f8fa", borderRadius: 4, border: "1px solid #e0e0e0" }}>
                    <StoreImage src={url} alt={`${product.title} ${i + 2}`} monogram={monogram(product.title)} style={{ width: "100%", height: "100%" }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* buy box */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {product.subtitle && <div style={{ fontSize: 12, color: "var(--sf-accent)" }}>{product.subtitle}</div>}
            <h1 style={{ fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 700, lineHeight: 1.25, margin: 0 }}>{product.title}</h1>
            {/* stars */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 13, color: n <= 4 ? "#e47911" : "#ddd" }}>★</span>)}
              <span style={{ fontSize: 12, color: "#888" }}>4.2 (24 reviews)</span>
            </div>
            <div style={{ height: 1, background: "#e8e8e8" }} />
            {product.priceText && (
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#0f1111" }}>{product.priceText}</div>
                <div style={{ fontSize: 12, color: "#888" }}>Inclusive of all taxes</div>
              </div>
            )}
            {product.description && <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#333", margin: 0 }}>{product.description}</p>}
            <div style={{ height: 1, background: "#e8e8e8" }} />
            <AddToCart product={product} config={config} slug={slug} />
          </div>
        </div>

        {more.length > 0 && (
          <div style={{ marginTop: 16, background: "#fff", borderRadius: 8, padding: "16px 20px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Customers also viewed</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(more.length, 5)}, 1fr)`, gap: 10 }}>
              {more.map((p: SfProduct) => (
                <Link key={p.id} href={`/s/${slug}/p/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "#f7f8fa", borderRadius: 4, marginBottom: 6 }}>
                    <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.3 }}>{p.title}</div>
                  {p.priceText && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{p.priceText}</div>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer style={{ background: "var(--sf-accent)", marginTop: 16, padding: "14px 16px", textAlign: "center", fontSize: 11, color: "var(--sf-accent-fg)", opacity: 0.85 }}>
        Powered by Mira
      </footer>
    </div>
  );
}
