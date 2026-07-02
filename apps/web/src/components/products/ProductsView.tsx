"use client";
// Store — DM marketplace catalog management + storefront customizer. Products
// feed the brain ("do you have X?") and the DM carousel; the storefront is the
// public /s/<slug> site. The customizer live-preview renders the SAME template
// the public page uses (preview == production by construction via REGISTRY).
import { useState, useEffect, useRef } from "react";
import { Plus, ShoppingBag, Trash2, X, Pencil, ExternalLink, AlertTriangle, Star, Check, Smartphone, Monitor } from "lucide-react";
import {
  useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useIgSettings, usePatchIgSettings, useOrders,
  type Product, type OrderApi,
} from "../../lib/api/hooks";
import { Modal, IconButton, Segmented } from "../ui";
import {
  resolveStorefrontConfig, type StorefrontSettingsInput,
  STOREFRONT_TEMPLATES, DEFAULT_TEMPLATE,
} from "@shaiz/shared";
import { getTemplate, type SfProduct } from "../../app/s/_templates/registry";

/** Per-template accent colours — visual distinction in the gallery cards. */
const TEMPLATE_ACCENTS: Record<string, string> = {
  "t01-editorial": "#4f6bed",
  "t02-brutalist": "#18181b",
  "t03-luxe":      "#c9a96e",
  "t04-neon":      "#00e5ff",
  "t05-playful":   "#f43f5e",
  "t06-magazine":  "#0891b2",
  "t07-drop":      "#a855f7",
  "t08-market":    "#f59e0b",
  "t09-boutique":  "#71717a",
  "t10-typo":      "#3b3b3b",
};

type StorefrontSettings = StorefrontSettingsInput & {
  storefrontSlug?: string; storefrontEnabled?: boolean; storefrontTitle?: string;
};
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const toSf = (p: Product): SfProduct => ({
  id: p.id, title: p.title, subtitle: p.subtitle || null, description: p.description || null,
  priceText: p.priceText, priceMinor: p.priceMinor ?? null, currency: p.currency ?? "INR",
  imageUrl: p.imageUrl, images: [], available: p.available, ctaUrl: p.ctaUrl, slug: p.slug,
});

type Draft = Partial<Product> & { aliasesText?: string; priceRupees?: string };
function toDraft(p?: Product): Draft {
  return p
    ? {
        ...p,
        aliasesText: (p.aliases ?? []).join(", "),
        priceRupees: p.priceMinor != null ? String(p.priceMinor / 100) : "",
      }
    : { title: "", subtitle: "", description: "", priceText: "", imageUrl: "", ctaUrl: "", available: true, aliasesText: "", priceRupees: "" };
}

export function ProductsView() {
  const [tab, setTab] = useState<"products" | "storefront" | "orders">("products");
  const settingsQ = useIgSettings<StorefrontSettings>();
  const s = settingsQ.data ?? {};

  return (
    <div className="h-full flex flex-col min-h-0" style={{ background: "var(--bg-frame)" }}>
      <div className="px-6 pt-5 pb-2 flex items-center gap-3 shrink-0">
        <span className="text-[15px] font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>Store</span>
        <Segmented
          options={[
            { id: "products", label: "Products" },
            { id: "storefront", label: "Storefront" },
            { id: "orders", label: "Orders" },
          ]}
          value={tab}
          onChange={(t) => setTab(t as typeof tab)}
        />
      </div>
      <PublishBar s={s} />
      {tab === "products" && <ProductsTab featuredIds={s.storefrontFeaturedIds ?? []} />}
      {tab === "storefront" && <StorefrontTab settings={s} />}
      {tab === "orders" && <OrdersTab />}
    </div>
  );
}

