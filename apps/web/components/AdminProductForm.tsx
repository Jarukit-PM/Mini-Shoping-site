"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { Placeholder } from "./Placeholder";
import { ConfirmModal } from "./ConfirmModal";
import { useToast } from "./Toast";
import { saveProduct, deleteProduct, type AdminProduct } from "@/lib/admin-products";
import { formatPriceUSD } from "@/lib/api";
import { productTone } from "@/lib/tone";

const CATEGORIES = ["Apparel", "Home", "Kitchen", "Paper", "Leather", "Pantry"];

interface FormState {
  name: string;
  sku: string;
  category: string;
  priceDollars: string;
  stock: string;
  imageUrl: string;
  description: string;
  tone: 1 | 2 | 3 | 4 | 5;
}

interface AdminProductFormProps {
  existing?: AdminProduct;
}

export function AdminProductForm({ existing }: AdminProductFormProps) {
  const router = useRouter();
  const { push } = useToast();
  const isNew = !existing;

  const [form, setForm] = useState<FormState>(
    existing
      ? {
          name: existing.name,
          sku: existing.sku,
          category: existing.category ?? "Apparel",
          priceDollars: (existing.priceCents / 100).toFixed(2),
          stock: existing.stock.toString(),
          imageUrl: existing.imageUrl ?? `https://images.meridian.shop/${existing.sku.toLowerCase()}.jpg`,
          description: existing.description ?? "",
          tone: existing.tone,
        }
      : {
          name: "",
          sku: "",
          category: "Apparel",
          priceDollars: "",
          stock: "0",
          imageUrl: "",
          description: "",
          tone: 1,
        }
  );

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  function set(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.sku.trim()) e.sku = "Required";
    const price = parseFloat(form.priceDollars);
    if (isNaN(price)) e.priceDollars = "Enter a price";
    else if (price <= 0) e.priceDollars = "ราคาสินค้าต้องมากกว่า 0 · Price must be greater than 0";
    const stock = parseInt(form.stock, 10);
    if (isNaN(stock) || stock < 0) e.stock = "Stock must be ≥ 0";
    if (!form.imageUrl.trim()) e.imageUrl = "Image URL is required";
    else if (!/^https?:\/\//i.test(form.imageUrl)) e.imageUrl = "Must start with http(s)://";
    if (!form.description.trim()) e.description = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    const id = existing ? existing.id : "";
    const sku = form.sku.trim().toUpperCase();
    const product: AdminProduct = {
      id,
      name: form.name.trim(),
      sku,
      category: form.category,
      priceCents: Math.round(parseFloat(form.priceDollars) * 100),
      currency: existing?.currency ?? "USD",
      stock: parseInt(form.stock, 10),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      tone: form.tone ?? productTone(sku),
    };
    const result = await saveProduct(product);
    if (!result.ok) {
      push(result.error ?? "Save failed", "bad");
      return;
    }
    push(`Saved · ${product.name} updated`, "ok");
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  async function handleDelete() {
    if (!existing) return;
    const ok = await deleteProduct(existing.id);
    if (!ok) {
      push("Could not delete product", "bad");
      return;
    }
    push(`Deleted · ${existing.name} removed from catalog`, "ok");
    router.push("/admin/products");
  }

  const previewStock = parseInt(form.stock, 10);
  const previewPrice = parseFloat(form.priceDollars);

  return (
    <div className="fade-in" style={{ maxWidth: 880 }}>
      <button className="btn link" onClick={() => router.push("/admin/products")}>
        <Icon name="arrowL" /> All products
      </button>

      <div className="admin-head" style={{ marginTop: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            {isNew ? "New product" : "Edit product"}
          </div>
          <h1 className="h-1" style={{ margin: 0 }}>
            {isNew ? "Add a new product" : form.name}
          </h1>
          {!isNew && (
            <div className="muted tiny mono" style={{ marginTop: 6 }}>
              {existing!.sku}
            </div>
          )}
        </div>
        {!isNew && (
          <button className="btn ghost" onClick={() => setConfirmDel(true)}>
            <Icon name="trash" /> Delete product
          </button>
        )}
      </div>

      {savedFlash && (
        <div className="banner ok" style={{ marginBottom: 20 }}>
          <Icon name="check" /> <div>Changes saved. The storefront updated immediately.</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 40, alignItems: "flex-start" }}>
        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r-2)", padding: 28 }}>
          <h2 className="h-3" style={{ margin: 0 }}>Details</h2>

          <div className="field">
            <label>Name</label>
            <input
              className={`input ${errors.name ? "error" : ""}`}
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Linen Field Shirt"
            />
            {errors.name && <span className="err"><Icon name="alert" /> {errors.name}</span>}
          </div>

          <div className="field-row cols-2">
            <div className="field">
              <label>SKU</label>
              <input
                className={`input mono ${errors.sku ? "error" : ""}`}
                value={form.sku}
                onChange={(e) => set({ sku: e.target.value.toUpperCase() })}
                placeholder="MER-13-XYZ"
              />
              {errors.sku && <span className="err"><Icon name="alert" /> {errors.sku}</span>}
            </div>
            <div className="field">
              <label>Category</label>
              <select
                className="select"
                value={form.category}
                onChange={(e) => set({ category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row cols-2">
            <div className="field">
              <label>Price (USD)</label>
              <input
                className={`input mono ${errors.priceDollars ? "error" : ""}`}
                value={form.priceDollars}
                onChange={(e) => set({ priceDollars: e.target.value.replace(/[^0-9.\-]/g, "") })}
                placeholder="49.00"
                inputMode="decimal"
              />
              {errors.priceDollars && <span className="err"><Icon name="alert" /> {errors.priceDollars}</span>}
            </div>
            <div className="field">
              <label>Stock units</label>
              <input
                className={`input mono ${errors.stock ? "error" : ""}`}
                value={form.stock}
                onChange={(e) => set({ stock: e.target.value.replace(/[^0-9\-]/g, "") })}
                inputMode="numeric"
              />
              {errors.stock && <span className="err"><Icon name="alert" /> {errors.stock}</span>}
            </div>
          </div>

          <div className="field">
            <label>Image URL</label>
            <input
              className={`input ${errors.imageUrl ? "error" : ""}`}
              value={form.imageUrl}
              onChange={(e) => set({ imageUrl: e.target.value })}
              placeholder="https://…"
            />
            {errors.imageUrl && <span className="err"><Icon name="alert" /> {errors.imageUrl}</span>}
            <span className="muted tiny">
              Paste a hosted image URL — the storefront pulls images directly from external hosts.
            </span>
          </div>

          <div className="field">
            <label>Description</label>
            <textarea
              className={`textarea ${errors.description ? "error" : ""}`}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={4}
              placeholder="Material, origin, what makes it special…"
            />
            {errors.description && <span className="err"><Icon name="alert" /> {errors.description}</span>}
          </div>

          <div className="field">
            <label>Placeholder tone (preview)</label>
            <div style={{ display: "flex", gap: 8 }}>
              {([1, 2, 3, 4, 5] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set({ tone: t })}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 4,
                    border: form.tone === t ? "2px solid var(--ink)" : "1px solid var(--line-2)",
                    padding: 0,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ height: "100%" }} className={`ph tone-${t}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live preview */}
        <aside style={{ position: "sticky", top: 32 }}>
          <div className="label" style={{ marginBottom: 12 }}>Storefront preview</div>
          <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r-2)", padding: 18 }}>
            <Placeholder
              label={(form.name || "PRODUCT NAME").toUpperCase()}
              tone={form.tone}
              sku={form.sku || "SKU-PENDING"}
              style={{ aspectRatio: "4/5" }}
            />
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="badge-row">
                {previewStock === 0 && <span className="badge bad dot">Sold out</span>}
                {previewStock > 0 && previewStock < 5 && (
                  <span className="badge warn dot">Low · {form.stock} left</span>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 17 }}>
                  {form.name || "Product name"}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {!isNaN(previewPrice) && previewPrice > 0
                    ? formatPriceUSD(Math.round(previewPrice * 100))
                    : "—"}
                </span>
              </div>
              <div className="muted tiny">{form.category}</div>
            </div>
          </div>
        </aside>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 32 }}>
        <button className="btn ghost" onClick={() => router.push("/admin/products")}>
          Cancel
        </button>
        <button className="btn accent" onClick={submit}>
          <Icon name="check" /> {isNew ? "Add product" : "Save changes"}
        </button>
      </div>

      <ConfirmModal
        open={confirmDel}
        title="Delete product?"
        body={
          <>
            Permanently remove <strong>{form.name}</strong>? Existing orders are unaffected.
          </>
        }
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDel(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
