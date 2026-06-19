"use client";
// Store — DM marketplace catalog management. CRUD over products; each links out
// via ctaUrl (showcase + link-out, no payment). Products feed the brain (truthful
// "do you have X?") and the DM card carousel — both wired in later phases.
import { useState } from "react";
import { Plus, ShoppingBag, Trash2, X, Pencil, ExternalLink, AlertTriangle } from "lucide-react";
import {
  useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, type Product,
} from "../../lib/api/hooks";
import { Modal, IconButton } from "../ui";

type Draft = Partial<Product> & { aliasesText?: string };

function toDraft(p?: Product): Draft {
  return p
    ? { ...p, aliasesText: (p.aliases ?? []).join(", ") }
    : { title: "", subtitle: "", description: "", priceText: "", imageUrl: "", ctaUrl: "", available: true, aliasesText: "" };
}

export function ProductsView() {
  const list = useProducts();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const del = useDeleteProduct();
  const [editing, setEditing] = useState<Draft | null>(null);

  const products = list.data?.products ?? [];

  return (
    <div className="flex-1 flex flex-col min-h-0 relative" style={{ background: "var(--bg-frame)" }}>
      {/* header */}
      <div className="px-6 pt-5 pb-3 flex items-center gap-2.5 shrink-0">
        <span className="text-[15px] font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>Store</span>
        <span className="text-[11px] ml-0.5 tabular-nums" style={{ color: "var(--text-subtle)" }}>{products.length} products</span>
        <button
          onClick={() => setEditing(toDraft())}
          className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-fg)", boxShadow: "var(--shadow-card)" }}
        >
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
          <div className="text-[11.5px] max-w-xs" style={{ color: "var(--text-subtle)" }}>Add what you sell. Mira answers "do you have X?" from this list and can send it as a card carousel in DMs.</div>
          <button onClick={() => setEditing(toDraft())} className="mt-2 flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
            <Plus size={15} strokeWidth={2.4} /> Add your first product
          </button>
        </div>
      )}

      {(products.length > 0 || list.isLoading) && (
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {list.isLoading && products.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl h-[148px] animate-pulse" style={{ background: "var(--bg-inset)" }} />
                ))
              : products.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    onEdit={() => setEditing(toDraft(p))}
                    onToggle={() => update.mutate({ id: p.id, available: !p.available })}
                    onDelete={() => { if (confirm(`Delete "${p.title}"?`)) del.mutate(p.id); }}
                  />
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
              const aliases = (d.aliasesText ?? "").split(",").map((s) => s.trim()).filter(Boolean);
              const body = {
                title: (d.title ?? "").trim(),
                subtitle: (d.subtitle ?? "").trim(),
                description: (d.description ?? "").trim(),
                priceText: (d.priceText ?? "").trim() || null,
                imageUrl: (d.imageUrl ?? "").trim() || null,
                ctaUrl: (d.ctaUrl ?? "").trim() || null,
                available: d.available ?? true,
                aliases,
              };
              try {
                if (d.id) await update.mutateAsync({ id: d.id, ...body });
                else await create.mutateAsync(body);
                setEditing(null);
              } catch { /* error surfaced in editor */ }
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function ProductCard({ p, onEdit, onToggle, onDelete }: { p: Product; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  return (
    <div
      className="group rounded-xl overflow-hidden flex flex-col transition-all duration-100"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", opacity: p.available ? 1 : 0.6 }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <div className="h-[96px] relative flex items-center justify-center" style={{ background: "var(--bg-inset)" }}>
        {p.imageUrl
          ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
          : <ShoppingBag size={20} style={{ color: "var(--text-subtle)" }} />}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span style={{ background: "var(--bg)" }} className="rounded-md"><IconButton size={24} title="Edit" onClick={onEdit}><Pencil size={12} /></IconButton></span>
          <span style={{ background: "var(--bg)" }} className="rounded-md"><IconButton size={24} title="Delete" onClick={onDelete}><Trash2 size={12} /></IconButton></span>
        </div>
        {!p.available && (
          <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Sold out</span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium truncate flex-1" style={{ color: "var(--text)" }}>{p.title}</span>
          {p.priceText && <span className="text-[11.5px] font-semibold tabular-nums shrink-0" style={{ color: "var(--text)" }}>{p.priceText}</span>}
        </div>
        {p.subtitle && <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{p.subtitle}</div>}
        <div className="flex items-center justify-between mt-1.5">
          <button onClick={onToggle} className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-md" style={p.available ? { background: "var(--accent-soft)", color: "var(--accent-deep)" } : { background: "var(--bg-inset)", color: "var(--text-subtle)" }}>
            {p.available ? "Available" : "Hidden"}
          </button>
          {p.ctaUrl && (
            <a href={p.ctaUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-[10.5px] flex items-center gap-0.5" style={{ color: "var(--text-subtle)" }}>
              link <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
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

function ProductEditor({ draft, saving, error, onSave, onClose }: { draft: Draft; saving: boolean; error: string | null; onSave: (d: Draft) => void; onClose: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const set = (patch: Partial<Draft>) => setD((cur) => ({ ...cur, ...patch }));
  const canSave = !!(d.title ?? "").trim();

  return (
    <>
      <div className="px-5 h-12 flex items-center justify-between border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-subtle)" }}>{d.id ? "Edit product" : "New product"}</span>
        <span className="-mr-1"><IconButton onClick={onClose} title="Close"><X size={15} /></IconButton></span>
      </div>
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {error && <div className="text-[11.5px] px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</div>}
        <Field label="Title">
          <input autoFocus value={d.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Oversized Cotton Hoodie" style={inputStyle} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price"><input value={d.priceText ?? ""} onChange={(e) => set({ priceText: e.target.value })} placeholder="Rs 1,499 / DM for price" style={inputStyle} /></Field>
          <Field label="Subtitle"><input value={d.subtitle ?? ""} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Black · Unisex" style={inputStyle} /></Field>
        </div>
        <Field label="Image URL" hint="Public https link. (Carousel uses this — avoid Instagram URLs, they expire.)">
          <input value={d.imageUrl ?? ""} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://…/photo.jpg" style={inputStyle} />
        </Field>
        <Field label="Buy / link-out URL" hint="Where the Buy button sends customers (your checkout, WhatsApp, site).">
          <input value={d.ctaUrl ?? ""} onChange={(e) => set({ ctaUrl: e.target.value })} placeholder="https://…" style={inputStyle} />
        </Field>
        <Field label="Aliases" hint="Comma-separated synonyms so Mira matches casual asks (hoodie, pullover, sweater).">
          <input value={d.aliasesText ?? ""} onChange={(e) => set({ aliasesText: e.target.value })} placeholder="hoodie, pullover" style={inputStyle} />
        </Field>
        <Field label="Description" hint="Long copy for the storefront page.">
          <textarea value={d.description ?? ""} onChange={(e) => set({ description: e.target.value })} rows={3} placeholder="Soft brushed cotton…" style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} />
        </Field>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={d.available ?? true} onChange={(e) => set({ available: e.target.checked })} />
          <span className="text-[12.5px]" style={{ color: "var(--text)" }}>Available (shown to customers)</span>
        </label>
      </div>
      <div className="px-5 h-14 flex items-center justify-end gap-2 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <button onClick={onClose} className="h-8 px-3 rounded-lg text-[12.5px] font-medium" style={{ color: "var(--text-muted)" }}>Cancel</button>
        <button
          onClick={() => canSave && onSave(d)}
          disabled={!canSave || saving}
          className="h-8 px-4 rounded-lg text-[12.5px] font-semibold transition-opacity"
          style={{ background: "var(--accent)", color: "var(--accent-fg)", opacity: canSave && !saving ? 1 : 0.5 }}
        >
          {saving ? "Saving…" : d.id ? "Save" : "Add product"}
        </button>
      </div>
    </>
  );
}