// ── publish bar ────────────────────────────────────────────────────────────────
function PublishBar({ s }: { s: StorefrontSettings }) {
  const patch = usePatchIgSettings();
  const [slug, setSlug] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const prevStatus = useRef(patch.status);
  const value = slug ?? s.storefrontSlug ?? "";
  const enabled = !!s.storefrontEnabled;
  const base = (process.env.NEXT_PUBLIC_BASE_URL as string | undefined)?.replace(/\/$/, "") || "";
  const liveUrl = enabled && value ? `${base}/s/${value}` : null;

  // Show "Live now" pill for 3 s after each successful save
  useEffect(() => {
    if (prevStatus.current === "pending" && patch.status === "success") {
      setJustSaved(true);
    }
    prevStatus.current = patch.status;
  }, [patch.status]);
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(t);
  }, [justSaved]);

  return (
    <div className="mx-6 mb-3 px-4 py-2.5 rounded-xl flex flex-wrap items-center gap-3"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--text-subtle)" }}>Live at</span>
      <div className="flex items-center gap-1 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
        <span>/s/</span>
        <input value={value} onChange={(e) => setSlug(slugify(e.target.value))}
          onBlur={() => { if (slug !== null && slug !== (s.storefrontSlug ?? "")) patch.mutate({ storefrontSlug: slug }); }}
          placeholder="your-shop" className="rounded-md px-2 py-1 text-[12.5px] outline-none"
          style={{ background: "var(--bg-inset)", color: "var(--text)", border: "1px solid var(--border)", width: 150 }} />
      </div>
      <button onClick={() => patch.mutate({ storefrontEnabled: !enabled })}
        className="text-[11px] font-medium px-2 py-1 rounded-md"
        style={enabled
          ? { background: "var(--accent-soft)", color: "var(--accent-deep)" }
          : { background: "var(--bg-inset)", color: "var(--text-subtle)" }}>
        {enabled ? "Published" : "Unpublished"}
      </button>
      {patch.isPending && (
        <span className="text-[11px] animate-pulse" style={{ color: "var(--text-subtle)" }}>Publishing…</span>
      )}
      {!patch.isPending && justSaved && liveUrl && (
        <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
          <Check size={11} /> Live now
        </span>
      )}
      {liveUrl && (
        <a href={liveUrl} target="_blank" rel="noopener noreferrer"
          className="ml-auto text-[11.5px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
          View shop <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}

// ── products tab ──────────────────────────────────────────────────────────────
function ProductsTab({ featuredIds }: { featuredIds: string[] }) {
  const list = useProducts();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const del = useDeleteProduct();
  const patch = usePatchIgSettings();
  const [editing, setEditing] = useState<Draft | null>(null);
  const products = list.data?.products ?? [];

  const toggleFeatured = (id: string) => {
    const next = featuredIds.includes(id) ? featuredIds.filter((x) => x !== id) : [...featuredIds, id];
    patch.mutate({ storefrontFeaturedIds: next });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pb-3 flex items-center gap-2.5 shrink-0">
        <span className="text-[11px] tabular-nums" style={{ color: "var(--text-subtle)" }}>{products.length} products</span>
        <button onClick={() => setEditing(toDraft())}
          className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-fg)", boxShadow: "var(--shadow-card)" }}>
          <Plus size={15} strokeWidth={2.4} /> Add product
        </button>
      </div>

      {list.isError && (
        <div className="px-6 py-8 text-[12px] flex items-center gap-2" style={{ color: "#ef4444" }}>
          <AlertTriangle size={15} /> Failed to load. <button className="underline" onClick={() => list.refetch()}>Retry</button>
        </div>
      )}
      {!list.isError && products.length === 0 && !list.isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-inset)" }}>
            <ShoppingBag size={16} style={{ color: "var(--text-subtle)" }} />
          </div>
          <div className="text-[12.5px] font-medium" style={{ color: "var(--text)" }}>No products yet</div>
          <div className="text-[11.5px] max-w-xs" style={{ color: "var(--text-subtle)" }}>
            Add what you sell. Mira answers &quot;do you have X?&quot; from this list and can send it as a card carousel in DMs.
          </div>
          <button onClick={() => setEditing(toDraft())}
            className="mt-2 flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
            <Plus size={15} strokeWidth={2.4} /> Add your first product
          </button>
        </div>
      )}

      {(products.length > 0 || list.isLoading) && (
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
            {list.isLoading && products.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl animate-pulse" style={{ background: "var(--bg-inset)", aspectRatio: "4 / 5" }} />
                ))
              : products.map((p) => (
                  <AdminProductCard key={p.id} p={p}
                    featured={featuredIds.includes(p.id)}
                    onToggleFeatured={() => toggleFeatured(p.id)}
                    onEdit={() => setEditing(toDraft(p))}
                    onToggleAvailable={() => update.mutate({ id: p.id, available: !p.available })}
                    onDelete={() => { if (confirm(`Delete "${p.title}"?`)) del.mutate(p.id); }} />
                ))}
          </div>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} width={560}>
        {editing && (
          <ProductEditor
            draft={editing}
            saving={create.isPending || update.isPending}
            error={(create.error as Error)?.message || (update.error as Error)?.message || null}
            onClose={() => setEditing(null)}
            onSave={async (d) => {
              const aliases = (d.aliasesText ?? "").split(",").map((x) => x.trim()).filter(Boolean);
              const rupeesStr = (d.priceRupees ?? "").trim();
              const rupees = rupeesStr ? parseFloat(rupeesStr) : NaN;
              const priceMinor = !isNaN(rupees) && rupees >= 0 ? Math.round(rupees * 100) : null;
              const body = {
                title: (d.title ?? "").trim(),
                subtitle: (d.subtitle ?? "").trim(),
                description: (d.description ?? "").trim(),
                priceText: (d.priceText ?? "").trim() || null,
                priceMinor,
                currency: d.currency ?? "INR",
                imageUrl: (d.imageUrl ?? "").trim() || null,
                ctaUrl: (d.ctaUrl ?? "").trim() || null,
                available: d.available ?? true,
                aliases,
              };
              try {
                if (d.id) await update.mutateAsync({ id: d.id, ...body });
                else await create.mutateAsync(body as Parameters<typeof create.mutateAsync>[0]);
                setEditing(null);
              } catch { /* error surfaced in modal */ }
            }} />
        )}
      </Modal>
    </div>
  );
}

function AdminProductCard({ p, featured, onToggleFeatured, onEdit, onToggleAvailable, onDelete }: {
  p: Product; featured: boolean; onToggleFeatured: () => void; onEdit: () => void;
  onToggleAvailable: () => void; onDelete: () => void;
}) {
  return (
    <div className="group rounded-xl overflow-hidden flex flex-col transition-all duration-100"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", opacity: p.available ? 1 : 0.55 }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}>
      <div style={{ aspectRatio: "4 / 5", position: "relative", background: "var(--bg-inset)" }}>
        {p.imageUrl
          ? <img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => (e.currentTarget.style.display = "none")} />
          : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><ShoppingBag size={22} style={{ color: "var(--text-subtle)" }} /></div>}
        <button onClick={onToggleFeatured} title={featured ? "Unfeature" : "Feature on storefront"}
          className="absolute top-1.5 left-1.5 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <Star size={13} style={{ color: featured ? "#f5a623" : "var(--text-subtle)" }} fill={featured ? "#f5a623" : "none"} />
        </button>
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span style={{ background: "var(--bg)" }} className="rounded-lg"><IconButton size={26} title="Edit" onClick={onEdit}><Pencil size={12} /></IconButton></span>
          <span style={{ background: "var(--bg)" }} className="rounded-lg"><IconButton size={26} title="Delete" onClick={onDelete}><Trash2 size={12} /></IconButton></span>
        </div>
        {!p.available && <span className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Hidden</span>}
      </div>
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium truncate flex-1" style={{ color: "var(--text)" }}>{p.title}</span>
          {p.priceText && <span className="text-[11.5px] font-semibold tabular-nums shrink-0" style={{ color: "var(--text)" }}>{p.priceText}</span>}
        </div>
        <button onClick={onToggleAvailable} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md self-start"
          style={p.available
            ? { background: "var(--accent-soft)", color: "var(--accent-deep)" }
            : { background: "var(--bg-inset)", color: "var(--text-subtle)" }}>
          {p.available ? "Available" : "Hidden"}
        </button>
      </div>
    </div>
  );
}

// ── storefront customizer tab ─────────────────────────────────────────────────
const PRESET_ACCENTS = ["#4f6bed", "#0f172a", "#e11d48", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2", "#db2777"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;

function StorefrontTab({ settings }: { settings: StorefrontSettings }) {
  const list = useProducts();
  const patch = usePatchIgSettings();
  const products = list.data?.products ?? [];
  const [local, setLocal] = useState<Partial<StorefrontSettings>>({});
  const eff = { ...settings, ...local } as StorefrontSettings;
  const [device, setDevice] = useState<"phone" | "desktop">("phone");

  const setText = (k: keyof StorefrontSettings, v: string) => setLocal((l) => ({ ...l, [k]: v }));
  const commit = (k: keyof StorefrontSettings) => {
    const v = (local as Record<string, unknown>)[k as string];
    if (v !== undefined && v !== (settings as Record<string, unknown>)[k as string]) patch.mutate({ [k]: v });
  };
  const setNow = (obj: Partial<StorefrontSettings>) => { setLocal((l) => ({ ...l, ...obj })); patch.mutate(obj); };

  const productLites = products.map((p) => ({ id: p.id, available: p.available, imageUrl: p.imageUrl, priceMinor: p.priceMinor ?? null }));
  const config = resolveStorefrontConfig(eff as StorefrontSettingsInput, productLites);
  const sfProducts = products.filter((p) => p.available).map(toSf);
  const featuredIds = eff.storefrontFeaturedIds ?? config.featuredIds;

  const activeTemplateId = eff.storefrontTemplate ?? DEFAULT_TEMPLATE;
  const Template = getTemplate(activeTemplateId);

  // When no template has been explicitly chosen, show the gallery-first picker.
  const hasTemplate = !!eff.storefrontTemplate;
  const base = (process.env.NEXT_PUBLIC_BASE_URL as string | undefined)?.replace(/\/$/, "") || "";

  if (!hasTemplate) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="px-8 pt-8 pb-4">
          <div className="text-[18px] font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.03em" }}>
            Pick a template to start
          </div>
          <div className="text-[12.5px] mt-1" style={{ color: "var(--text-subtle)", lineHeight: 1.6 }}>
            Browse all 10 designs. Click &ldquo;Preview&rdquo; to see a live demo, then &ldquo;Use this&rdquo; to select it.
          </div>
        </div>
        <div className="px-8 pb-10 grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
          {STOREFRONT_TEMPLATES.map((t) => (
            <div key={t.id}
              className="flex flex-col gap-2 p-3.5 rounded-xl"
              style={{ border: "1.5px solid var(--border)", background: "var(--bg-elev)" }}>
              {/* Swatch + name */}
              <div className="flex items-center gap-2">
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  background: TEMPLATE_ACCENTS[t.id] ?? "var(--accent)",
                }} />
                <span className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>{t.name}</span>
              </div>
              {/* Blurb */}
              <span className="text-[11.5px]" style={{ color: "var(--text-subtle)", lineHeight: 1.5 }}>
                {t.blurb}
              </span>
              {/* Action row */}
              <div className="flex gap-1.5 mt-0.5">
                <a
                  href={`${base}/s/preview/${t.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-[11.5px] font-medium h-8 flex items-center justify-center rounded-lg"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)", textDecoration: "none" }}>
                  Preview <ExternalLink size={10} className="ml-1" />
                </a>
                <button
                  onClick={() => setNow({ storefrontTemplate: t.id })}
                  className="flex-1 text-[11.5px] font-semibold h-8 rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
                  Use this
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex" style={{ borderTop: "1px solid var(--border)" }}>
      {/* ── controls ── */}
      <div className="w-[360px] shrink-0 overflow-y-auto p-5 flex flex-col gap-5" style={{ borderRight: "1px solid var(--border)" }}>

        {/* Template picker */}
        <Group label="Template" hint="Pick a visual style — the live preview on the right updates instantly.">
          <div className="flex flex-col gap-1.5">
            {STOREFRONT_TEMPLATES.map((t) => {
              const active = activeTemplateId === t.id;
              return (
                <div key={t.id}
                  className="rounded-lg transition-all"
                  style={{
                    background: active ? "var(--accent-soft)" : "var(--bg-inset)",
                    border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  }}>
                  <button
                    onClick={() => setNow({ storefrontTemplate: t.id })}
                    className="w-full text-left px-3 pt-2.5 pb-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-semibold"
                        style={{ color: active ? "var(--accent-deep)" : "var(--text)" }}>{t.name}</span>
                      {active && <Check size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                    </div>
                    <span className="text-[11px] block mt-0.5" style={{ color: "var(--text-subtle)" }}>{t.blurb}</span>
                  </button>
                  {/* Preview full page link — visible for every template */}
                  <a
                    href={`${base}/s/preview/${t.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 pb-2 text-[10.5px]"
                    style={{ color: active ? "var(--accent)" : "var(--text-subtle)", textDecoration: "none" }}
                    onClick={(e) => e.stopPropagation()}>
                    Preview full page <ExternalLink size={9} />
                  </a>
                </div>
              );
            })}
          </div>
        </Group>

        {/* Checkout */}
        <Group label="Checkout">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.05em]" style={{ color: "var(--text-subtle)" }}>Currency</span>
              <div className="flex gap-1 ml-auto">
                {CURRENCIES.map((c) => (
                  <button key={c} onClick={() => setNow({ storefrontCurrency: c })}
                    className="text-[11px] font-medium px-2 py-1 rounded-md"
                    style={(eff.storefrontCurrency ?? "INR") === c
                      ? { background: "var(--accent-soft)", color: "var(--accent-deep)" }
                      : { background: "var(--bg-inset)", color: "var(--text-subtle)" }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <Toggle label="Enable card checkout (Razorpay)" on={!!eff.storefrontCheckoutEnabled}
              onChange={(v) => setNow({ storefrontCheckoutEnabled: v })} />
          </div>
        </Group>

        {/* Hero */}
        <Group label="Hero">
          <Field label="Headline">
            <input value={eff.storefrontHeroHeadline ?? ""}
              onChange={(e) => setText("storefrontHeroHeadline", e.target.value)}
              onBlur={() => commit("storefrontHeroHeadline")}
              placeholder={config.title} style={inputStyle} />
          </Field>
          <Field label="Tagline">
            <input value={eff.storefrontHeroTagline ?? ""}
              onChange={(e) => setText("storefrontHeroTagline", e.target.value)}
              onBlur={() => commit("storefrontHeroTagline")}
              placeholder="One line about your shop" style={inputStyle} />
          </Field>
          <Field label="Hero image URL" hint="Public https. Falls back to a product image.">
            <input value={eff.storefrontHeroImageUrl ?? ""}
              onChange={(e) => setText("storefrontHeroImageUrl", e.target.value)}
              onBlur={() => commit("storefrontHeroImageUrl")}
              placeholder="https://…" style={inputStyle} />
          </Field>
          <Field label="Layout">
            <Segmented size="sm"
              options={[{ id: "split", label: "Split" }, { id: "minimal", label: "Minimal" }]}
              value={(eff.storefrontHeroLayout as string) || "split"}
              onChange={(v) => setNow({ storefrontHeroLayout: v as "split" | "minimal" })} />
          </Field>
        </Group>

        {/* Brand color */}
        <Group label="Brand color">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_ACCENTS.map((c) => (
              <button key={c} onClick={() => setNow({ storefrontAccent: c })} title={c}
                className="w-6 h-6 rounded-md"
                style={{
                  background: c,
                  outline: (eff.storefrontAccent || "#4f6bed") === c ? "2px solid var(--text)" : "1px solid var(--border)",
                  outlineOffset: 1,
                }} />
            ))}
            <input type="color" value={config.accent} onChange={(e) => setNow({ storefrontAccent: e.target.value })}
              className="w-6 h-6 rounded-md cursor-pointer"
              style={{ border: "1px solid var(--border)", background: "transparent" }} />
          </div>
        </Group>

        {/* Buy button */}
        <Group label="Buy button">
          <Segmented size="sm"
            options={[{ id: "Buy", label: "Buy" }, { id: "Shop", label: "Shop" }, { id: "Order", label: "Order" }]}
            value={(eff.storefrontBuyLabel as string) || "Buy"}
            onChange={(v) => setNow({ storefrontBuyLabel: v as "Buy" | "Shop" | "Order" })} />
        </Group>

        {/* Sections */}
        <Group label="Sections">
          <Toggle label="Featured row" on={eff.storefrontShowFeatured !== false} onChange={(v) => setNow({ storefrontShowFeatured: v })} />
          <Toggle label="Discover gallery" on={eff.storefrontShowDiscover !== false} onChange={(v) => setNow({ storefrontShowDiscover: v })} />
          <Toggle label="About section" on={!!eff.storefrontShowAbout} onChange={(v) => setNow({ storefrontShowAbout: v })} />
          {eff.storefrontShowAbout && (
            <textarea value={eff.storefrontAbout ?? ""}
              onChange={(e) => setText("storefrontAbout", e.target.value)}
              onBlur={() => commit("storefrontAbout")}
              rows={3} placeholder="Tell your story…" style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} />
          )}
          {eff.storefrontShowAbout && (
            <Field label="Contact URL">
              <input value={eff.storefrontContactUrl ?? ""}
                onChange={(e) => setText("storefrontContactUrl", e.target.value)}
                onBlur={() => commit("storefrontContactUrl")}
                placeholder="https://…" style={inputStyle} />
            </Field>
          )}
        </Group>

        {/* Featured */}
        <Group label={`Featured (${featuredIds.length})`} hint="Star products in the Products tab to feature them.">
          <div className="flex flex-col gap-1">
            {featuredIds.map((id) => {
              const p = products.find((x) => x.id === id);
              if (!p) return null;
              return (
                <div key={id} className="flex items-center gap-2 text-[12px] px-2 py-1 rounded-md"
                  style={{ background: "var(--bg-inset)" }}>
                  <Star size={11} style={{ color: "#f5a623" }} fill="#f5a623" />
                  <span className="truncate flex-1">{p.title}</span>
                  <button onClick={() => setNow({ storefrontFeaturedIds: featuredIds.filter((x) => x !== id) })}
                    style={{ color: "var(--text-subtle)" }}>
                    <X size={12} />
                  </button>
                </div>
              );
            })}
            {featuredIds.length === 0 && (
              <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>None — showing first products.</span>
            )}
          </div>
        </Group>
      </div>

      {/* ── live preview ── */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ background: "var(--bg-inset)" }}>
        <div className="h-10 shrink-0 flex items-center justify-center gap-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <Segmented size="sm"
            options={[{ id: "phone", label: "Phone" }, { id: "desktop", label: "Desktop" }]}
            value={device} onChange={(d) => setDevice(d as "phone" | "desktop")} />
          <span className="text-[10.5px]" style={{ color: "var(--text-subtle)" }}>live preview</span>
        </div>
        <div className="flex-1 overflow-y-auto flex justify-center p-5">
          <div style={{
            width: device === "phone" ? 390 : "100%",
            maxWidth: device === "phone" ? 390 : 1000,
            border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden",
            background: "var(--bg)", alignSelf: "start", boxShadow: "var(--shadow-card)",
          }}>
            <Template.Listing config={config} products={sfProducts} slug={eff.storefrontSlug ?? ""} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── orders tab ────────────────────────────────────────────────────────────────
function OrdersTab() {
  const { data, isLoading, isError, refetch } = useOrders();
  const orders = data?.orders ?? [];
  const stats = data?.stats ?? { count: 0, revenueCents: 0, newCount: 0 };

  const fmtRupees = (minor: number) =>
    `₹${(minor / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });

  const statusStyle = (status: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      paid:    { background: "#d1fae5", color: "#065f46" },
      pending: { background: "#fef3c7", color: "#92400e" },
      failed:  { background: "#fee2e2", color: "#991b1b" },
    };
    return map[status] ?? { background: "var(--bg-inset)", color: "var(--text-muted)" };
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Stats row */}
      <div className="px-6 pt-1 pb-3 flex gap-3 shrink-0">
        {[
          { label: "New", value: stats.newCount },
          { label: "Orders", value: stats.count },
          { label: "Revenue", value: fmtRupees(stats.revenueCents) },
        ].map((st) => (
          <div key={st.label} className="flex-1 px-4 py-3 rounded-xl"
            style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] mb-0.5"
              style={{ color: "var(--text-subtle)" }}>{st.label}</div>
            <div className="text-[18px] font-semibold tabular-nums"
              style={{ color: "var(--text)", letterSpacing: "-0.03em" }}>{st.value}</div>
          </div>
        ))}
      </div>

      {isError && (
        <div className="px-6 py-8 text-[12px] flex items-center gap-2" style={{ color: "#ef4444" }}>
          <AlertTriangle size={15} /> Failed to load orders. <button className="underline" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading && orders.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl animate-pulse mb-3"
                style={{ background: "var(--bg-inset)", height: 72 }} />
            ))
          : orders.length === 0
          ? (
            <div className="py-16 text-center">
              <div className="text-[12.5px]" style={{ color: "var(--text-subtle)" }}>
                No orders yet. Share your store link to get started.
              </div>
            </div>
          )
          : orders.map((o: OrderApi) => (
            <div key={o.id} className="mb-2.5 px-4 py-3.5 rounded-xl"
              style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11.5px] font-mono tabular-nums" style={{ color: "var(--text-subtle)" }}>
                      #{o.id.slice(-6).toUpperCase()}
                    </span>
                    <span style={{
                      fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                      padding: "2px 7px", borderRadius: 999, ...statusStyle(o.status),
                    }}>
                      {o.status}
                    </span>
                  </div>
                  <div className="text-[11.5px] truncate" style={{ color: "var(--text-muted)" }}>
                    {o.email || o.customerName || "—"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[14px] font-semibold tabular-nums"
                    style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
                    {fmtRupees(o.amountTotal)}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--text-subtle)" }}>{fmtDate(o.createdAt)}</div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── shared helpers ────────────────────────────────────────────────────────────
function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--text-subtle)" }}>{label}</div>
      {children}
      {hint && <div className="text-[10px]" style={{ color: "var(--text-subtle)" }}>{hint}</div>}
    </div>
  );
}
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center justify-between text-[12.5px]"
      style={{ color: "var(--text)" }}>
      <span>{label}</span>
      <span style={{
        width: 34, height: 20, borderRadius: 999,
        background: on ? "var(--accent)" : "var(--bg-inset)",
        border: "1px solid var(--border)", position: "relative", transition: "background .15s",
      }}>
        <span style={{
          position: "absolute", top: 1.5, left: on ? 15 : 1.5, width: 16, height: 16,
          borderRadius: 999, background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }} />
      </span>
    </button>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: "var(--text-subtle)" }}>{label}</div>
      {children}
      {hint && <div className="text-[10px] mt-1" style={{ color: "var(--text-subtle)" }}>{hint}</div>}
    </div>
  );
}
const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg-elev)", color: "var(--text)",
  border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none",
};

// ── product editor ────────────────────────────────────────────────────────────
function ProductEditor({ draft, saving, error, onSave, onClose }: {
  draft: Draft; saving: boolean; error: string | null;
  onSave: (d: Draft) => void; onClose: () => void;
}) {
  const [d, setD] = useState<Draft>(draft);
  const set = (patch: Partial<Draft>) => setD((cur) => ({ ...cur, ...patch }));
  const canSave = !!(d.title ?? "").trim();
  const badImg = !!(d.imageUrl ?? "").trim() && !/^https:\/\//i.test((d.imageUrl ?? "").trim());

  return (
    <>
      <div className="px-5 h-12 flex items-center justify-between border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-subtle)" }}>
          {d.id ? "Edit product" : "New product"}
        </span>
        <span className="-mr-1"><IconButton onClick={onClose} title="Close"><X size={15} /></IconButton></span>
      </div>
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {error && (
          <div className="text-[11.5px] px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</div>
        )}
        <div className="flex gap-4">
          <div style={{ width: 96, height: 120, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--bg-inset)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {(d.imageUrl ?? "").trim() && !badImg
              ? <img src={(d.imageUrl ?? "").trim()} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <ShoppingBag size={20} style={{ color: "var(--text-subtle)" }} />}
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <Field label="Title">
              <input autoFocus value={d.title ?? ""} onChange={(e) => set({ title: e.target.value })}
                placeholder="Oversized Cotton Hoodie" style={inputStyle} />
            </Field>
            <Field label="Price (rupees)" hint="Sets checkout amount. Leave blank for link-out only.">
              <input type="number" min="0" step="1" value={d.priceRupees ?? ""}
                onChange={(e) => set({ priceRupees: e.target.value })}
                placeholder="1499" style={inputStyle} />
            </Field>
            <Field label="Price display text" hint="Optional override (e.g. 'Rs 1,499' or 'DM for price').">
              <input value={d.priceText ?? ""} onChange={(e) => set({ priceText: e.target.value })}
                placeholder="Rs 1,499 / DM for price" style={inputStyle} />
            </Field>
          </div>
        </div>
        <Field label="Subtitle">
          <input value={d.subtitle ?? ""} onChange={(e) => set({ subtitle: e.target.value })}
            placeholder="Black · Unisex" style={inputStyle} />
        </Field>
        <Field label="Image URL" hint={badImg ? "Must be an https URL." : "Public https link. Avoid Instagram URLs (they expire)."}>
          <input value={d.imageUrl ?? ""} onChange={(e) => set({ imageUrl: e.target.value })}
            placeholder="https://…/photo.jpg"
            style={{ ...inputStyle, borderColor: badImg ? "#ef4444" : "var(--border)" }} />
        </Field>
        <Field label="Buy / link-out URL" hint="Where Buy sends customers (your checkout, WhatsApp, site).">
          <input value={d.ctaUrl ?? ""} onChange={(e) => set({ ctaUrl: e.target.value })}
            placeholder="https://…" style={inputStyle} />
        </Field>
        <Field label="Aliases" hint="Comma-separated synonyms so Mira matches casual asks (hoodie, pullover).">
          <input value={d.aliasesText ?? ""} onChange={(e) => set({ aliasesText: e.target.value })}
            placeholder="hoodie, pullover" style={inputStyle} />
        </Field>
        <Field label="Description" hint="Long copy for the product page.">
          <textarea value={d.description ?? ""} onChange={(e) => set({ description: e.target.value })}
            rows={3} placeholder="Soft brushed cotton…" style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} />
        </Field>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={d.available ?? true} onChange={(e) => set({ available: e.target.checked })} />
          <span className="text-[12.5px]" style={{ color: "var(--text)" }}>Available (shown to customers)</span>
        </label>
      </div>
      <div className="px-5 h-14 flex items-center justify-end gap-2 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <button onClick={onClose} className="h-8 px-3 rounded-lg text-[12.5px] font-medium" style={{ color: "var(--text-muted)" }}>Cancel</button>
        <button onClick={() => canSave && onSave(d)} disabled={!canSave || saving}
          className="h-8 px-4 rounded-lg text-[12.5px] font-semibold transition-opacity"
          style={{ background: "var(--accent)", color: "var(--accent-fg)", opacity: canSave && !saving ? 1 : 0.5 }}>
          {saving ? "Saving…" : d.id ? "Save" : "Add product"}
        </button>
      </div>
    </>
  );
}
